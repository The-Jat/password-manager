import { deriveKey } from "../crypto/kdf";
import { encrypt } from "../crypto/encrypt";
import { decrypt } from "../crypto/decrypt";
import { randomBytes } from "../crypto/random";

const passwordInput = document.getElementById("password");
const out = document.getElementById("out");

const setupBtn = document.getElementById("setup");
const unlockBtn = document.getElementById("unlock");
const addBtn = document.getElementById("add");

const siteInput = document.getElementById("site");
const userInput = document.getElementById("username");
const passInput = document.getElementById("entryPassword");

const entriesDiv = document.getElementById("entries");

const syncBtn = document.getElementById("sync");


let vault = null;
let vaultKey = null;


document.getElementById("login").onclick = async () => {
  console.log("logging");
  const email = document.getElementById("email").value;
  const password = document.getElementById("loginPassword").value;

  const res = await fetch("http://localhost:3000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  console.log("data =", data);
  console.log("access_token = " + data.token);

  // chrome.storage.local.set({ token: data.access_token });
  await new Promise<void>((resolve) => {
    chrome.storage.local.set({ token: data.token }, () => resolve());
  });

  await fetchVaultFromServer();
  out.textContent = "Logged in & vault synced";
};


/* ---------------- HELPERS ---------------- */

function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get("token", (res) => {
      resolve(res.token);
    });
  });
}

async function syncVaultToServer(payload) {
  console.log("syncVaultToServer");
  const token = await getToken();
  console.log("token = " + token);
  if (!token) return;

  await fetch("http://localhost:3000/vault/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  console.log("syncing done");
}

function renderEntries() {
  entriesDiv.innerHTML = "";
  vault.entries.forEach(e => {
    const div = document.createElement("div");
    div.className = "entry";

    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Copy Password";
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(e.password);
      out.textContent = "Password copied 📋";
    };

    div.innerHTML = `
      <b>${e.site}</b><br/>
      ${e.username}<br/>
    `;
    div.appendChild(copyBtn);
    entriesDiv.appendChild(div);
  });
}

/* ---------------- CREATE VAULT ---------------- */

setupBtn.addEventListener("click", async () => {
  const password = passwordInput.value;
  if (!password) return;

  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, ["encrypt", "decrypt"]);

  const emptyVault = { entries: [] };
  const encoded = new TextEncoder().encode(JSON.stringify(emptyVault));

  const iv = randomBytes(12);
  const encrypted = await encrypt(key, encoded, iv);

  const payload = {
    salt: Array.from(salt),
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  };

  chrome.storage.local.set({ vault: payload });
  await syncVaultToServer(payload);

  out.textContent = "Vault created 🔐";
});

/* ---------------- UNLOCK VAULT ---------------- */

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

      renderEntries();
      out.textContent = "Vault unlocked 🔓";
    } catch {
      out.textContent = "Wrong master password ❌";
    }
  });
});

/* ---------------- ADD ENTRY ---------------- */

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

  chrome.storage.local.get("vault", async (res) => {
    const payload = {
      salt: res.vault.salt,
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    };

    chrome.storage.local.set({ vault: payload });
    await syncVaultToServer(payload);
  });

  renderEntries();
  out.textContent = "Entry added 🔐";
});


async function fetchVaultFromServer() {
  const token = await getToken();
  if (!token) return;

  const res = await fetch("http://localhost:3000/vault", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  // if (!res.ok) {
  //   console.log("Failed to fetch vault from server", res.status);
  //   return;
  // }

  // let serverVault = null;
  // try {
  //   serverVault = await res.json();
  // } catch (e) {
  //   console.error("Failed to parse vault JSON", e);
  //   return;
  // }

  // if (!serverVault) {
  //   console.log("Server returned empty vault");
  //   return;
  // }

  // // If using SQLite, data might be strings
  // const vaultPayload = {
  //   salt: JSON.parse(serverVault.salt),
  //   iv: JSON.parse(serverVault.iv),
  //   data: JSON.parse(serverVault.data)
  // };

  // await new Promise<void>((resolve) =>
  //   chrome.storage.local.set({ vault: vaultPayload }, () => resolve())
  // );

  if (!res.ok) {
    console.error("Failed to fetch vault", res.status);
    return;
  }

  const text = await res.text();
  if (!text) {
    console.log("Vault is empty");
    return;
  }

  const serverVault = JSON.parse(text);

  await new Promise<void>((resolve) =>
    chrome.storage.local.set({ vault: serverVault }, () => resolve())
  );

  console.log("Vault fetched from server ✅");
}


syncBtn.addEventListener("click", async () => {
  chrome.storage.local.get("vault", async (res) => {
    if (!res.vault) {
      out.textContent = "No vault to sync ❌";
      return;
    }

    await syncVaultToServer(res.vault);
    out.textContent = "Vault synced to server ☁️";
  });
});
