import { deriveKey } from "../crypto/kdf";
import { encrypt } from "../crypto/encrypt";
import { decrypt } from "../crypto/decrypt";
import { randomBytes } from "../crypto/random";

const passwordInput = document.getElementById("password") as HTMLInputElement;
const out = document.getElementById("out") as HTMLElement;

const setupBtn = document.getElementById("setup") as HTMLButtonElement;
const unlockBtn = document.getElementById("unlock") as HTMLButtonElement;
const addBtn = document.getElementById("add") as HTMLButtonElement;

const siteInput = document.getElementById("site") as HTMLInputElement;
const userInput = document.getElementById("username") as HTMLInputElement;
const passInput = document.getElementById("entryPassword") as HTMLInputElement;

const entriesDiv = document.getElementById("entries") as HTMLElement;

let vault: { entries: any[] } | null = null;
let vaultKey: CryptoKey | null = null;

/* CREATE VAULT */
setupBtn.addEventListener("click", async () => {
  const password = passwordInput.value;
  if (!password) return;

  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, ["encrypt", "decrypt"]);

  const emptyVault = { entries: [] };
  const encoded = new TextEncoder().encode(JSON.stringify(emptyVault));

  const iv = randomBytes(12);
  const encrypted = await encrypt(key, encoded, iv);

  chrome.storage.local.set({
    vault: {
      salt: Array.from(salt),
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    }
  });

  out.textContent = "Vault created 🔐";
});

/* UNLOCK VAULT */
unlockBtn.addEventListener("click", async () => {
  const password = passwordInput.value;
  if (!password) return;

  chrome.storage.local.get("vault", async (res) => {
    try {
      const v = res.vault;

      const key = await deriveKey(
        password,
        new Uint8Array(v.salt),
        ["encrypt", "decrypt"]
      );

      const decrypted = await decrypt(
        key,
        new Uint8Array(v.data),
        new Uint8Array(v.iv)
      );

      vault = JSON.parse(new TextDecoder().decode(decrypted));
      vaultKey = key;

      out.textContent = "Vault unlocked 🔓";

      // list entries
      renderEntries();

      console.log(vault);
    } catch {
      out.textContent = "Wrong password ❌";
    }
  });
});

/* ADD ENTRY */
addBtn.addEventListener("click", async () => {
  if (!vault || !vaultKey) {
    out.textContent = "Unlock vault first";
    return;
  }

  vault.entries.push({
    id: crypto.randomUUID(),
    site: siteInput.value,
    username: userInput.value,
    password: passInput.value,
    createdAt: Date.now()
  });

  const encoded = new TextEncoder().encode(JSON.stringify(vault));
  const iv = randomBytes(12);
  const encrypted = await encrypt(vaultKey, encoded, iv);

  chrome.storage.local.get("vault", (res) => {
    chrome.storage.local.set({
      vault: {
        salt: res.vault.salt,
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encrypted))
      }
    });
  });

  out.textContent = "Entry added 🔐";
});

function renderEntries() {
  if (!vault) return;

  entriesDiv.innerHTML = "";

  if (vault.entries.length === 0) {
    entriesDiv.textContent = "No entries yet";
    return;
  }

  for (const entry of vault.entries) {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.marginBottom = "6px";

    const label = document.createElement("span");
    label.textContent = `${entry.site} → ${entry.username}`;

    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Copy";

    copyBtn.addEventListener("click", () => {
      copyPassword(entry.password);
    });

    row.appendChild(label);
    row.appendChild(copyBtn);
    entriesDiv.appendChild(row);
  }
}

async function copyPassword(password: string) {
  try {
    await navigator.clipboard.writeText(password);
    out.textContent = "Password copied 📋";

    setTimeout(() => {
      navigator.clipboard.writeText("");
      out.textContent = "Clipboard cleared 🔒";
    }, 30_000);
  } catch {
    out.textContent = "Clipboard access denied ❌";
  }
}
