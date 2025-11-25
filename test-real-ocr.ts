import { extractFieldsFromDocument } from './lib/ocr';
import { readFileSync } from 'fs';

// Test with the Fiktionsbescheinigung image
const imagePath = './attached_assets/Screenshot 2025-10-01 at 6.48.16 AM_1764036992112.png';
const imageBuffer = readFileSync(imagePath);

console.log("🔍 Testing OCR extraction with Fiktionsbescheinigung document...\n");

async function test() {
  try {
    const result = await extractFieldsFromDocument(imageBuffer);
    
    console.log("✅ OCR Extraction Results:");
    console.log("─".repeat(60));
    console.log("Document Type:", result.documentTypeGuess || "NOT DETECTED");
    console.log("Document Number:", result.documentNumberGuess || "NOT DETECTED");
    console.log("Expiry Date:", result.expiryDateGuessIso || "NOT DETECTED");
    console.log("Employer Name:", result.employerNameGuess || "NOT DETECTED");
    console.log("Employment Permission:", result.employmentPermissionGuess || "NOT DETECTED");
    console.log("─".repeat(60));
    console.log("\nRaw extracted text (first 800 chars):");
    console.log(result.rawText.substring(0, 800));
    console.log("\n... (Total " + result.rawText.length + " characters)");
    
  } catch (error: any) {
    console.log("❌ OCR extraction failed:");
    console.log(`   ${error.message}`);
    process.exit(1);
  }
}

test();
