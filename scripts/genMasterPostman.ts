import { readFileSync, writeFileSync } from 'node:fs';
import { collectServer } from './route-diff.mjs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { API_SECTIONS } from '../src/lib/apiCatalog';
import { APP_API_SUPPLEMENT } from '../src/lib/appApiSupplement';
import { buildItem, type PmEndpoint } from '../src/lib/postmanCore';
import { CORE_ENDPOINTS, workflowSections } from './postmanScenarios';

const here = dirname(fileURLToPath(import.meta.url));
export const outputPath = resolve(here, '../../server/collections/Foldy-Master.postman_collection.json');
const reportPath = resolve(here, '../../server/collections/Foldy-Master.coverage.json');
const environmentPath = resolve(here, '../../server/collections/Foldy-Test.postman_environment.json');
const pattern = (path: string) => '/' + path.replace(/^\/+|\/+$/g, '').split('/').map(p => p.startsWith(':') ? '*' : p).join('/');
const key = (ep: Pick<PmEndpoint, 'method' | 'path'>) => `${ep.method} ${pattern(ep.path)}`;
export const excludedRoute = (route: string) => /^\w+ \/(?:devadmin|preview)(?:\/|$)/.test(route);
export function serverRoutes(): string[] {
  const inventory = collectServer();
  const result = { unmountedRouteFiles: inventory.unmounted, serverRouteList: inventory.routes };
  if (result.unmountedRouteFiles.length) throw new Error(`Unmounted route files require review: ${result.unmountedRouteFiles.join(', ')}`);
  return result.serverRouteList;
}

const defaults: Record<string, string> = {
  baseUrl: 'http://localhost:5000', token: '', adminToken: '', signupToken: '', restoreToken: '', setPasswordToken: '',
  loginId: '', password: '', adminEmail: '', adminPassword: '', mobile: '', email: '', newEmail: '', newMobile: '',
  otp: '123456', providerOtp: '', stepUpAction: 'auth.email.change', deviceTrust: '', loginNext: '',
  deviceId: 'foldy-postman-test-device', deviceName: 'Postman API testing', devicePlatform: 'android', appVersion: '1.0.0',
  featureId: '1', page: '1', limit: '20', financialYear: '2025-26', assessmentYear: '2026-27', fy: '2025-26',
  currentVersion: '1.0.0', uploadPeriod: '04-2026', month: '04', year: '2026', calendarDate: '2026-11-02', calendarMonth: '2026-11',
  categoryKey: 'professional-tax', mode: 'monthly', format: 'json', current_version: '1.0.0',
  tdsForm: 'FORM16', itType: 'itr', gstin: '', pan: '', companyPan: '', cin: '', llpin: '',
  downloadUrl: '', activityExportUrl: '', creditConfirm: '',
};
function variableName(field: string, path: string) {
  if (field === 'token' && path.includes('/signup/')) return 'signupToken';
  if (field === 'token' && path.startsWith('api/admin/')) return 'adminToken';
  if (field === 'otp' || field === 'code') return /\/b2b\/gst\//.test(path) ? 'providerOtp' : 'otp';
  return field.replace(/[^a-zA-Z0-9_]/g, '') || 'value';
}
function normalizeValue(value: unknown, field: string, path: string): any {
  if (typeof value === 'string' && /^<[^>]+>$/.test(value.trim())) {
    const hint = value.trim().slice(1, -1);
    const name = /^[A-Za-z]\w*(?:Id|Key|Ref)$/.test(hint) ? hint : variableName(field, path);
    return `{{${name}}}`;
  }
  if (Array.isArray(value)) return value.map(item => normalizeValue(item, field, path));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalizeValue(v, k, path)]));
  return value;
}
function prepare(ep: PmEndpoint): PmEndpoint {
  const next = structuredClone(ep);
  if (next.body) next.body = normalizeValue(next.body, '', next.path);
  for (const fields of [next.pathVars, next.query, next.formdata, next.headers]) {
    for (const f of fields ?? []) {
      if (f.value) f.value = normalizeValue(f.value, f.key, next.path);
      if (fields === next.query && !f.value) f.disabled = true;
    }
  }
  if (next.path === 'api/v1/auth/login') next.prerequest = [
    'pm.collectionVariables.unset("token");',
    'pm.collectionVariables.unset("loginNext");',
    'pm.collectionVariables.unset("challengeToken");', ...(next.prerequest ?? []),
  ];
  if (next.path === 'api/admin/v1/auth/login') next.prerequest = ['pm.collectionVariables.unset("adminToken");', ...(next.prerequest ?? [])];
  // Device context is needed for device trust, challenge binding and rate limits.
  if (next.path.startsWith('api/v1/')) next.headers = [
    ...['Device-Id', 'Device-Name', 'Device-Platform', 'App-Version'].map((name, index) => ({ key: `X-${name}`, value: `{{${['deviceId', 'deviceName', 'devicePlatform', 'appVersion'][index]}}}` })),
    ...(next.headers ?? []),
  ];
  if (next.path.includes('/contact/request') || next.path.includes('/signup/mobile') || next.path.includes('/auth/step-up/start')) {
    next.description = `${next.description ?? ''}\nOTP requests are rate limited. Respect retryAfterSeconds / Retry-After; repeated blocked attempts can use the daily allowance.`.trim();
  }
  if (next.path.includes('/callback') || next.path.endsWith('/digilocker/return') || next.path === 'callback' || next.path.endsWith('/consent/return')) {
    next.followRedirects = false;
    next.statuses ??= [200, 302, 303, 307];
  }
  if (['api/v1/user/profile/contact/request-otp', 'api/v1/user/profile/contact/verify'].includes(next.path)) {
    next.statuses = [409]; next.description = 'Retired contact-change endpoint: expected 409. Use /auth/contact/request, /verify and /commit instead.';
  }
  return next;
}
function aliasOf(path: string) {
  if (path.startsWith('landing-page')) return path.replace(/^landing-page/, 'api/landing/v1');
  if (/^(?:api\/v1\/)?(?:check-update|google-auth-url|google-callback|refresh-token|manual-update)(?:\/|$)/.test(path)) return path.replace(/^(?:api\/v1\/)?/, 'api/v1/app-versioning/');
  if (path === 'callback' || path === 'signup/digilocker/return') return 'api/v1/signup/digilocker/return';
  return path;
}

export function createMasterCollection(routes = serverRoutes()) {
  const sections = [...Object.values(API_SECTIONS), ...APP_API_SUPPLEMENT];
  const definitions = new Map<string, { ep: PmEndpoint; section: string }>();
  for (const section of sections) for (const ep of section.endpoints) definitions.set(key(ep), { ep, section: section.name });
  for (const ep of CORE_ENDPOINTS) definitions.set(key(ep), { ep, section: 'Identity — Signup, Sign-in and Security' });
  const groups = new Map<string, PmEndpoint[]>();
  const missing: string[] = [];
  const included = routes.filter(route => !excludedRoute(route));
  for (const route of included) {
    const [method, routePath] = route.split(' ') as [PmEndpoint['method'], string];
    const path = routePath.replace(/^\//, '');
    const candidate = definitions.get(key({ method, path })) ?? definitions.get(key({ method, path: aliasOf(path) }));
    if (!candidate) { missing.push(route); continue; }
    const actualParams = [...path.matchAll(/:([\w]+)/g)].map(m => m[1]!);
    const originalParams = [...candidate.ep.path.matchAll(/:([\w]+)/g)].map(m => m[1]!);
    const next = prepare({ ...candidate.ep, method, path, pathVars: actualParams.map((name, i) => {
      const previous = candidate.ep.pathVars?.find(v => v.key === originalParams[i]);
      return { ...previous, key: name, value: previous?.value || `{{${name}}}` };
    }) });
    const section = path.startsWith('landing-page') ? 'Public landing page — legacy aliases' : candidate.section;
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section)!.push(next);
  }
  if (missing.length) throw new Error(`Missing request examples for ${missing.length} mounted routes:\n${missing.join('\n')}`);
  const workflow = workflowSections();
  const allEndpoints = [...[...groups.values()].flat(), ...workflow.flatMap(section => section.endpoints)];
  const variableKeys = new Set(Object.keys(defaults));
  const collectVariables = (value: unknown) => {
    if (typeof value === 'string') for (const match of value.matchAll(/\{\{([\w]+)\}\}/g)) variableKeys.add(match[1]!);
    if (Array.isArray(value)) value.forEach(collectVariables);
    else if (value && typeof value === 'object') Object.values(value).forEach(collectVariables);
  };
  for (const endpoint of allEndpoints) {
    Object.keys(endpoint.capture ?? {}).forEach(key => variableKeys.add(key));
    collectVariables(endpoint); collectVariables(buildItem(endpoint));
  }
  const reference = [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([name, eps]) => ({ name, item: eps.map(buildItem) }));
  const collection = {
    info: {
      _postman_id: '1a82dcc1-7536-4aaa-989c-468062902547',
      name: 'Foldy — Master (All APIs)',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      description: '# Foldy API testing\n\nSet baseUrl to the SERVER ORIGIN (no /api suffix). Set loginId/password for an app account and adminEmail/adminPassword for admin. Run a workflow folder one request at a time; do not run the whole reference as one scenario.\n\nApp/admin/signup/restore/password-setup credentials are separate. Successful responses capture session tokens, proof IDs and selected resource IDs. Other IDs come from create/list responses; personId, tenantId, membershipId and admin customer userId are different.\n\nOTP defaults to 123456 for the current Foldy generator workaround. Provider-issued GST codes use providerOtp. Use the actually delivered code when real random OTPs are enabled. Respect resend/daily limits. DigiLocker, GST and AA approval steps require the provider/browser.\n\nReference requests include mutations, purchases, refunds, deletion, broadcasts, provider calls and administrative maintenance. Run those deliberately on test accounts. File requests need a selected local file. Webhooks require real test-provider signatures/secrets; they do not use bearer JWTs. No credentials or provider secrets are shipped in this file.\n\nSuccessful empty data is valid. HTML, redirects, PDF/CSV and signed-download URL responses are intentionally not forced through a JSON parser. Activity export server output is JSON; the app formats its own PDF.\n\nGenerated from mounted server routes and curated request examples. /devadmin and /preview are excluded because they are development-only tools/templates. See Foldy-Master.coverage.json and collections/README.md for coverage and regeneration.',
    },
    auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}', type: 'string' }] },
    variable: [...variableKeys].sort().map(key => ({ key, value: defaults[key] ?? '', type: 'string' })),
    event: [{ listen: 'test', script: { type: 'text/javascript', exec: [
      'const contentType = pm.response.headers.get("Content-Type") || "";',
      'if (/application\\/(?:[\\w.-]+\\+)?json/i.test(contentType) && pm.response.text()) {',
      '  pm.test("JSON response is parseable", function () { JSON.parse(pm.response.text()); });',
      '}',
    ] } }],
    item: [
      { name: '01 — Guided test workflows', item: workflow.map(section => ({ name: section.name, description: section.description, item: section.endpoints.map(ep => buildItem(prepare(ep))) })) },
      { name: '02 — Complete API reference', item: reference },
    ],
  };
  return { collection, coverage: { mountedRoutes: routes.length, includedRoutes: included.length, excluded: routes.filter(excludedRoute), missing: [], routes: included } };
}

export function main() {
  const { collection, coverage } = createMasterCollection();
  const json = JSON.stringify(collection, null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (readFileSync(outputPath, 'utf8') !== json) throw new Error('Master collection is stale. Run npm run postman:generate.');
    console.log(`Master is current: ${coverage.includedRoutes}/${coverage.mountedRoutes} routes; ${coverage.excluded.length} documented development exclusions.`);
    return;
  }
  writeFileSync(outputPath, json);
  writeFileSync(reportPath, JSON.stringify(coverage, null, 2) + '\n');
  writeFileSync(environmentPath, JSON.stringify({
    id: '4b3dba44-4bc2-4ebe-bbec-ebc5f9ba7748', name: 'Foldy Test — choose server',
    values: [{ key: 'baseUrl', value: 'https://apitest.foldy.co.in', type: 'default', enabled: true }],
    _postman_variable_scope: 'environment',
  }, null, 2) + '\n');
  console.log(`Updated ${outputPath}\n${coverage.includedRoutes} mounted API routes plus guided workflows; ${coverage.excluded.length} development exclusions.`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
