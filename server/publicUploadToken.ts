import { createHmac, timingSafeEqual } from "crypto";

function getPublicUploadSecret(): string {
  const secret = process.env.PUBLIC_UPLOAD_SECRET;
  
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PUBLIC_UPLOAD_SECRET environment variable must be set in production");
    }
    console.warn("⚠️  WARNING: Using fixed development PUBLIC_UPLOAD_SECRET. Set PUBLIC_UPLOAD_SECRET env var for production!");
    return "certia-dev-secret-do-not-use-in-production-replace-with-env-var";
  }
  
  return secret;
}

const PUBLIC_UPLOAD_SECRET = getPublicUploadSecret();

export type PublicUploadPayload = {
  uid: string;      // employer userId
  empId: string;    // employeeId
  exp: number;      // unix timestamp in ms
};

function base64urlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

function computeSignature(payloadBase64: string): string {
  const hmac = createHmac("sha256", PUBLIC_UPLOAD_SECRET);
  hmac.update(payloadBase64);
  return base64urlEncode(hmac.digest("base64"));
}

export function createPublicUploadToken(payload: PublicUploadPayload): string {
  const payloadJson = JSON.stringify(payload);
  const payloadBase64 = base64urlEncode(payloadJson);
  const signature = computeSignature(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

export function verifyPublicUploadToken(token: string): PublicUploadPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) {
      return null;
    }

    const [payloadBase64, receivedSignature] = parts;
    const expectedSignature = computeSignature(payloadBase64);

    // Timing-safe comparison
    const receivedBuffer = Buffer.from(receivedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);
    
    if (receivedBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(receivedBuffer, expectedBuffer)) {
      return null;
    }

    // Decode and parse payload
    const payloadJson = base64urlDecode(payloadBase64);
    const payload = JSON.parse(payloadJson) as PublicUploadPayload;

    // Check expiry
    if (payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch (err) {
    // Invalid token format or JSON
    return null;
  }
}
