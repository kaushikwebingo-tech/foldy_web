import { getApiOrigin } from './utils';
import { buildCollection as buildCoreCollection, type ApiSection } from './postmanCore';
export * from './postmanCore';

export function buildCollection(section: ApiSection) {
  return buildCoreCollection(section, getApiOrigin() || 'http://localhost:5000');
}

export function downloadSection(section: ApiSection): void {
  const blob = new Blob([JSON.stringify(buildCollection(section), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `foldy-${section.key}.postman_collection.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
