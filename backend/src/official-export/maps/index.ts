import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { DocumentMap } from '../types.js';

const controlApriete01Path = path.resolve(process.cwd(), 'src/official-export/maps/control-apriete-01-v1.json');
const controlApriete01 = JSON.parse(readFileSync(controlApriete01Path, 'utf8')) as DocumentMap;

export const documentMaps: readonly DocumentMap[] = [controlApriete01];

export const findDocumentMap = (templateCode: string, templateVersion: number): DocumentMap | undefined =>
  documentMaps.find((map) => map.templateCode === templateCode && map.templateVersion === templateVersion);
