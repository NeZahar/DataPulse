import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function getKey(): Buffer {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw || raw.length < 16) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY is not configured");
  }
  // Normalize any length secret to 32 bytes
  return createHash("sha256").update(raw).digest();
}

/** Encrypt a secret for at-rest storage (AES-256-GCM). Format: iv.tag.ciphertext (base64). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted payload");
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function maskSecret(value: string): string {
  if (!value) return "—";
  if (value.length <= 4) return "••••";
  return `${"•".repeat(Math.min(value.length - 2, 8))}${value.slice(-2)}`;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateApiToken(): string {
  return `dp_${randomBytes(32).toString("base64url")}`;
}
