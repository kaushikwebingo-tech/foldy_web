import { getApiOrigin } from './utils';

/*
 * Minimal Postman v2.1 collection generator (client-side).
 * Builds a downloadable .postman_collection.json per API section.
 * - Collection-level Bearer auth uses a {{token}} variable (paste your JWT once).
 * - {{baseUrl}} defaults to the current "API Host" setting (or localhost:5000).
 */

export interface PmField {
  key: string;
  value?: string;
  description?: string;
  type?: 'text' | 'file';
}

export interface PmEndpoint {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Path without host, no leading slash, e.g. 'api/v1/b2b/gst/otp'. May contain :vars. */
  path: string;
  description?: string;
  /** JSON request body (ignored when `formdata` is set). */
  body?: Record<string, unknown>;
  /** multipart/form-data fields (e.g. file uploads). */
  formdata?: PmField[];
  /** query string params. */
  query?: PmField[];
  /** values for :path variables. */
  pathVars?: PmField[];
}

export interface ApiSection {
  key: string;
  name: string;
  description?: string;
  endpoints: PmEndpoint[];
}

function buildUrl(ep: PmEndpoint) {
  const segments = ep.path.split('/').filter(Boolean);
  const queryStr = (ep.query ?? []).map((q) => `${q.key}=${q.value ?? ''}`).join('&');
  const raw = `{{baseUrl}}/${segments.join('/')}${queryStr ? `?${queryStr}` : ''}`;

  return {
    raw,
    host: ['{{baseUrl}}'],
    path: segments,
    ...(ep.query && ep.query.length
      ? { query: ep.query.map((q) => ({ key: q.key, value: q.value ?? '', description: q.description ?? '' })) }
      : {}),
    ...(ep.pathVars && ep.pathVars.length
      ? { variable: ep.pathVars.map((v) => ({ key: v.key, value: v.value ?? '', description: v.description ?? '' })) }
      : {})
  };
}

function buildRequest(ep: PmEndpoint) {
  const header: Array<{ key: string; value: string }> = [];
  let body: Record<string, unknown> | undefined;

  if (ep.formdata && ep.formdata.length) {
    body = {
      mode: 'formdata',
      formdata: ep.formdata.map((f) => ({
        key: f.key,
        type: f.type ?? 'text',
        ...(f.type === 'file' ? { src: [] } : { value: f.value ?? '' }),
        description: f.description ?? ''
      }))
    };
  } else if (ep.body) {
    header.push({ key: 'Content-Type', value: 'application/json' });
    body = {
      mode: 'raw',
      raw: JSON.stringify(ep.body, null, 2),
      options: { raw: { language: 'json' } }
    };
  }

  return {
    method: ep.method,
    header,
    url: buildUrl(ep),
    ...(body ? { body } : {}),
    ...(ep.description ? { description: ep.description } : {})
  };
}

export function buildCollection(section: ApiSection) {
  const origin = getApiOrigin() || 'http://localhost:5000';
  return {
    info: {
      name: `Foldy — ${section.name}`,
      description: section.description ?? '',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    auth: {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{token}}', type: 'string' }]
    },
    variable: [
      { key: 'baseUrl', value: origin, type: 'string' },
      { key: 'token', value: '', type: 'string' }
    ],
    item: section.endpoints.map((ep) => ({
      name: ep.name,
      request: buildRequest(ep)
    }))
  };
}

export function downloadSection(section: ApiSection): void {
  const json = JSON.stringify(buildCollection(section), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `foldy-${section.key}.postman_collection.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
