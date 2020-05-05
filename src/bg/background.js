
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    alert("Received " + JSON.stringify(msg, null, 4) + "\n" + JSON.stringify(sender, null, 4) + "\n" + sender.frameId);
    sendResponse("Gotcha! " + sender.frameId);
    // Note: Returning true is required here!
    //  ref: http://stackoverflow.com/questions/20077487/chrome-extension-message-passing-response-not-sent
    return true;
});

// https://developer.chrome.com/extensions/getstarted
chrome.runtime.onInstalled.addListener(function() {
    // chrome.tabs.query({ active: true, lastFocusedWindow: true }, function(tabs) {
    //   var url = tabs[0].url;
    //   console.log(`tabs`, tabs);
    // });
    // chrome.tabs.query(
    //   { active: true, windowId: chrome.windows.WINDOW_ID_CURRENT },
    //   function(tabs) {
    //     console.log(`tabs`, tabs);
    //   }
    // );
    // chrome.storage.sync.set({ color: "#3aa757" }, function() {
    //   console.log("The color is green.");
    // });

    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [
                new chrome.declarativeContent.PageStateMatcher({
                    pageUrl: { hostEquals: "teams.microsoft.com" }
                })
            ],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        }]);
    });
});