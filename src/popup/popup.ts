const btn = document.getElementById("ping")!;
const out = document.getElementById("out")!;

btn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "PING" }, (res) => {
    out.textContent = JSON.stringify(res);
  });
});
