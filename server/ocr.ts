/**
 * OCR Extraction Service using Tesseract.js
 * 
 * This service provides OCR capabilities for extracting text from uploaded documents.
 * It uses Tesseract.js for optical character recognition.
 */

import { createWorker } from "tesseract.js";

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
  try {
    console.log(`[OCR] Starting text extraction from: ${fileUrl}`);
    
    const worker = await createWorker("eng+deu");
    const { data: { text } } = await worker.recognize(fileUrl);
    await worker.terminate();
    
    console.log(`[OCR] Extracted raw text length: ${text.length} characters`);
    
    // Parse the extracted text to identify document fields
    const fields = parseDocumentText(text);
    
    return {
      ...fields,
      rawText: text,
    };
  } catch (error) {
    console.error("[OCR] Error extracting document fields:", error);
    return {
      rawText: error instanceof Error ? error.message : "OCR extraction failed",
    };
  }
}

/**
 * Parse extracted OCR text to identify document fields.
 * This uses pattern matching to find common document field patterns.
 */
function parseDocumentText(text: string): Omit<ExtractedDocumentFields, "rawText"> {
  const result: Omit<ExtractedDocumentFields, "rawText"> = {};
  
  // Normalize text for easier pattern matching
  const normalizedText = text.toUpperCase().replace(/\s+/g, " ");
  
  // Try to extract document number (various patterns)
  const docNumPatterns = [
    /(?:DOCUMENT|DOC|CARD|PERMIT)[\s#:]*([A-Z0-9]{6,})/i,
    /(?:NR|NO|NUMBER)[\s.:]*([A-Z0-9]{6,})/i,
    /\b([A-Z]{1,3}\d{6,})\b/,
  ];
  
  for (const pattern of docNumPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.documentNumber = match[1].trim();
      break;
    }
  }
  
  // Try to extract country
  const germanCountries = ["GERMANY", "DEUTSCHLAND", "FEDERAL REPUBLIC"];
  for (const country of germanCountries) {
    if (normalizedText.includes(country)) {
      result.countryOfIssue = "Germany";
      break;
    }
  }
  
  // Try to extract dates (DD.MM.YYYY or DD/MM/YYYY format)
  const datePattern = /(\d{2}[.\/]\d{2}[.\/]\d{4})/g;
  const dates = text.match(datePattern);
  
  if (dates && dates.length >= 2) {
    // First date is usually issue date, second is expiry
    result.dateOfIssue = convertToISODate(dates[0]);
    result.expiryDate = convertToISODate(dates[1]);
  }
  
  // Try to identify document type
  if (normalizedText.includes("BLUE CARD") || normalizedText.includes("BLAUE KARTE")) {
    result.documentType = "EU_BLUE_CARD";
  } else if (normalizedText.includes("AUFENTHALTSTITEL") || normalizedText.includes("RESIDENCE")) {
    result.documentType = "EAT";
  } else if (normalizedText.includes("FIKTIONSBESCHEINIGUNG") || normalizedText.includes("FICTION")) {
    result.documentType = "FIKTIONSBESCHEINIGUNG";
  }
  
  return result;
}

/**
 * Convert DD.MM.YYYY or DD/MM/YYYY to YYYY-MM-DD
 */
function convertToISODate(dateStr: string): string {
  const parts = dateStr.split(/[.\/]/);
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return dateStr;
}
