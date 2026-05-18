import ExcelJS from 'exceljs';
import type { Writable } from 'node:stream';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export async function exportExcel<T extends Record<string, unknown>>(
  stream: Writable,
  sheetName: string,
  columns: ExcelColumn[],
  rows: T[],
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.columns = columns;
  ws.getRow(1).font = { bold: true };
  ws.addRows(rows);
  await wb.xlsx.write(stream);
}
