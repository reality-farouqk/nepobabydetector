/**
 * Field-level encryption for Flutterwave v4 card details.
 *
 * SERVER ONLY — reads FLW_ENCRYPTION_KEY.
 *
 * Per the v4 encryption spec: AES-256-GCM, the dashboard key is base64 and
 * decoded to raw bytes, the 12-character alphanumeric nonce doubles as the IV,
 * and the output is base64 of ciphertext-with-appended-auth-tag (which is what
 * WebCrypto's encrypt() returns). The nonce is sent alongside in plaintext so
 * Flutterwave can decrypt.
 */

const NONCE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const NONCE_LENGTH = 12;

export class EncryptionConfigError extends Error {}

/** A single-use 12-character alphanumeric nonce, used as the AES-GCM IV. */
export function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));
  let out = "";
  for (const b of bytes) out += NONCE_ALPHABET[b % NONCE_ALPHABET.length];
  return out;
}

/**
 * Decodes base64 into a Uint8Array that is definitely backed by a plain
 * ArrayBuffer — Buffer's view can be SharedArrayBuffer-backed, which WebCrypto's
 * BufferSource type rejects.
 */
function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  const buf = Buffer.from(value, "base64");
  const out = new Uint8Array(new ArrayBuffer(buf.byteLength));
  out.set(buf);
  return out;
}

function toBase64(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString("base64");
}

async function importKey(): Promise<CryptoKey> {
  const raw = process.env.FLW_ENCRYPTION_KEY;
  if (!raw) {
    throw new EncryptionConfigError("FLW_ENCRYPTION_KEY is not set");
  }

  const keyBytes = decodeBase64(raw);
  if (keyBytes.byteLength !== 32) {
    throw new EncryptionConfigError(
      `FLW_ENCRYPTION_KEY must decode to 32 bytes for AES-256, got ${keyBytes.byteLength}`,
    );
  }

  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
}

/**
 * Encrypts one field with the shared nonce. All fields in a single request must
 * use the same nonce, and that nonce must not be reused across requests.
 */
export async function encryptField(plaintext: string, nonce: string): Promise<string> {
  if (nonce.length !== NONCE_LENGTH) {
    throw new EncryptionConfigError("Nonce must be exactly 12 characters long");
  }

  const key = await importKey();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new TextEncoder().encode(nonce) },
    key,
    new TextEncoder().encode(plaintext),
  );

  return toBase64(ciphertext);
}

export interface PlainCard {
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

export interface EncryptedCard {
  encrypted_card_number: string;
  encrypted_expiry_month: string;
  encrypted_expiry_year: string;
  encrypted_cvv: string;
  nonce: string;
}

/** Encrypts a whole card under one fresh nonce. */
export async function encryptCard(card: PlainCard): Promise<EncryptedCard> {
  const nonce = newNonce();
  const [number, month, year, cvv] = await Promise.all([
    encryptField(card.number, nonce),
    encryptField(card.expiryMonth, nonce),
    encryptField(card.expiryYear, nonce),
    encryptField(card.cvv, nonce),
  ]);

  return {
    encrypted_card_number: number,
    encrypted_expiry_month: month,
    encrypted_expiry_year: year,
    encrypted_cvv: cvv,
    nonce,
  };
}
