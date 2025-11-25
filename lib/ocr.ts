import vision from '@google-cloud/vision';

export interface OcrExtractionResult {
  rawText: string;
  documentTypeGuess?: 'EU_BLUE_CARD' | 'EAT' | 'FIKTIONSBESCHEINIGUNG' | 'OTHER';
  documentNumberGuess?: string;
  expiryDateGuessIso?: string;
  employerNameGuess?: string;
  employmentPermissionGuess?: 'ANY_EMPLOYMENT_ALLOWED' | 'RESTRICTED' | 'UNKNOWN';
}

export async function extractFieldsFromDocument(fileBuffer: Buffer): Promise<OcrExtractionResult> {
  const credentialsJson = process.env.GOOGLE_CLOUD_VISION_CREDENTIALS;
  
  if (!credentialsJson) {
    throw new Error('GOOGLE_CLOUD_VISION_CREDENTIALS environment variable is not set. Please configure it in Replit Secrets as a JSON string.');
  }

  let credentials;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch (error) {
    throw new Error('GOOGLE_CLOUD_VISION_CREDENTIALS must be a valid JSON string. Please check your Replit Secrets configuration.');
  }

  const client = new vision.ImageAnnotatorClient({
    credentials,
  });

  try {
    const [result] = await client.textDetection({
      image: { content: fileBuffer },
    });

    const detections = result.textAnnotations;
    const rawText = detections && detections.length > 0 ? detections[0].description || '' : '';

    if (!rawText) {
      throw new Error('No text could be extracted from the document. The image may be too low quality or not contain readable text.');
    }

    return {
      rawText,
      documentTypeGuess: guessDocumentType(rawText),
      documentNumberGuess: guessDocumentNumber(rawText),
      expiryDateGuessIso: guessExpiryDate(rawText),
      employerNameGuess: guessEmployerName(rawText),
      employmentPermissionGuess: guessEmploymentPermission(rawText),
    };
  } catch (error: any) {
    if (error.code === 7) {
      throw new Error('Invalid Google Cloud Vision credentials. Please verify your service account JSON in Replit Secrets.');
    }
    throw new Error(`Google Cloud Vision API error: ${error.message || 'Unknown error occurred during text extraction.'}`);
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

function guessEmployerName(text: string): string | undefined {
  const lines = text.split('\n');
  const keywords = ['arbeitgeber', 'employer', 'firma', 'company'];

  for (let i = 0; i < lines.length; i++) {
    const lineLower = lines[i].toLowerCase();
    
    for (const keyword of keywords) {
      if (lineLower.includes(keyword)) {
        const nextLine = lines[i + 1];
        if (nextLine && nextLine.trim().length > 3) {
          return nextLine.trim();
        }
        
        const afterKeyword = lines[i].substring(lineLower.indexOf(keyword) + keyword.length).trim();
        if (afterKeyword.length > 3) {
          return afterKeyword;
        }
      }
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === trimmed.toUpperCase() && 
        trimmed.length > 5 &&
        (trimmed.endsWith('GMBH') || trimmed.endsWith('AG') || trimmed.endsWith('UG'))) {
      return trimmed;
    }
  }

  return undefined;
}

function guessEmploymentPermission(text: string): OcrExtractionResult['employmentPermissionGuess'] {
  const lower = text.toLowerCase();

  if (lower.includes('erwerbstätigkeit erlaubt') || 
      lower.includes('beschäftigung gestattet') ||
      lower.includes('any employment permitted') ||
      lower.includes('employment permitted')) {
    return 'ANY_EMPLOYMENT_ALLOWED';
  }

  if (lower.includes('nur bei') ||
      lower.includes('nur als') ||
      lower.includes('nur in') ||
      lower.includes('beschäftigung nur bei') ||
      lower.includes('beschäftigung nur als') ||
      lower.includes('employment only')) {
    return 'RESTRICTED';
  }

  return 'UNKNOWN';
}
