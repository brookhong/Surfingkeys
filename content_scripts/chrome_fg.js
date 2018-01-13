function usePdfViewer() {
    function _usePdfViewer() {
        var nodes = document.body.querySelectorAll('*');
        if (nodes.length === 1 && nodes[0].tagName === "EMBED" && nodes[0].type === "application/pdf") {
            chrome.storage.local.get("noPdfViewer", function (respo) {
                if (!respo.noPdfViewer) {
                    window.location.replace(chrome.extension.getURL("/pages/pdf_viewer.html") + "?r=" + nodes[0].src);
                }
            });
        }
    }
    if (document.body) {
        _usePdfViewer();
    } else {
        document.addEventListener('DOMContentLoaded', function (e) {
            _usePdfViewer();
        });
    }
}
