var Insert = (function(mode) {
    var self = $.extend({name: "Insert", eventListeners: {}}, mode);

    self.mappings = new Trie();
    self.map_node = self.mappings;
    self.mappings.add(encodeKeystroke("<Ctrl-e>"), {
        annotation: "Move the cursor to the end of the line",
        feature_group: 15,
        code: function() {
            var element = document.activeElement;
            element.setSelectionRange(element.value.length, element.value.length);
        }
    });
    self.mappings.add(encodeKeystroke("<Ctrl-f>"), {
        annotation: "Move the cursor to the beginning of the line",
        feature_group: 15,
        code: function() {
            var element = document.activeElement;
            element.setSelectionRange(0, 0);
        }
    });
    self.mappings.add(encodeKeystroke("<Ctrl-u>"), {
        annotation: "Delete all entered characters before the cursor",
        feature_group: 15,
        code: function() {
            var element = document.activeElement;
            element.value = element.value.substr(element.selectionStart);
            element.setSelectionRange(0, 0);
        }
    });
    self.mappings.add(encodeKeystroke("<Alt-b>"), {
        annotation: "Move the cursor Backward 1 word",
        feature_group: 15,
        code: function() {
            var element = document.activeElement;
            var pos = nextNonWord(element.value, -1, element.selectionStart);
            element.setSelectionRange(pos, pos);
        }
    });
    self.mappings.add(encodeKeystroke("<Alt-f>"), {
        annotation: "Move the cursor Forward 1 word",
        feature_group: 15,
        code: function() {
            var element = document.activeElement;
            var pos = nextNonWord(element.value, 1, element.selectionStart);
            element.setSelectionRange(pos, pos);
        }
    });
    self.mappings.add(encodeKeystroke("<Alt-w>"), {
        annotation: "Delete a word backwards",
        feature_group: 15,
        code: function() {
            var element = document.activeElement;
            var pos = deleteNextWord(element.value, -1, element.selectionStart);
            element.value = pos[0];
            element.setSelectionRange(pos[1], pos[1]);
        }
    });
    self.mappings.add(encodeKeystroke("<Alt-d>"), {
        annotation: "Delete a word forwards",
        feature_group: 15,
        code: function() {
            var element = document.activeElement;
            var pos = deleteNextWord(element.value, 1, element.selectionStart);
            element.value = pos[0];
            element.setSelectionRange(pos[1], pos[1]);
        }
    });
    self.mappings.add(encodeKeystroke("<Esc>"), {
        annotation: "Exit insert mode",
        feature_group: 15,
        code: function() {
            document.activeElement.blur();
            self.exit();
        }
    });

    var _emojiDiv = $('<div id=sk_emoji style="display: block; opacity: 1;"/>'),
        _emojiList,
        _emojiPending = -1;

    self.mappings.add(":", {
        annotation: "Input emoji",
        feature_group: 15,
        keepPropagation: true,
        code: function() {
            _emojiPending = document.activeElement.selectionStart;
            fetch(chrome.extension.getURL("pages/emoji.tsv"))
                .then(res => Promise.all([res.text()]))
                .then(res => {
                    _emojiList = res[0].split("\n");
                    listEmoji();
                });
        }
    });

    function listEmoji() {
        var input = document.activeElement;
        var query = input.value.substr(_emojiPending, input.selectionStart - _emojiPending);
        var emojiMatched = _emojiList.filter(function(emoji) {
            return emoji.indexOf(query) !== -1;
        }).slice(0, 5).map(function(emoji) {
            var ee = emoji.split("\t");
            return "<div><span>{0}</span>{1}</div>".format(ee[0], ee[1]);
        }).join("");

        if (emojiMatched === "") {
            _emojiDiv.remove();
        } else {
            _emojiDiv.html(emojiMatched).appendTo('body').show();
            _emojiDiv.find('>div:nth(0)').addClass("selected");
            var br = getCursorPixelPos(input);
            _emojiDiv.css('left', br.left);
            _emojiDiv.css('top', br.top + br.height + 4);
        }
    }

    function getCursorPixelPos(input) {
        var css = getComputedStyle(input),
            br = input.getBoundingClientRect(),
            mask = document.createElement("div"),
            span = document.createElement("span");
        mask.style.font = css.font;
        mask.style.position = "absolute";
        mask.innerHTML = input.value;
        mask.style.left = (input.clientLeft + br.left) + "px";
        mask.style.top = (input.clientTop + br.top) + "px";
        mask.style.color = "red";
        mask.style.visibility = "hidden";
        mask.style.whiteSpace = "pre-wrap";
        mask.style.padding = css.padding;
        mask.style.width = css.width;
        mask.style.height = css.height;
        span.innerText = "I";

        var pos = input.selectionStart;
        if (pos === input.value.length) {
            mask.appendChild(span);
        } else {
            var fp = mask.childNodes[0].splitText(pos);
            mask.insertBefore(span, fp);
        }
        document.body.appendChild(mask);

        br = span.getBoundingClientRect();

        mask.remove();
        return br;
    }

    function rotateResult(backward) {
        var si = _emojiDiv.find(">div.selected");
        var ci = (si.index() + (backward ? -1 : 1)) % _emojiDiv.find(">div").length;
        si.removeClass("selected");
        _emojiDiv.find(">div:nth({0})".format(ci)).addClass("selected");
    }

    var _suppressKeyup = false;
    self.addEventListener('keydown', function(event) {
        // prevent this event to be handled by Surfingkeys' other listeners
        event.sk_suppressed = true;
        if (_emojiDiv.is(":visible")) {
            if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
                _emojiDiv.remove();
                _emojiPending = -1;
            } else if (event.keyCode === KeyboardUtils.keyCodes.tab
                || event.keyCode === KeyboardUtils.keyCodes.upArrow
                || event.keyCode === KeyboardUtils.keyCodes.downArrow) {
                rotateResult(event.shiftKey || event.keyCode === KeyboardUtils.keyCodes.upArrow);
                _suppressKeyup = true;
                event.sk_stopPropagation = true;
            } else if (event.keyCode === KeyboardUtils.keyCodes.enter) {
                var elm = document.activeElement,
                    val = elm.value,
                    emoji = _emojiDiv.find(">div.selected>span").html();
                val = val.substr(0, _emojiPending - 1) + emoji + val.substr(elm.selectionStart);
                elm.value = val;
                elm.setSelectionRange(_emojiPending, _emojiPending);
                _emojiDiv.remove();
                _emojiPending = -1;
                event.sk_stopPropagation = true;
            }
        } else if (!isEditable(event.target)) {
            self.exit();
        } else if (KeyboardUtils.keyCodes.enter === event.keyCode && event.target.localName === "input") {
            // leave time 300ms for origin event handler of the input widget
            setTimeout(function() {
                if (document.activeElement === event.target) {
                    event.target.blur();
                }
                self.exit();
            }, 300);
        } else if (event.sk_keyName.length) {
            Normal._handleMapKey.call(self, event, function(last) {
                // for insert mode to insert unmapped chars with preceding chars same as some mapkeys
                // such as, to insert `,m` in case of mapkey `,,` defined.
                var pw = last.getPrefixWord();
                if (pw) {
                    var elm = document.activeElement, str = elm.value, pos = elm.selectionStart;
                    if (str !== undefined && pos !== undefined) {
                        elm.value = str.substr(0, elm.selectionStart) + pw + str.substr(elm.selectionEnd);
                        pos += pw.length;
                        elm.setSelectionRange(pos, pos);
                    } else {
                        elm = document.getSelection();
                        var range = elm.getRangeAt(0);
                        var n = document.createTextNode(pw);
                        if (elm.type === "Caret") {
                            str = elm.focusNode.data;
                            if (str === undefined) {
                                range.insertNode(n);
                                elm.setPosition(n, n.length);
                            } else {
                                pos = elm.focusOffset;
                                elm.focusNode.data = str.substr(0, pos) + pw + str.substr(pos);
                                elm.setPosition(elm.focusNode, pos + pw.length);
                            }
                        } else {
                            range.deleteContents();
                            range.insertNode(n);
                            elm.setPosition(n, n.length);
                        }
                    }
                }
            });
        }
    });
    self.addEventListener('keyup', function(event) {
        if (!_suppressKeyup && _emojiPending !== -1) {
            if (event.target.selectionStart < _emojiPending || event.target.value[_emojiPending - 1] !== ":") {
                _emojiDiv.remove();
            } else {
                listEmoji();
            }
        }
        _suppressKeyup = false;
    });
    self.addEventListener('focus', function(event) {
        if (!isEditable(event.target)) {
            self.exit();
        }
    });
    self.addEventListener('pushState', function(event) {
        event.sk_suppressed = true;
    });

    function nextNonWord(str, dir, cur) {
        var nonWord = /\W/;
        for ( cur = cur + dir; ; ) {
            if (cur < 0) {
                cur = 0;
                break;
            } else if (cur >= str.length) {
                cur = str.length;
                break;
            } else if (nonWord.test(str[cur])) {
                break;
            } else {
                cur = cur + dir;
            }
        }
        return cur;
    }

    function deleteNextWord(str, dir, cur) {
        var pos = nextNonWord(str, dir, cur);
        var s = str;
        if (pos > cur) {
            s = str.substr(0, cur) + str.substr(pos + 1);
        } else if (pos < cur) {
            s = str.substr(0, pos + 1) + str.substr(cur);
        }
        return [s, pos];
    }

    return self;
})(Mode);
