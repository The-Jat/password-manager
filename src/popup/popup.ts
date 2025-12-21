import { deriveKey } from "../crypto/kdf";
import { randomBytes } from "../crypto/random";
import { encrypt } from "../crypto/encrypt";

const btn = document.getElementById("setup")!;
const out = document.getElementById("out")!;
const input = document.getElementById("password") as HTMLInputElement;

console.log("POPUP SCRIPT LOADED");

btn.addEventListener("click", async () => {
    console.log("SETUP CLICKED");
  const password = input.value;
  if (!password) return;

  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, ["encrypt", "decrypt"]);

  const emptyVault = new TextEncoder().encode(
    JSON.stringify({ entries: [] })
  );

  const iv = randomBytes(12);
  const encrypted = await encrypt(key, emptyVault, iv);

  chrome.storage.local.set({
    vault: {
      salt: Array.from(salt),
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    }
  });

  out.textContent = "Vault created securely 🔐";
});
