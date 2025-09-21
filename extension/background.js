chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'COPY_TO_VSCODE') {
    // Encode the entire payload as a single JSON string
    const encoded = encodeURIComponent(JSON.stringify(message.payload));
    const vscodeUrl = `vscode://rthakur2712.leetcode-mentor/createFile?${encoded}`;
    console.log('Opening VS Code URL:', vscodeUrl);
    chrome.tabs.create({ url: vscodeUrl }, (tab) => {
      console.log('Created new tab:', tab);
      // Send response after tab is created
      sendResponse({ success: true });
    });
    return true; // Indicate we'll send response asynchronously
  }
});
