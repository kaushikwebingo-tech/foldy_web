import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { API_SECTIONS } from '../src/lib/apiCatalog';
import type { PmEndpoint } from '../src/lib/postman';

/*
 * Master Postman collection generator.
 * Reads the single source of truth (src/lib/apiCatalog.ts) and emits ONE
 * collection with every API section as a folder. Mirrors src/lib/postman.ts'
 * request/url shape, but with a fixed {{baseUrl}} (the server origin) instead of
 * the browser "API Host" setting.
 *
 * Run:  server/node_modules/.bin/tsx api-web/scripts/genMasterPostman.ts
 * Out:  server/collections/Foldy-Master.postman_collection.json
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:5000';

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
      : {}),
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
        description: f.description ?? '',
      })),
    };
  } else if (ep.body) {
    header.push({ key: 'Content-Type', value: 'application/json' });
    body = {
      mode: 'raw',
      raw: JSON.stringify(ep.body, null, 2),
      options: { raw: { language: 'json' } },
    };
  }

  return {
    method: ep.method,
    header,
    url: buildUrl(ep),
    ...(body ? { body } : {}),
    ...(ep.description ? { description: ep.description } : {}),
  };
}

const sections = Object.values(API_SECTIONS);

const collection = {
  info: {
    name: 'Foldy — Master (All APIs)',
    description:
      'Master collection of every Foldy API, generated from api-web/src/lib/apiCatalog.ts. ' +
      'Collection-level Bearer auth uses {{token}} (paste a JWT once). {{baseUrl}} defaults to ' +
      'the local server origin. Each folder is one API section. Admin endpoints use the ' +
      '/api/admin/v1 prefix and need an ADMIN JWT.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: {
    type: 'bearer',
    bearer: [{ key: 'token', value: '{{token}}', type: 'string' }],
  },
  variable: [
    { key: 'baseUrl', value: BASE_URL, type: 'string' },
    { key: 'token', value: '', type: 'string' },
  ],
  item: sections.map((section) => ({
    name: section.name,
    ...(section.description ? { description: section.description } : {}),
    item: section.endpoints.map((ep) => ({ name: ep.name, request: buildRequest(ep) })),
  })),
};

const out = resolve(__dirname, '../../server/collections/Foldy-Master.postman_collection.json');
writeFileSync(out, JSON.stringify(collection, null, 2) + '\n', 'utf8');

const total = sections.reduce((n, s) => n + s.endpoints.length, 0);
console.log(`Wrote ${out}`);
console.log(`Sections: ${sections.length}, Endpoints: ${total}`);
