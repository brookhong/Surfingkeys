ChromeService.newTabUrl = "about:newtab";

ChromeService.getContainerName = function (message, sender, sendResponse) {
    var cookieStoreId = sender.tab.cookieStoreId;
    browser.contextualIdentities.get(cookieStoreId).then(function(container){
        ChromeService._response(message, sendResponse, {
            name : container.name
        });
    }, function(err){
        ChromeService._response(message, sendResponse, {
            name : null
        });});
};
