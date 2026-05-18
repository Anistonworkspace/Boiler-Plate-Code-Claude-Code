import PDFDocument from 'pdfkit';
import type { Writable } from 'node:stream';

export interface PdfMeta {
  title: string;
  author?: string;
  subject?: string;
}

export function createPdf(stream: Writable, meta: PdfMeta): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: meta });
  doc.pipe(stream);
  doc.fontSize(20).text(meta.title, { align: 'center' });
  doc.moveDown();
  return doc;
}
