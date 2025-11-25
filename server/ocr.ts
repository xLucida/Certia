import { promises as fs } from "fs";
import type { OcrExtractionResult } from "../lib/ocr";
import { extractFieldsFromDocument as runOcrExtraction } from "../lib/ocr";

export type ExtractedDocumentFields = OcrExtractionResult;

/**
 * Thin wrapper around the real OCR implementation so any legacy imports use
 * the configured Google Vision client instead of the old stub.
 */
export async function extractFieldsFromDocument(
  file: string | Buffer
): Promise<ExtractedDocumentFields> {
  const buffer = Buffer.isBuffer(file) ? file : await fs.readFile(file);
  return runOcrExtraction(buffer);
}
