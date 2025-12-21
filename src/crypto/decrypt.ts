import { toArrayBuffer } from "./utils";

export async function decrypt(
  key: CryptoKey,
  encrypted: ArrayBuffer,
  iv: Uint8Array
): Promise<Uint8Array> {
  const result = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv)
    },
    key,
    encrypted
  );

  return new Uint8Array(result);
}
