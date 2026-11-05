export type MapStatus = 'borrador' | 'validado' | 'habilitado';

export type CellValueType = 'texto' | 'numero' | 'fecha';

export type MergeRange = `${string}:${string}`;

export type CellTarget = {
  cell: string;
  type: CellValueType;
};

export type TableColumnMap = {
  cellTemplate: string;
  type: CellValueType;
};

export type TableRowMap = {
  sourceIndex: number;
  excelRow: number;
};

export type TableMap = {
  field: string;
  rows: TableRowMap[];
  columns: Record<string, TableColumnMap>;
};

export type SignatureMap = {
  field: string;
  startCell: string;
  endCell: string;
};

export type DocumentMap = {
  id: string;
  status: MapStatus;
  templateCode: string;
  templateVersion: number;
  sourceWorkbook: string;
  sourceSha256: string;
  sheetName: string;
  authorizedArea: MergeRange;
  print: {
    paperSize: 'A4';
    orientation: 'landscape' | 'portrait';
    scale: number;
    manualRowBreaks: number[];
  };
  cells: Record<string, CellTarget>;
  tables: TableMap[];
  signatures: SignatureMap[];
};

export type DestinationValidation =
  | { ok: true }
  | { ok: false; code: 'invalid_address' | 'outside_area' | 'unauthorized_destination' | 'merged_secondary_cell'; message: string };
