// Background service worker for Form AutoFill Extension
console.log("Form AutoFill Extension: Background service worker loaded");

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("Form AutoFill Extension: Extension installed");

    // Set up any initial state or permissions
    chrome.storage.local.set({
      extensionInstalled: true,
      installDate: new Date().toISOString(),
    });
  } else if (details.reason === "update") {
    console.log("Form AutoFill Extension: Extension updated");
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log("Form AutoFill Extension: Extension started");
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Form AutoFill Extension: Background received message:", request);

  // Handle any background-specific messages here
  if (request.action === "ping") {
    sendResponse({ status: "Background service worker is running" });
  }

  return true;
});

// Log when background script is loaded
console.log("Form AutoFill Extension: Background service worker ready");
