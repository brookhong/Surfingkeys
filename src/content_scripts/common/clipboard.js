import { RUNTIME } from './runtime.js';
import {
    actionWithSelectionPreserved,
    insertJS,
    getBrowserName,
    setSanitizedContent,
    showBanner,
} from './utils.js';

function createClipboard() {
    var self = {};

    var holder = document.createElement('textarea');
    holder.contentEditable = true;
    holder.enableAutoFocus = true;
    holder.id = 'sk_clipboard';

    function clipboardActionWithSelectionPreserved(cb) {
        actionWithSelectionPreserved(function(selection) {
            // avoid editable body
            document.documentElement.appendChild(holder);

            cb(selection);

            holder.remove();
        });
    }

    /**
     * Read from clipboard.
     *
     * @param {function} onReady a callback function to handle text read from clipboard.
     * @name Clipboard.read
     *
     * @example
     * Clipboard.read(function(response) {
     *   console.log(response.data);
     * });
     */
    self.read = function(onReady) {
        if (getBrowserName().startsWith("Safari")) {
            RUNTIME('readClipboard', null, function(response) {
                onReady(response);
            });
            return;
        }

        if (getBrowserName() === "Firefox" &&
            typeof navigator.clipboard === 'object' && typeof navigator.clipboard.readText === 'function') {
          navigator.clipboard.readText().then((data) => {
              // call back onReady in a different thread to avoid breaking UI operations
              // such as Front.openOmnibar
              setTimeout(function() {
                  onReady({ data });
              }, 0);
          });
          return;
        }
        clipboardActionWithSelectionPreserved(function() {
            holder.value = '';
            setSanitizedContent(holder, '');
            holder.focus();
            document.execCommand("paste");
        });
        var data = holder.value;
        if (data === "") {
            data = holder.innerHTML.replace(/<br>/gi,"\n");
        }
        onReady({data: data});
    };

    /**
     * Write text to clipboard.
     *
     * @param {string} text the text to be written to clipboard.
     * @name Clipboard.write
     *
     * @example
     * Clipboard.write(window.location.href);
     */
    self.write = function(text) {
        navigator.clipboard.writeText(text).then(
            () => {
                showBanner("Copied: " + text);
            },
            (err) => {
                console.log(err);
            }
        );
    };

    return self;

}

export default createClipboard;
