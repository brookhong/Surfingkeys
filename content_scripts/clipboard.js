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

    self.read = function(onReady) {
        if (window.navigator.userAgent.indexOf("Firefox") !== -1 &&
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

    self.write = function(text) {
        const cb = () => Front.showBanner("Copied: " + text);
        if (window.navigator.userAgent.indexOf("Firefox") !== -1 &&
            typeof navigator.clipboard === 'object' && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(text).then(cb);
          return;
        }
        Normal.insertJS(function() {
            window.oncopy = document.oncopy;
            document.oncopy = null;
        }, function() {
            clipboardActionWithSelectionPreserved(function() {
                holder.value = text;
                holder.select();
                document.execCommand('copy');
                holder.value = '';
            });
            Normal.insertJS(function() {
                document.oncopy = window.oncopy;
                delete window.oncopy;
            });
            cb();
        });
    };

    return self;

}
