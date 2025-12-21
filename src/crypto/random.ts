export function randomBytes(len: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(len));
}
