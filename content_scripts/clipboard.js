var Clipboard = (function(mode) {

    var holder = document.createElement('textarea');
    holder.contentEditable = true;
    holder.enableAutoFocus = true;
    holder.id = 'sk_clipboard';

    function clipboardActionWithSelectionPreserved(cb) {
        var selection = document.getSelection();
        var pos = [selection.type, selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset];
        document.body.appendChild(holder);

        cb();

        holder.remove();
        if (pos[0] === "Caret") {
            selection.setPosition(pos[3], pos[4]);
        } else if (pos[0] === "Range") {
            selection.setPosition(pos[1], pos[2]);
            selection.extend(pos[3], pos[4]);
        }
    }

    self.read = function(onReady) {
        clipboardActionWithSelectionPreserved(function() {
            holder.value = '';
            holder.focus();
            document.execCommand("Paste");
        });
        onReady({data: holder.value});
    };

    self.write = function(text) {
        clipboardActionWithSelectionPreserved(function() {
            holder.value = text;
            holder.select();
            document.execCommand('copy');
            holder.value = '';
        });
        Front.showBanner("Copied: " + text);
    };

    return self;

})();
