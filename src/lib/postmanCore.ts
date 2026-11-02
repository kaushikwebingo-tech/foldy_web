
export interface PmField {
  key: string;
  value?: string;
  description?: string;
  type?: 'text' | 'file';
  disabled?: boolean;
}

export interface PmEndpoint {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Path without host; :parameters become Postman URL variables. */
  path: string;
  description?: string;
  body?: Record<string, unknown>;
  formdata?: PmField[];
  query?: PmField[];
  pathVars?: PmField[];
  headers?: PmField[];
  auth?: 'none' | 'app' | 'admin' | 'signup' | 'restore' | 'password-setup';
  /** Collection variable -> JSON response path, applied only after success. */
  capture?: Record<string, string>;
  statuses?: number[];
  followRedirects?: boolean;
  prerequest?: string[];
  tests?: string[];
}

export interface ApiSection {
  key: string;
  name: string;
  description?: string;
  endpoints: PmEndpoint[];
}

export function authFor(ep: PmEndpoint): NonNullable<PmEndpoint['auth']> {
  if (ep.auth) return ep.auth;
  const p = `/${ep.path.replace(/^\/+|\/+$/g, '')}`;
  if (/^\/api\/admin\/v1\//.test(p)) {
    return /\/auth\/(?:login|register|forgot-password|verify-email-otp|update-password)$/.test(p) ? 'none' : 'admin';
  }
  if (p === '/api/v1/auth/account/restore') return 'restore';
  if (p === '/api/v1/auth/password/first-set') return 'password-setup';
  if (p === '/' || p === '/health' || /^\/(?:webhook|preview|landing-page)(?:\/|$)/.test(p) ||
      /^\/api\/landing\/v1(?:\/|$)/.test(p) || /^\/api\/v1\/signup(?:\/|$)/.test(p) ||
      /^\/(?:callback|signup\/digilocker\/return)$/.test(p) ||
      /^\/api\/v1\/(?:features|bank-info|investment\/callback|digilocker\/callback|team\/contact-change\/stop)$/.test(p) ||
      /^\/api\/v1\/auth\/(?:login(?:\/device(?:\/resend)?)?|reverify\/(?:start|verify)|password\/reset\/(?:start|resend|verify|state|cancel|complete)|forgot-password|session\/logout)$/.test(p) ||
      /^\/(?:api\/v1\/(?:app-versioning\/)?)?(?:check-update(?:\/[^/]+)?|google-auth-url|google-callback|refresh-token|manual-update)$/.test(p)) return 'none';
  return 'app';
}

function auth(ep: PmEndpoint) {
  const scope = authFor(ep);
  if (scope === 'none' || scope === 'signup') return { type: 'noauth' };
  const variable = { app: 'token', admin: 'adminToken', restore: 'restoreToken', 'password-setup': 'setPasswordToken' }[scope];
  return { type: 'bearer', bearer: [{ key: 'token', value: `{{${variable}}}`, type: 'string' }] };
}

function encodeQuery(value: string) {
  return encodeURIComponent(value).replace(/%7B%7B([^%]*?)%7D%7D/g, '{{$1}}');
}

export function buildUrl(ep: PmEndpoint) {
  const segments = ep.path.split('/').filter(Boolean);
  const query = (ep.query ?? []).map(q => ({ key: q.key, value: q.value ?? '', description: q.description ?? '', ...(q.disabled ? { disabled: true } : {}) }));
  const queryStr = query.filter(q => !q.disabled).map(q => `${encodeQuery(q.key)}=${encodeQuery(q.value)}`).join('&');
  const params = [...new Set(segments.filter(s => s.startsWith(':')).map(s => s.slice(1)))];
  return {
    raw: `{{baseUrl}}/${segments.join('/')}${queryStr ? `?${queryStr}` : ''}`,
    host: ['{{baseUrl}}'], path: segments,
    ...(query.length ? { query } : {}),
    ...(params.length ? { variable: params.map(key => {
      const value = ep.pathVars?.find(v => v.key === key);
      return { key, value: value?.value || `{{${key}}}`, description: value?.description ?? '' };
    }) } : {}),
  };
}

export function buildRequest(ep: PmEndpoint) {
  const header = (ep.headers ?? []).map(h => ({ key: h.key, value: h.value ?? '', ...(h.description ? { description: h.description } : {}), ...(h.disabled ? { disabled: true } : {}) }));
  let body: Record<string, unknown> | undefined;
  if (ep.formdata?.length) {
    body = { mode: 'formdata', formdata: ep.formdata.map(f => ({
      key: f.key, type: f.type ?? 'text',
      ...(f.type === 'file' ? { src: [] } : { value: f.value ?? '' }),
      description: f.description ?? '', ...(f.disabled ? { disabled: true } : {}),
    })) };
  } else if (ep.body !== undefined) {
    if (!header.some(h => h.key.toLowerCase() === 'content-type')) header.push({ key: 'Content-Type', value: 'application/json' });
    body = { mode: 'raw', raw: JSON.stringify(ep.body, null, 2), options: { raw: { language: 'json' } } };
  }
  return { method: ep.method, auth: auth(ep), header, url: buildUrl(ep),
    ...(body ? { body } : {}), ...(ep.description ? { description: ep.description } : {}) };
}

export function buildItem(ep: PmEndpoint) {
  const testScript = [
    `pm.test('Expected HTTP status', function () { pm.expect(pm.response.code).to.be.oneOf(${JSON.stringify(ep.statuses ?? [200, 201, 202, 204])}); });`,
    ...(ep.capture ? [
      'if (pm.response.code >= 200 && pm.response.code < 300) {',
      '  let payload; try { payload = pm.response.json(); } catch (_) {}',
      `  const captures = ${JSON.stringify(ep.capture)};`,
      '  if (payload && payload.success !== false) Object.entries(captures).forEach(function ([key, path]) {',
      '    const value = path.split(".").reduce(function (node, part) { return node == null ? undefined : node[part]; }, payload);',
      '    if (value !== undefined && value !== null && typeof value !== "object") pm.collectionVariables.set(key, String(value));',
      '  });',
      '}',
    ] : []),
    ...(ep.tests ?? []),
  ];
  return {
    name: ep.name, request: buildRequest(ep),
    ...(ep.followRedirects === false ? { protocolProfileBehavior: { followRedirects: false } } : {}),
    event: [
      ...(ep.prerequest?.length ? [{ listen: 'prerequest', script: { type: 'text/javascript', exec: ep.prerequest } }] : []),
      { listen: 'test', script: { type: 'text/javascript', exec: testScript } },
    ],
  };
}

export function buildCollection(section: ApiSection, origin = 'http://localhost:5000') {
  return {
    info: { name: `Foldy — ${section.name}`, description: section.description ?? '', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}', type: 'string' }] },
    variable: [
      { key: 'baseUrl', value: origin, type: 'string' },
      ...['token', 'adminToken', 'restoreToken', 'setPasswordToken'].map(key => ({ key, value: '', type: 'string' })),
    ],
    item: section.endpoints.map(buildItem),
  };
}
