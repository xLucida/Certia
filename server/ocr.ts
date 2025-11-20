/**
 * OCR Extraction Service - STUB
 * 
 * TODO: Implement document field extraction using a client-side OCR solution
 * or hosted OCR service to avoid server-side performance and security issues.
 * 
 * Options to consider:
 * - Client-side Tesseract.js (runs in browser, no server impact)
 * - Google Cloud Vision API (hosted OCR service)
 * - AWS Textract (hosted OCR service)
 * - Azure Computer Vision (hosted OCR service)
 */

export interface ExtractedDocumentFields {
  documentType?: string;
  documentNumber?: string;
  countryOfIssue?: string;
  dateOfIssue?: string;
  expiryDate?: string;
  rawText?: string;
}

/**
 * Extract fields from an uploaded document using OCR.
 * 
 * @param fileUrl - The URL or file path of the uploaded document
 * @returns Extracted document fields
 */
export async function extractFieldsFromDocument(
  fileUrl: string
): Promise<ExtractedDocumentFields> {
  // TODO: Implement actual OCR extraction
  console.log(`[OCR STUB] Would extract fields from: ${fileUrl}`);
  
  return {
    rawText: "OCR extraction not yet implemented. Please enter document details manually.",
  };
}
