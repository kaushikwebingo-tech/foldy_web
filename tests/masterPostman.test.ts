import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import vm from 'node:vm';
import { createMasterCollection, serverRoutes, excludedRoute, outputPath } from '../scripts/genMasterPostman.ts';
import { collectServer } from '../scripts/route-diff.mjs';
import { SESSION_CAPTURE } from '../scripts/postmanScenarios.ts';

const flatten = (items: any[]): any[] => items.flatMap(item => item.request ? [item] : flatten(item.item ?? []));
const { collection, coverage } = createMasterCollection();
const requests = flatten(collection.item);
const reference = flatten(collection.item[1]!.item);
const key = (item: any) => `${item.request.method} /${item.request.url.path.join('/')}`;

test('reference covers every mounted nondevelopment API exactly once with no obsolete routes', () => {
  const expected = serverRoutes().filter(route => !excludedRoute(route));
  assert.ok(expected.length > 500);
  assert.deepEqual(reference.map(key).sort(), expected.sort());
  assert.equal(new Set(reference.map(key)).size, reference.length);
  assert.equal(coverage.missing.length, 0);
  assert.ok(!reference.some(item => /\/(?:onboarding|devadmin|preview)\//.test(item.request.url.raw)));
});

test('new undocumented server routes fail generation instead of silently leaving a gap', () => {
  assert.throws(() => createMasterCollection(['GET /api/v1/new-undocumented']), /Missing request examples/);
  assert.equal(excludedRoute('GET /devadmin'), true);
  assert.equal(excludedRoute('GET /preview/example'), true);
  assert.equal(excludedRoute('GET /devadministrator'), false);
});

test('all referenced variables and capture destinations are declared and no old angle placeholders remain', () => {
  const declared = new Set(collection.variable.map(variable => variable.key));
  const scan = (value: any) => {
    if (typeof value === 'string') {
      for (const match of value.matchAll(/\{\{([\w]+)\}\}/g)) assert.ok(declared.has(match[1]!), `Undeclared ${match[1]}`);
    } else if (Array.isArray(value)) value.forEach(scan);
    else if (value && typeof value === 'object') Object.values(value).forEach(scan);
  };
  scan(collection);
  for (const item of requests) {
    assert.doesNotMatch(JSON.stringify(item.request.body ?? {}), /<[^>]+>/);
    const params = item.request.url.path.filter((part: string) => part.startsWith(':'));
    assert.equal(item.request.url.variable?.length ?? 0, params.length);
    for (const param of item.request.url.variable ?? []) assert.notEqual(param.value, '');
    if (item.request.body?.mode === 'raw') JSON.parse(item.request.body.raw);
    if (item.request.body?.mode === 'formdata') assert.ok(!item.request.header.some((h: any) => h.key.toLowerCase() === 'content-type' && h.value.includes('json')));
  }
  for (const name of ['token', 'adminToken', 'signupToken', 'restoreToken', 'setPasswordToken']) {
    assert.equal(collection.variable.find(variable => variable.key === name)!.value, '');
  }
});

test('every generated Postman script compiles and callbacks do not blindly follow app redirects', () => {
  const visit = (items: any[]) => { for (const item of items) {
    for (const event of item.event ?? []) new vm.Script(event.script.exec.join('\n'));
    if (item.item) visit(item.item);
  } };
  visit(collection.item);
  for (const event of collection.event) new vm.Script(event.script.exec.join('\n'));
  const callback = reference.find(item => key(item) === 'GET /api/v1/signup/digilocker/return');
  assert.equal(callback.protocolProfileBehavior.followRedirects, false);
});

test('restricted sign-in results never replace the full session token or the admin token', () => {
  const values: Record<string, string> = { token: 'old-session', adminToken: 'admin-secret' };
  const run = (data: any, code = 200) => vm.runInNewContext(SESSION_CAPTURE.join('\n'), { pm: {
    response: { code, json: () => ({ data }) },
    collectionVariables: { set: (key: string, value: string) => { values[key] = value; }, unset: (key: string) => { delete values[key]; } },
  } });
  run({ next: 'restore_account', token: 'restore-only' });
  assert.equal(values.restoreToken, 'restore-only'); assert.equal(values.token, undefined);
  run({ next: 'set_password', token: 'setup-only' });
  assert.equal(values.setPasswordToken, 'setup-only'); assert.equal(values.token, undefined);
  run({ next: 'session', token: 'full-session', activeWorkspaceId: 'workspace', person: { id: 'person' } });
  assert.equal(values.token, 'full-session'); assert.equal(values.adminToken, 'admin-secret');
  run({ next: 'session', token: 'failed-token' }, 401);
  assert.equal(values.token, 'full-session');
  run({ next: 'device_code', challengeToken: 'device-challenge' });
  assert.equal(values.token, undefined); assert.equal(values.challengeToken, 'device-challenge');
});

/*
 * Structural conformance to Postman collection format v2.1.
 *
 * Hand-rolled on purpose: the project ships no JSON-schema validator and
 * fetching Postman's schema at test time would make the suite need a network.
 * This asserts the parts of the format Postman actually refuses to import or
 * silently drops — a body with a mode but no matching field, an event with no
 * script, a url with neither raw nor host, an auth block whose credential list
 * does not match its type.
 */
test('the master conforms to the v2.1 collection format it declares', () => {
  assert.equal(collection.info.schema, 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json');
  assert.ok(collection.info.name && collection.info._postman_id);
  assert.ok(Array.isArray(collection.item) && collection.item.length);
  for (const variable of collection.variable) {
    assert.equal(typeof variable.key, 'string');
    assert.ok(variable.key.length, 'a collection variable needs a key');
    assert.equal(typeof variable.value, 'string');
  }

  const bodyField: Record<string, string> = {
    raw: 'raw', formdata: 'formdata', urlencoded: 'urlencoded', file: 'file', graphql: 'graphql',
  };
  const checkAuth = (auth: any) => {
    assert.ok(typeof auth?.type === 'string', 'auth needs a type');
    if (auth.type === 'noauth') return;
    assert.ok(Array.isArray(auth[auth.type]), `auth ${auth.type} needs its credential list`);
    for (const entry of auth[auth.type]) assert.equal(typeof entry.key, 'string');
  };
  const checkEvents = (events: any[] = []) => {
    for (const event of events) {
      assert.ok(['prerequest', 'test'].includes(event.listen), `bad event listen ${event.listen}`);
      assert.equal(event.script?.type, 'text/javascript');
      assert.ok(Array.isArray(event.script.exec) && event.script.exec.length);
      for (const line of event.script.exec) assert.equal(typeof line, 'string');
    }
  };

  checkAuth(collection.auth);
  checkEvents(collection.event);

  let folders = 0;
  let leaves = 0;
  const visit = (items: any[], trail: string) => {
    for (const item of items) {
      assert.ok(typeof item.name === 'string' && item.name.length, `unnamed item under ${trail}`);
      const here = `${trail}/${item.name}`;
      checkEvents(item.event);
      if (item.item) {
        folders += 1;
        assert.ok(Array.isArray(item.item), `${here} is a folder with no item array`);
        assert.equal(item.request, undefined, `${here} is both a folder and a request`);
        visit(item.item, here);
        continue;
      }
      leaves += 1;
      const request = item.request;
      assert.ok(request, `${here} is neither a folder nor a request`);
      assert.ok(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method), `${here} method`);
      checkAuth(request.auth);

      const url = request.url;
      assert.ok(typeof url.raw === 'string' && url.raw.length, `${here} url.raw`);
      assert.ok(Array.isArray(url.host) && Array.isArray(url.path), `${here} url host/path`);
      for (const segment of url.path) assert.equal(typeof segment, 'string');
      for (const param of url.query ?? []) assert.equal(typeof param.key, 'string');
      for (const bound of url.variable ?? []) assert.ok(bound.key && bound.value, `${here} path variable`);

      for (const header of request.header ?? []) {
        assert.equal(typeof header.key, 'string');
        assert.equal(typeof header.value, 'string');
      }
      if (request.body) {
        const field = bodyField[request.body.mode];
        assert.ok(field, `${here} unknown body mode ${request.body.mode}`);
        assert.notEqual(request.body[field], undefined, `${here} body mode ${request.body.mode} has no ${field}`);
      }
    }
  };
  visit(collection.item, '');
  assert.ok(folders > 10 && leaves > 500, `expected a populated tree, got ${folders} folders / ${leaves} requests`);
});

test('checked-in master stays reproducible from routes and examples', () => {
  assert.equal(readFileSync(outputPath, 'utf8'), JSON.stringify(collection, null, 2) + '\n');
});

test('route extraction handles named routers, chained methods, shared helpers and all mounts', () => {
  const root = mkdtempSync(join(tmpdir(), 'foldy-postman-routes-'));
  try {
    mkdirSync(join(root, 'src/routes'), { recursive: true });
    mkdirSync(join(root, 'src/webhooks'), { recursive: true });
    writeFileSync(join(root, 'src/app.ts'), `import identity, { tenantRouter } from './routes/identity.js';\nconst app = express();\napp.use('/api/auth', identity);\napp.use('/api/tenant', tenantRouter);\nexport default app;`);
    writeFileSync(join(root, 'src/routes/identity.ts'), `const router = secured(Router(), 'identity');\nexport const tenantRouter = Router();\ntenantRouter.post('/pan', controller.pan);\nrouter.get('/sessions', controller.list).delete('/sessions/:id', controller.remove);\nconst attach = (sub: Router) => { sub.post('/consent', controller.create); };\nconst one = Router();\nattach(one);\nrouter.use('/first', one);\nrouter.use('/second', one);\nexport default router;`);
    assert.deepEqual(collectServer(root).routes.sort(), ['DELETE /api/auth/sessions/:id', 'GET /api/auth/sessions', 'POST /api/auth/first/consent', 'POST /api/auth/second/consent', 'POST /api/tenant/pan'].sort());
  } finally { rmSync(root, { recursive: true, force: true }); }
});
