import { log } from "./vite";

export type VeniceRtWStatus = "ELIGIBLE" | "NOT_ELIGIBLE" | "NEEDS_REVIEW" | "UNKNOWN";

export type VeniceReviewInput = {
  currentRulesStatus: string;
  ocrRawText?: string | null;
  ocrExtractedFields?: any;
};

export type VeniceReviewResult = {
  status: VeniceRtWStatus;
  explanation: string;
  missingInformation: string[];
};

const VENICE_API_BASE_URL = process.env.VENICE_API_BASE_URL || "https://api.venice.ai";
const VENICE_API_KEY = process.env.VENICE_API_KEY;
const VENICE_MODEL_ID = process.env.VENICE_MODEL_ID;

export const VENICE_SYSTEM_PROMPT = `You are a cautious German right-to-work compliance assistant. Based on OCR text and extracted fields from German residence permits (e.g., EU Blue Card, eAT, Fiktionsbescheinigung), decide if a person appears ELIGIBLE, NOT_ELIGIBLE, or NEEDS_REVIEW to work in Germany.

Key principles:
- When in doubt or when critical information is missing, choose NEEDS_REVIEW
- Do not guess or assume information
- Focus on permit wording, especially phrases like "Erwerbstätigkeit gestattet" (employment permitted)
- Consider permit validity dates and current date
- For EU Blue Card and eAT, check if employment authorization is explicitly granted
- For Fiktionsbescheinigung, check if it explicitly allows employment

Return ONLY a valid JSON object with:
- status: one of "ELIGIBLE", "NOT_ELIGIBLE", "NEEDS_REVIEW", or "UNKNOWN"
- explanation: a clear, concise explanation of your decision (1-2 sentences)
- missingInformation: array of strings listing any critical missing data points

This is an internal screening tool, not legal advice.`.trim();

export async function getVeniceRightToWorkDecision(
  input: VeniceReviewInput
): Promise<VeniceReviewResult> {
  if (!VENICE_API_KEY || !VENICE_MODEL_ID) {
    log("Venice.ai integration not configured (missing VENICE_API_KEY or VENICE_MODEL_ID)");
    return {
      status: "UNKNOWN",
      explanation: "Venice.ai integration is not configured.",
      missingInformation: [],
    };
  }

  try {
    const systemMessage = buildSystemMessage();
    const userMessage = buildUserMessage(input);

    const response = await fetch(`${VENICE_API_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${VENICE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VENICE_MODEL_ID,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log(`Venice API error (${response.status}): ${errorText}`);
      return {
        status: "UNKNOWN",
        explanation: `Venice API request failed with status ${response.status}.`,
        missingInformation: [],
      };
    }

    const data = await response.json();
    const assistantContent = data.choices?.[0]?.message?.content;

    if (!assistantContent) {
      log("Venice API returned no assistant message content");
      return {
        status: "UNKNOWN",
        explanation: "Venice API returned no response content.",
        missingInformation: [],
      };
    }

    const parsed = parseVeniceResponse(assistantContent);
    return parsed;
  } catch (error) {
    log("Venice API call failed:", String(error));
    return {
      status: "UNKNOWN",
      explanation: "Failed to communicate with Venice AI.",
      missingInformation: [],
    };
  }
}

function buildSystemMessage(): string {
  return VENICE_SYSTEM_PROMPT;
}

function buildUserMessage(input: VeniceReviewInput): string {
  const { currentRulesStatus, ocrRawText, ocrExtractedFields } = input;

  let message = `Current rules-engine status: ${currentRulesStatus ?? "NEEDS_REVIEW"}.\n\n`;

  const rawText = (ocrRawText || "").toString();
  const trimmedRawText = rawText.slice(0, 4000);

  if (trimmedRawText) {
    message += `OCR raw text:\n${trimmedRawText}\n\n`;
  } else {
    message += `OCR raw text: (none available)\n\n`;
  }

  let extractedJson = "";
  if (ocrExtractedFields) {
    try {
      extractedJson = JSON.stringify(ocrExtractedFields, null, 2);
    } catch (err) {
      log("Failed to stringify ocrExtractedFields for Venice:", String(err));
      extractedJson = "";
    }
  }
  const trimmedExtractedJson = extractedJson.slice(0, 4000);

  if (trimmedExtractedJson) {
    message += `Extracted fields JSON:\n${trimmedExtractedJson}\n\n`;
  } else {
    message += `Extracted fields JSON: (none available)\n\n`;
  }

  message += `Return ONLY a JSON object with keys: status (one of 'ELIGIBLE','NOT_ELIGIBLE','NEEDS_REVIEW','UNKNOWN'), explanation (string), missingInformation (string[]).`;

  return message;
}

function parseVeniceResponse(content: string): VeniceReviewResult {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const validStatuses: VeniceRtWStatus[] = ["ELIGIBLE", "NOT_ELIGIBLE", "NEEDS_REVIEW", "UNKNOWN"];
    const status = validStatuses.includes(parsed.status) ? parsed.status : "UNKNOWN";

    return {
      status,
      explanation: parsed.explanation || "No explanation provided.",
      missingInformation: Array.isArray(parsed.missingInformation) ? parsed.missingInformation : [],
    };
  } catch (error) {
    log("Failed to parse Venice response:", String(error));
    return {
      status: "UNKNOWN",
      explanation: "Failed to parse Venice response.",
      missingInformation: [],
    };
  }
}
