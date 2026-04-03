import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_HEX_LENGTH = 64; // 32 bytes = 64 hex chars
const AUTH_TAG_LENGTH = 16; // GCM auth tag is 16 bytes
const IV_LENGTH = 16; // 16-byte IV for AES-256-GCM

function getEncryptionKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== KEY_HEX_LENGTH) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): { encrypted: string; iv: string } {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Auth tag appended to ciphertext for storage
  return {
    encrypted: Buffer.concat([encrypted, authTag]).toString("hex"),
    iv: iv.toString("hex"),
  };
}

export function decrypt(encryptedHex: string, ivHex: string): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const data = Buffer.from(encryptedHex, "hex");
  // Last 16 bytes are the GCM auth tag
  const authTag = data.subarray(data.length - AUTH_TAG_LENGTH);
  const encrypted = data.subarray(0, data.length - AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
