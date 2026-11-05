import { findDocumentMap } from './maps/index.js';
import { validateDocumentMap } from './validation.js';
import type { DocumentMap } from './types.js';

/** Resolves only draft metadata. It does not call the exporter or enable downloads. */
export const resolveDraftMap = (templateCode: string, templateVersion: number): DocumentMap => {
  const map = findDocumentMap(templateCode, templateVersion);
  if (!map) throw new Error('No existe un mapa documental para la plantilla y versión solicitadas.');
  const errors = validateDocumentMap(map);
  if (errors.length) throw new Error(`El mapa documental no es válido: ${errors.join(' ')}`);
  return map;
};
