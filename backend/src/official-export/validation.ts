import type { DestinationValidation, DocumentMap, MergeRange } from './types.js';

const addressPattern = /^[A-Z]+[1-9][0-9]*$/;

type Coordinate = { column: number; row: number };

const coordinate = (address: string): Coordinate | null => {
  const match = /^([A-Z]+)([1-9][0-9]*)$/.exec(address);
  if (!match) return null;
  let column = 0;
  for (const letter of match[1]) column = column * 26 + letter.charCodeAt(0) - 64;
  return { column, row: Number(match[2]) };
};

const rangeCoordinates = (range: string): { start: Coordinate; end: Coordinate } | null => {
  const [startAddress, endAddress] = range.split(':');
  const start = coordinate(startAddress ?? '');
  const end = coordinate(endAddress ?? '');
  if (!start || !end || start.column > end.column || start.row > end.row) return null;
  return { start, end };
};

const inRange = (address: string, range: string): boolean => {
  const point = coordinate(address);
  const bounds = rangeCoordinates(range);
  return Boolean(point && bounds && point.column >= bounds.start.column && point.column <= bounds.end.column && point.row >= bounds.start.row && point.row <= bounds.end.row);
};

const tableDestinations = (map: DocumentMap): Set<string> => {
  const destinations = new Set(Object.values(map.cells).map((target) => target.cell));
  for (const table of map.tables) for (const row of table.rows) for (const column of Object.values(table.columns)) {
    destinations.add(column.cellTemplate.replace('{row}', String(row.excelRow)));
  }
  return destinations;
};

export const validateDocumentMap = (map: DocumentMap): string[] => {
  const errors: string[] = [];
  if (!map.id || !map.templateCode || !map.sheetName) errors.push('El mapa debe identificar plantilla, versión y hoja.');
  if (!Number.isSafeInteger(map.templateVersion) || map.templateVersion < 1) errors.push('La versión de plantilla no es válida.');
  if (!/^[a-f0-9]{64}$/i.test(map.sourceSha256)) errors.push('El SHA-256 del archivo fuente no es válido.');
  if (!rangeCoordinates(map.authorizedArea)) errors.push('El área autorizada no es válida.');
  if (map.status !== 'borrador' && map.status !== 'validado' && map.status !== 'habilitado') errors.push('El estado del mapa no es válido.');
  for (const target of Object.values(map.cells)) if (!addressPattern.test(target.cell)) errors.push(`Destino de celda no válido: ${target.cell}`);
  for (const table of map.tables) {
    if (!table.field || table.rows.length === 0 || Object.keys(table.columns).length === 0) errors.push(`La tabla ${table.field || '(sin campo)'} está incompleta.`);
    for (const row of table.rows) if (!Number.isSafeInteger(row.sourceIndex) || !Number.isSafeInteger(row.excelRow) || row.sourceIndex < 0 || row.excelRow < 1) errors.push(`Fila no válida en ${table.field}.`);
    for (const column of Object.values(table.columns)) if (!addressPattern.test(column.cellTemplate.replace('{row}', '1'))) errors.push(`Columna no válida en ${table.field}.`);
  }
  for (const destination of tableDestinations(map)) if (!inRange(destination, map.authorizedArea)) errors.push(`El destino ${destination} está fuera del área autorizada.`);
  return errors;
};

export const validateDestination = (map: DocumentMap, address: string, mergedRanges: readonly MergeRange[] = []): DestinationValidation => {
  if (!addressPattern.test(address)) return { ok: false, code: 'invalid_address', message: 'La celda solicitada no tiene formato A1 válido.' };
  if (!inRange(address, map.authorizedArea)) return { ok: false, code: 'outside_area', message: 'La celda está fuera del área autorizada del documento.' };
  for (const range of mergedRanges) {
    const bounds = rangeCoordinates(range);
    if (!bounds || !inRange(address, range)) continue;
    const anchor = range.split(':')[0];
    if (address !== anchor) return { ok: false, code: 'merged_secondary_cell', message: 'Solo se puede escribir en el ancla superior izquierda de una celda combinada.' };
  }
  if (!tableDestinations(map).has(address)) return { ok: false, code: 'unauthorized_destination', message: 'La celda no está declarada en el mapa documental.' };
  return { ok: true };
};

export const authorizedDestinations = (map: DocumentMap): readonly string[] => [...tableDestinations(map)].sort();
