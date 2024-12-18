import {
    showPopup,
} from './common/utils.js';
import { dispatchSKEvent, runtime, RUNTIME } from './common/runtime.js';
import { start } from './content.js';

function usePdfViewer() {
    window.location.replace(chrome.runtime.getURL("/pages/pdf_viewer.html") + "?file=" + document.URL);
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
    RUNTIME('read', {
        content: text,
        options: options
    }, function(res) {
        if (verbose) {
            if (res.ttsEvent.type === "start") {
                showPopup(text);
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
                showPopup(updated);
            } else if (res.ttsEvent.type === "end") {
                dispatchSKEvent("front", ['hidePopup']);
            }
        }
        if (onEnd && (res.ttsEvent.type === "end" || res.ttsEvent.type === "interrupted")) {
            onEnd();
        }
        return res.ttsEvent.type !== "end";
    });
}

start({
    usePdfViewer,
    readText
});
