function usePdfViewer() {
    window.location.replace(chrome.extension.getURL("/pages/pdf_viewer.html") + "?r=" + document.URL);
}

function readText(text, options) {
    options = options || {
        enqueue: true,
        voiceName: runtime.conf.defaultVoice
    };
    var verbose = options.verbose;
    var stopPattern = /[\s\u00a0]/g,
        verbose = options.verbose,
        onEnd = options.onEnd;
    delete options.verbose;
    delete options.onEnd;
    runtime.command({
        action: 'read',
        content: text,
        options: options
    }, function(res) {
        if (verbose) {
            if (res.ttsEvent.type === "start") {
                Front.showPopup(text);
            } else if (res.ttsEvent.type === "word") {
                stopPattern.lastIndex = res.ttsEvent.charIndex;
                var updated, end = stopPattern.exec(text);
                if (end) {
                    updated = text.substr(0, res.ttsEvent.charIndex)
                        + "<font style='font-weight: bold; text-decoration: underline'>"
                        + text.substr(res.ttsEvent.charIndex, end.index - res.ttsEvent.charIndex + 1)
                        + "</font>"
                        + text.substr(end.index);
                } else {
                    updated = text.substr(0, res.ttsEvent.charIndex)
                        + "<font style='font-weight: bold; text-decoration: underline'>"
                        + text.substr(res.ttsEvent.charIndex)
                        + "</font>";
                }
                Front.showPopup(updated);
            } else if (res.ttsEvent.type === "end") {
                Front.hidePopup();
            }
        }
        if (onEnd && res.ttsEvent.type === "end") {
            onEnd();
        }
        return res.ttsEvent.type !== "end";
    });
}
