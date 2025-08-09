// AES-256-GCM encryption/decryption using Web Crypto API with PBKDF2
// Stores {ciphertext, iv, salt, iterations, algo}

export type EncryptedBlob = {
  c: string; // base64 ciphertext
  iv: string; // base64
  s: string; // base64 salt
  it: number; // iterations
  a: 'AES-GCM';
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function b64encode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function b64decode(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function deriveKey(password: string, salt: ArrayBuffer, iterations = 150000): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptPrivateKey(plaintext: string, password: string, iterations = 150000): Promise<EncryptedBlob> {
  const salt = crypto.getRandomValues(new Uint8Array(16)).buffer;
  const iv = crypto.getRandomValues(new Uint8Array(12)).buffer;
  const key = await deriveKey(password, salt, iterations);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(plaintext));
  return {
    c: b64encode(ct),
    iv: b64encode(iv),
    s: b64encode(salt),
    it: iterations,
    a: 'AES-GCM',
  };
}

export async function decryptPrivateKey(blob: EncryptedBlob, password: string): Promise<string> {
  const salt = b64decode(blob.s);
  const iv = b64decode(blob.iv);
  const key = await deriveKey(password, salt, blob.it);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, b64decode(blob.c));
  return textDecoder.decode(pt);
}
