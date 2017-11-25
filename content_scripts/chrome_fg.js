document.addEventListener("DOMNodeInsertedIntoDocument", function(evt) {
    var elm = evt.srcElement;
    if (elm.tagName === "EMBED" && elm.type === "application/pdf") {
        chrome.storage.local.get("noPdfViewer", function(resp) {
            if (!resp.noPdfViewer) {
                setTimeout(function() {
                    // stop before redirect to prevent chrome crash
                    window.stop();
                    window.location.replace(chrome.extension.getURL("/pages/pdf_viewer.html") + "?r=" + elm.src);
                }, 0);
            }
        });
    }
}, true);

