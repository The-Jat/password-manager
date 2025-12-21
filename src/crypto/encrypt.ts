import { toArrayBuffer } from "./utils";

export async function encrypt(
  key: CryptoKey,
  data: Uint8Array,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  return crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv)
    },
    key,
    toArrayBuffer(data)
  );
}
