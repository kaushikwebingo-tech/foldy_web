#!/usr/bin/env node
/*
 * route-diff — does the API Console still describe the server that exists?
 *
 * WHY THIS IS A SCRIPT AND NOT A MEMO. Two things in this repo must track the
 * server and both drift silently: `src/api/*.ts` (the axios clients the console
 * drives) and `src/lib/apiCatalog.ts` (the declarative catalog that GENERATES THE
 * POSTMAN COLLECTION). Nothing enforces either. The server is being rebuilt right
 * now, so the answer changes daily and a hand-written list is stale on arrival.
 *
 * RUN IT, DO NOT ACT ON IT BLINDLY — the plan (§11.4) says the console diff runs
 * AFTER the server routes settle, and the server has not settled. While that is
 * true, bucket A is the only actionable one and even then a missing server route
 * may simply be a route that has not been rebuilt yet. NEVER delete a console
 * entry on the strength of a half-built server.
 *
 * Usage (no dependencies, Node 18+):
 *   node scripts/route-diff.mjs                    # buckets A and C (the actionable ones)
 *   node scripts/route-diff.mjs --all              # all four buckets
 *   node scripts/route-diff.mjs --json             # machine-readable
 *   node scripts/route-diff.mjs --server ../server --console .
 *
 * BUCKETS
 *   A  console → server   a console call whose route the server does not have  (BROKEN REF)
 *   B  server → console   a server route nothing in the console reaches        (coverage gap)
 *   C  client, no catalog a client method with no Postman entry                (doc gap)
 *   D  catalog, no client a Postman entry the UI never drives                  (usually fine:
 *                         webhooks and public callbacks live here on purpose)
 *
 * EXTRACTOR GOTCHAS — every one of these produced FALSE POSITIVES before it was
 * handled, and they are handled below:
 *   1. Chained routing: `router.get('/').delete('/:id')` (notificationRoutes.ts).
 *      Parse per `;`-statement and take the CHAIN HEAD's router, not each link's.
 *   2. Template sub-routers: moneyoneRoutes.ts registers one helper under four
 *      prefixes. Expand to all four and suppress the helper's un-prefixed phantoms.
 *   3. `req.get('X-Webhook-Signature')` reads as a route. `req`/`res`/`response`
 *      are never statement heads.
 *   4. Mounts outside /api: `/webhook`, `/devadmin`, `/landing-page`, `/preview`
 *      live in app.ts, so scanning only src/routes invents broken console refs.
 *   5. A file may export MORE THAN ONE router, and the importer may take the default,
 *      a named export, or both: `import identityAuthRoutes, { tenantRouter } from
 *      './identityAuthRoutes.js'`. An `import (\w+) from` regex sees neither form's
 *      named half, so `router.use('/tenant', tenantRouter)` resolved to nothing —
 *      the PAN route vanished from the tree and the file holding it was reported
 *      "written but not reached", which is the opposite of true. Each local name now
 *      records the specifier AND which export to follow.
 *   6. The catalog's entries must be read one object at a time. Two sliding
 *      `method…path` / `path…method` regexes over the whole file cross-match
 *      neighbours and invent two phantom endpoints per adjacent pair. See
 *      collectCatalog.
 *
 * DELIBERATE EXCLUSION: `/devadmin` — an unauthenticated, env-gated dev dashboard
 * with destructive triggers. It must never enter a shared Postman collection, so
 * bucket B ignores it. If a diff ever reports those routes as uncovered, this is
 * why; it is not drift.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const CONSOLE_DIR = resolve(opt('--console', join(HERE, '..')));
const SERVER_DIR = resolve(opt('--server', join(CONSOLE_DIR, '..', 'server')));
const SHOW_ALL = flag('--all');
const AS_JSON = flag('--json');

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
/* Bucket B ignores these prefixes on purpose (see the header). */
const B_IGNORED_PREFIXES = ['/devadmin', '/preview', '/landing-page'];

/* ───────────────────────────────── helpers ───────────────────────────────── */

const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mts|js|mjs)$/.test(entry) && !/\.d\.ts$/.test(entry)) out.push(full);
  }
  return out;
};

const read = (file) => readFileSync(file, 'utf8');

/** `//` and `/* *\/` comments carry example paths; strip them before matching. */
const stripComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const normalizePath = (value) => {
  const collapsed = `/${String(value).replace(/\\/g, '/')}`.replace(/\/{2,}/g, '/');
  const trimmed = collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed;
  return trimmed || '/';
};

/** `/users/:id/team` → `/users/*​/team`, so a console `${id}` matches a server `:id`. */
const toPattern = (path) =>
  normalizePath(path)
    .split('/')
    .map((segment) => (segment.startsWith(':') ? '*' : segment))
    .join('/');

/** A console path with a template hole is a wildcard segment too. */
const consolePattern = (path) =>
  normalizePath(path)
    .split('/')
    .map((segment) => (segment.includes('${') || segment.startsWith(':') ? '*' : segment))
    .join('/');

const segmentsMatch = (a, b) => {
  const left = a.split('/');
  const right = b.split('/');
  if (left.length !== right.length) return false;
  return left.every((segment, i) => segment === '*' || right[i] === '*' || segment === right[i]);
};

const key = (method, path) => `${method.toUpperCase()} ${path}`;

/* ─────────────────────────── the server's route tree ─────────────────────── */

/*
 * Statement-wise scan. A "statement" is everything up to the next `;` at depth 0,
 * which is what makes gotcha 1 (chained routing) and gotcha 3 (`req.get(...)`)
 * answerable: the router is the head of the chain, and `req` is never a router.
 */
const statementsOf = (source) => {
  const out = [];
  let depth = 0;
  let current = '';
  for (const char of source) {
    if (char === '(' || char === '[' || char === '{') depth += 1;
    if (char === ')' || char === ']' || char === '}') depth = Math.max(0, depth - 1);
    if (char === ';' && depth === 0) {
      out.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) out.push(current);
  return out;
};

const NON_ROUTER_HEADS = new Set(['req', 'request', 'res', 'response', 'next', 'console', 'process', 'JSON', 'Object', 'axios']);

const collectServer = () => {
  const routeFiles = [
    ...walk(join(SERVER_DIR, 'src', 'routes')),
    ...walk(join(SERVER_DIR, 'src', 'webhooks')),
  ];
  const appFile = join(SERVER_DIR, 'src', 'app.ts');

  /*
   * One entry per file. Routes are bucketed BY THE ROUTER VARIABLE they were
   * registered on (`heads`), which is what makes gotchas 1 and 2 answerable:
   *   - the head of a `.get().delete()` chain owns every link in it;
   *   - `subRouter.post('/consent')` inside a helper is NOT a route on the file's
   *     own router, and must not be emitted un-prefixed;
   *   - a locally built `const bankingRouter = Router()` is a head of its own, so
   *     `router.use('/banking', bankingRouter)` can be followed.
   */
  const files = new Map();

  const headOf = (entry, name) => {
    if (!entry.heads.has(name)) entry.heads.set(name, { routes: [], mounts: [] });
    return entry.heads.get(name);
  };

  const scan = (file) => {
    const source = stripComments(read(file));
    /*
     * Gotcha 5: a file may export MORE THAN ONE router, and the importer may take
     * the default, a named export, or both in one statement —
     * `import identityAuthRoutes, { tenantRouter } from './identityAuthRoutes.js'`
     * (routes/app/v1/index.ts). A `import (\w+) from` regex matches neither form's
     * named half, so `router.use('/tenant', tenantRouter)` resolved to nothing and
     * §3.1's PAN route vanished from the tree — and the file it lives in was then
     * reported as "written but not reached", which is the opposite of true.
     *
     * So each local name records BOTH the specifier and which export to follow:
     * `head: null` means the target's default export, a string means that named
     * export, which is also the router variable's name inside the target file.
     */
    const imports = new Map();
    for (const match of source.matchAll(
      /import\s+(?:type\s+)?([\w$]+)?\s*(?:,\s*)?(?:\{([^}]*)\})?\s*from\s*["']([^"']+)["']/g,
    )) {
      const [, defaultName, namedList, spec] = match;
      if (!defaultName && !namedList) continue;
      if (defaultName) imports.set(defaultName, { spec, head: null });
      for (const piece of (namedList ?? '').split(',')) {
        const parts = piece.trim().replace(/^type\s+/, '').split(/\s+as\s+/);
        const imported = parts[0]?.trim();
        const local = (parts[1] ?? parts[0])?.trim();
        if (imported && local) imports.set(local, { spec, head: imported });
      }
    }

    /* Gotcha 2, part 1: helpers that take a Router and register routes on it. */
    const helperParam = new Map();
    for (const match of source.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\(\s*(\w+)\s*:\s*\w*Router/g)) {
      helperParam.set(match[1], match[2]);
    }
    for (const match of source.matchAll(/function\s+(\w+)\s*\(\s*(\w+)\s*:\s*\w*Router/g)) {
      helperParam.set(match[1], match[2]);
    }
    /* Local routers, and which helper (if any) was applied to each. */
    const localRouters = new Set(
      [...source.matchAll(/(?:const|let)\s+(\w+)\s*[:=][^=\n]*=\s*Router\s*\(/g)].map((m) => m[1]),
    );
    for (const match of source.matchAll(/(?:const|let)\s+(\w+)\s*=\s*Router\s*\(/g)) {
      localRouters.add(match[1]);
    }
    const helperApplied = new Map();
    for (const [helper] of helperParam) {
      const applied = new RegExp(String.raw`\b${helper}\s*\(\s*(\w+)\s*[,)]`, 'g');
      for (const match of source.matchAll(applied)) {
        if (localRouters.has(match[1])) helperApplied.set(match[1], helper);
      }
    }
    const defaultExport = source.match(/export\s+default\s+(\w+)/)?.[1] ?? 'router';

    const entry = {
      heads: new Map(),
      imports,
      helperParam,
      helperApplied,
      localRouters,
      defaultExport,
    };
    files.set(file, entry);

    const mountsFrom = (bucket, prefix, tail) => {
      for (const ident of tail.matchAll(/([A-Za-z_$][\w$]*)/g)) {
        const name = ident[1];
        if (imports.has(name)) bucket.mounts.push({ prefix, kind: 'import', name });
        else if (localRouters.has(name)) bucket.mounts.push({ prefix, kind: 'local', name });
      }
    };

    for (const statement of statementsOf(source)) {
      const trimmed = statement.trim();
      const head = trimmed.match(/^(?:await\s+)?([A-Za-z_$][\w$]*)\s*\./);

      if (head && !NON_ROUTER_HEADS.has(head[1])) {
        /* Gotcha 1: every `.method("path"` in this statement belongs to the head
         * of the chain — `router.get('/').delete('/:id')` is two routes on
         * `router`, not one route on whatever the first call returned. */
        const bucket = headOf(entry, head[1]);
        for (const call of trimmed.matchAll(/\.(get|post|put|patch|delete|options|head)\s*\(\s*["'`]([^"'`]*)["'`]/g)) {
          if (!METHODS.includes(call[1])) continue;
          bucket.routes.push({ method: call[1], path: normalizePath(call[2]) });
        }
        for (const call of trimmed.matchAll(/\.use\s*\(\s*["'`]([^"'`]*)["'`]\s*,([\s\S]*)$/g)) {
          mountsFrom(bucket, normalizePath(call[1]), call[2]);
        }
        continue;
      }

      /*
       * A statement with no router head is a DECLARATION OR A BLOCK — and gotcha
       * 2's template helper is exactly that: `const registerTemplateRoutes =
       * (subRouter: Router) => { subRouter.post('/consent', …); … };` is one
       * statement, because the body's semicolons are not at depth 0. Attribute
       * each call to ITS OWN receiver, which files those routes under the
       * helper's parameter name — never under the file's own router, so they are
       * emitted once per prefix the helper is mounted at and never un-prefixed.
       */
      for (const call of trimmed.matchAll(
        /\b([A-Za-z_$][\w$]*)\.(get|post|put|patch|delete|options|head)\s*\(\s*["'`]([^"'`]*)["'`]/g,
      )) {
        const [, receiver, method, path] = call;
        if (NON_ROUTER_HEADS.has(receiver) || !METHODS.includes(method)) continue;
        headOf(entry, receiver).routes.push({ method, path: normalizePath(path) });
      }
      for (const call of trimmed.matchAll(
        /\b([A-Za-z_$][\w$]*)\.use\s*\(\s*["'`]([^"'`]*)["'`]\s*,([^;]*)/g,
      )) {
        const [, receiver, prefix, tail] = call;
        if (NON_ROUTER_HEADS.has(receiver)) continue;
        mountsFrom(headOf(entry, receiver), normalizePath(prefix), tail);
      }
    }
  };

  for (const file of [...routeFiles, ...(existsSync(appFile) ? [appFile] : [])]) scan(file);

  /* Resolve an import specifier to a scanned file (the server emits ESM `.js`). */
  const resolveTarget = (file, ident) => {
    const spec = files.get(file)?.imports.get(ident)?.spec;
    if (!spec || !spec.startsWith('.')) return null;
    const base = resolve(dirname(file), spec).replace(/\.js$/, '');
    for (const candidate of [`${base}.ts`, join(base, 'index.ts'), `${base}.mts`, `${base}.js`]) {
      if (files.has(candidate) || existsSync(candidate)) return candidate;
    }
    return null;
  };

  const routes = new Set();
  const visited = new Set();

  const expand = (file, headName, prefix) => {
    const guard = `${file}::${headName}::${prefix}`;
    if (visited.has(guard)) return;
    visited.add(guard);
    const entry = files.get(file);
    if (!entry) return;
    const head = entry.heads.get(headName);
    if (!head) return;

    for (const route of head.routes) {
      routes.add(key(route.method, normalizePath(`${prefix}${route.path}`)));
    }
    for (const mount of head.mounts) {
      const nextPrefix = normalizePath(`${prefix}${mount.prefix}`);
      if (mount.kind === 'import') {
        const target = resolveTarget(file, mount.name);
        if (!target) continue;
        /* Gotcha 5: follow the export that was actually imported. A named import
         * is its own router variable in the target file; only a default import
         * falls back to that file's default export. */
        const imported = entry.imports.get(mount.name)?.head;
        expand(target, imported ?? files.get(target)?.defaultExport ?? 'router', nextPrefix);
        continue;
      }
      /* A local sub-router: its own routes, plus — gotcha 2 — the routes the
       * template helper registered on it, which live under the helper's PARAMETER
       * name and are deliberately never emitted un-prefixed. */
      expand(file, mount.name, nextPrefix);
      const helper = entry.helperApplied.get(mount.name);
      const param = helper ? entry.helperParam.get(helper) : null;
      if (param) expand(file, param, nextPrefix);
    }
  };

  if (existsSync(appFile)) expand(appFile, files.get(appFile)?.defaultExport ?? 'app', '');
  /* app.ts exports the app, not a router, so its mounts hang off `app`. */
  if (existsSync(appFile)) expand(appFile, 'app', '');

  /* A route file written but never reached is reported rather than left silent. */
  const unmounted = [];
  for (const [file, entry] of files) {
    if (file === appFile) continue;
    const reached = [...visited].some((seenKey) => seenKey.startsWith(`${file}::`));
    const hasRoutes = [...entry.heads.values()].some((head) => head.routes.length);
    if (!reached && hasRoutes) unmounted.push(basename(file));
  }

  return { routes: [...routes].sort(), unmounted: [...new Set(unmounted)].sort() };
};

/* ─────────────────────── the console's clients and catalog ───────────────── */

/*
 * Base URLs are declared once in src/api/client.ts (`client` → /api/v1,
 * `adminClient` → /api/admin/v1) and a feature may define its own instance
 * (landingApi.ts's `landingClient` → /api/landing/v1) — which a
 * `client|adminClient` regex cannot see, so the bases are discovered, not assumed.
 */
const collectConsoleClients = () => {
  const dir = join(CONSOLE_DIR, 'src', 'api');
  const bases = new Map();
  const calls = [];

  const files = walk(dir);
  for (const file of files) {
    const source = stripComments(read(file));
    for (const match of source.matchAll(/(?:const|let)\s+(\w+)\s*=\s*axios\.create\s*\(\s*\{[^}]*baseURL\s*:\s*['"`]([^'"`]+)['"`]/g)) {
      bases.set(match[1], normalizePath(match[2]));
    }
    for (const match of source.matchAll(/baseURL\s*=\s*[`'"]\$\{[^}]*\}([^`'"]+)[`'"]/g)) {
      /* `config.baseURL = `${origin}/api/v1`` — the suffix is the base. */
      const suffix = normalizePath(match[1]);
      for (const name of bases.keys()) if (!bases.get(name)) bases.set(name, suffix);
      if (!bases.size) bases.set('client', suffix);
    }
  }

  for (const file of files) {
    const source = stripComments(read(file));
    for (const match of source.matchAll(
      /\b([A-Za-z_$][\w$]*)\.(get|post|put|patch|delete|options|head)\s*(?:<[^>]*>)?\s*\(\s*([`'"])((?:\\.|[^\\])*?)\3/g,
    )) {
      const [, instance, method, , path] = match;
      if (NON_ROUTER_HEADS.has(instance)) continue;
      const base = bases.get(instance);
      if (base === undefined) continue;
      calls.push({
        method: method.toUpperCase(),
        path: normalizePath(`${base}/${path}`),
        file: basename(file),
      });
    }
  }
  return { calls, bases: Object.fromEntries(bases) };
};

const collectCatalog = () => {
  const file = join(CONSOLE_DIR, 'src', 'lib', 'apiCatalog.ts');
  if (!existsSync(file)) return [];
  const source = stripComments(read(file));
  const out = [];

  /*
   * GOTCHA 6, and it made bucket D almost worthless. An entry is an object literal
   * `{ name, method: 'GET', path: 'api/v1/…', description, body }`, and the previous
   * pass ran two sliding regexes over the WHOLE FILE — `method…path` within 400
   * characters, then `path…method` within 400 — so a short entry's `method` matched
   * the NEXT entry's `path` and vice versa. Every adjacent pair of entries invented
   * two endpoints that are in no catalog and on no server: adding
   * `POST /signup/resume` and `GET /signup/stop` immediately produced a phantom
   * `GET /signup/resume` and a phantom `POST /signup/stop` in bucket D.
   *
   * So walk the object literals and read each entry's OWN `method` and `path`. Brace
   * matching is enough here because an endpoint's values are strings, numbers and
   * nested literals — never a function body — and comments are already stripped, so
   * no brace inside a `//` line can unbalance the scan.
   */
  /*
   * EVERY object literal at EVERY depth, by a brace stack: when a `}` closes, the
   * position it matched is the start of one literal. An endpoint's own `{ … }` and the
   * `body: { … }` inside it are both collected, and the own-level filter below is what
   * separates them. Iterating only the outermost literals would find exactly one — the
   * whole `API_SECTIONS` object — which is the trap this comment exists to name.
   */
  const stack = [];
  const blocks = [];
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === '{') stack.push(i);
    else if (source[i] === '}' && stack.length) blocks.push([stack.pop(), i]);
  }

  for (const [open, close] of blocks) {
    const block = source.slice(open, close + 1);
    /*
     * Blank out every NESTED literal, so only this object's own properties can match:
     * a `body: { path: '…' }` must not supply a path, and a section's `{ key, name,
     * endpoints: [ … ] }` must not borrow its first endpoint's method.
     */
    const own = block.slice(1, -1).replace(/\{[^{}]*\}/g, ' ');
    const nested = /\{|\}/.test(own) ? own.replace(/\{[\s\S]*\}/g, ' ') : own;
    const method = nested.match(/(?:^|[,{\s])method\s*:\s*['"]([A-Za-z]+)['"]/);
    const path = nested.match(/(?:^|[,{\s])path\s*:\s*['"`]([^'"`]+)['"`]/);
    if (method && path && METHODS.includes(method[1].toLowerCase())) {
      out.push({ method: method[1].toUpperCase(), path: normalizePath(path[1]) });
    }
  }

  const seen = new Set();
  return out.filter((entry) => {
    const id = key(entry.method, entry.path);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

/* ───────────────────────────────── the diff ──────────────────────────────── */

const main = () => {
  const server = collectServer();
  const { calls, bases } = collectConsoleClients();
  const catalog = collectCatalog();

  const serverIndex = server.routes.map((route) => {
    const [method, path] = route.split(' ');
    return { method, path, pattern: toPattern(path) };
  });

  const matchesServer = ({ method, path }) =>
    serverIndex.some(
      (route) => route.method === method && segmentsMatch(route.pattern, consolePattern(path)),
    );

  const reachedByConsole = (route) =>
    calls.some(
      (call) => call.method === route.method && segmentsMatch(route.pattern, consolePattern(call.path)),
    ) ||
    catalog.some(
      (entry) =>
        entry.method === route.method && segmentsMatch(route.pattern, consolePattern(entry.path)),
    );

  const dedupe = (rows) => {
    const seen = new Set();
    return rows.filter((row) => {
      const id = key(row.method, row.path);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };

  const bucketA = dedupe(calls.filter((call) => !matchesServer(call)));
  const bucketB = serverIndex.filter(
    (route) =>
      !B_IGNORED_PREFIXES.some((prefix) => route.path.startsWith(prefix)) && !reachedByConsole(route),
  );
  const bucketC = dedupe(
    calls.filter(
      (call) =>
        !catalog.some(
          (entry) =>
            entry.method === call.method &&
            segmentsMatch(consolePattern(entry.path), consolePattern(call.path)),
        ),
    ),
  );
  const bucketD = catalog.filter(
    (entry) =>
      !calls.some(
        (call) =>
          call.method === entry.method &&
          segmentsMatch(consolePattern(call.path), consolePattern(entry.path)),
      ),
  );

  const report = {
    serverRoutes: server.routes.length,
    /* The whole extracted tree, so another repo (admin/, app/) can diff its own
     * calls against it without re-implementing the extractor and its gotchas. */
    serverRouteList: server.routes,
    consoleCalls: calls.length,
    catalogEntries: catalog.length,
    clientBases: bases,
    unmountedRouteFiles: server.unmounted,
    A_consoleToServerBroken: bucketA.map((r) => `${key(r.method, r.path)}  (${r.file})`),
    B_serverNotInConsole: bucketB.map((r) => key(r.method, r.path)),
    C_clientWithoutCatalogEntry: bucketC.map((r) => `${key(r.method, r.path)}  (${r.file})`),
    D_catalogWithoutClient: bucketD.map((r) => key(r.method, r.path)),
  };

  if (AS_JSON) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  const section = (title, rows, note) => {
    process.stdout.write(`\n${title}  — ${rows.length}\n`);
    if (note) process.stdout.write(`  ${note}\n`);
    for (const row of rows) process.stdout.write(`  ${row}\n`);
  };

  process.stdout.write(
    `server routes: ${report.serverRoutes}   console calls: ${report.consoleCalls}   catalog entries: ${report.catalogEntries}\n` +
      `client bases: ${JSON.stringify(report.clientBases)}\n`,
  );
  if (server.unmounted.length) {
    process.stdout.write(
      `route files written but not reached from app.ts: ${server.unmounted.join(', ')}\n`,
    );
  }
  section('A  console → server (BROKEN REFERENCE)', report.A_consoleToServerBroken,
    'While the server is mid-rebuild, a miss here may be a route not yet rebuilt. Do not delete on this alone.');
  section('C  client method with no Postman entry', report.C_clientWithoutCatalogEntry);
  if (SHOW_ALL) {
    section('B  server route the console never reaches', report.B_serverNotInConsole,
      '/devadmin, /preview and /landing-page are excluded on purpose.');
    section('D  Postman entry no client drives', report.D_catalogWithoutClient,
      'Webhooks and public callbacks belong here.');
  } else {
    process.stdout.write(
      `\nB (server → console) ${report.B_serverNotInConsole.length}, D (catalog → client) ${report.D_catalogWithoutClient.length} — run with --all to list.\n`,
    );
  }
};

main();
