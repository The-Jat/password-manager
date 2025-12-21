console.log("Background started");

chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
  if (msg.type === "PING") {
    sendResponse({ type: "PONG" });
  }
});
