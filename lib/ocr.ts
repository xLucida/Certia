import FormData from 'form-data';

export interface OcrExtractionResult {
  rawText: string;
  documentTypeGuess?: 'EU_BLUE_CARD' | 'EAT' | 'FIKTIONSBESCHEINIGUNG' | 'OTHER';
  documentNumberGuess?: string;
  expiryDateGuessIso?: string;
}

export async function extractFieldsFromDocument(fileBuffer: Buffer): Promise<OcrExtractionResult> {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  
  if (!apiKey) {
    throw new Error('OCR_SPACE_API_KEY environment variable is not set. Please configure it in Replit Secrets.');
  }

  try {
    const formData = new FormData();
    formData.append('file', fileBuffer, { filename: 'document.pdf' });
    formData.append('apikey', apiKey);
    formData.append('language', 'ger');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData as any,
      headers: formData.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`OCR.space API returned status ${response.status}`);
    }

    const result = await response.json();

    if (result.IsErroredOnProcessing) {
      throw new Error(result.ErrorMessage?.[0] || 'OCR processing failed');
    }

    const rawText = result.ParsedResults?.[0]?.ParsedText || '';

    return {
      rawText,
      documentTypeGuess: guessDocumentType(rawText),
      documentNumberGuess: guessDocumentNumber(rawText),
      expiryDateGuessIso: guessExpiryDate(rawText),
    };
  } catch (error) {
    console.error('OCR extraction failed:', error);
    return {
      rawText: '',
      documentTypeGuess: undefined,
      documentNumberGuess: undefined,
      expiryDateGuessIso: undefined,
    };
  }
}

function guessDocumentType(text: string): OcrExtractionResult['documentTypeGuess'] {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('blaue karte') || lowerText.includes('blue card')) {
    return 'EU_BLUE_CARD';
  }

  if (
    lowerText.includes('elektronischer aufenthaltstitel') ||
    lowerText.includes('eat') ||
    lowerText.includes('aufenthaltstitel')
  ) {
    return 'EAT';
  }

  if (lowerText.includes('fiktionsbescheinigung')) {
    return 'FIKTIONSBESCHEINIGUNG';
  }

  return 'OTHER';
}

function guessDocumentNumber(text: string): string | undefined {
  const keywords = [
    'dokumentennummer',
    'ausweis-nr',
    'card no',
    'nummer',
    'number',
    'nr.',
  ];

  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();

    for (const keyword of keywords) {
      if (line.includes(keyword)) {
        const nextLine = lines[i + 1];
        if (nextLine) {
          const match = nextLine.match(/[A-Z0-9]{6,15}/);
          if (match) {
            return match[0];
          }
        }

        const sameLine = lines[i].match(/[A-Z0-9]{6,15}/);
        if (sameLine) {
          return sameLine[0];
        }
      }
    }
  }

  const generalMatch = text.match(/[A-Z0-9]{8,12}/);
  if (generalMatch) {
    return generalMatch[0];
  }

  return undefined;
}

function guessExpiryDate(text: string): string | undefined {
  const datePatterns = [
    /(\d{2})\.(\d{2})\.(\d{4})/g,
    /(\d{2})\.(\d{2})\.(\d{2})/g,
    /(\d{2})\/(\d{2})\/(\d{4})/g,
  ];

  const keywords = ['gültig bis', 'valid until', 'expiry', 'expires', 'ablauf'];
  const today = new Date();
  const candidateDates: Date[] = [];

  for (const pattern of datePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      let year = parseInt(match[3], 10);

      if (match[3].length === 2) {
        year += year < 50 ? 2000 : 1900;
      }

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const date = new Date(year, month - 1, day);
        if (date > today) {
          candidateDates.push(date);
        }
      }
    }
  }

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    for (const keyword of keywords) {
      if (line.includes(keyword)) {
        const nextLine = lines[i + 1];
        if (nextLine) {
          for (const pattern of datePatterns) {
            const match = pattern.exec(nextLine);
            if (match) {
              const day = parseInt(match[1], 10);
              const month = parseInt(match[2], 10);
              let year = parseInt(match[3], 10);

              if (match[3].length === 2) {
                year += year < 50 ? 2000 : 1900;
              }

              if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                const date = new Date(year, month - 1, day);
                if (date > today) {
                  return formatDateToIso(date);
                }
              }
            }
          }
        }
      }
    }
  }

  if (candidateDates.length > 0) {
    candidateDates.sort((a, b) => a.getTime() - b.getTime());
    return formatDateToIso(candidateDates[0]);
  }

  return undefined;
}

function formatDateToIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
