// This runs in the background of Chrome and bypasses Steam's firewall
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchDealData") {
        fetch(request.url)
            .then(response => response.json())
            .then(data => sendResponse({ success: true, data: data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        
        return true; // Tells Chrome we will send the response asynchronously
    }
});