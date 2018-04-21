var Insert = (function() {
    var self = new Mode("Insert");

    function moveCusorEOL() {
        var element = getRealEdit();
        if (element.setSelectionRange !== undefined) {
            if (element.type !== "email" && element.type !== "number") {
                // The input element's type ('email') does not support selection.
                element.setSelectionRange(element.value.length, element.value.length);
            }
        } else if (isEditable(element)) {
            // for contenteditable div
            if (element.childNodes.length > 0) {
                var node = element.childNodes[element.childNodes.length -1];
                if (node.nodeType === Node.TEXT_NODE) {
                    document.getSelection().setPosition(node, node.data.length);
                } else {
                    document.getSelection().setPosition(node, 0);
                }
                // blink cursor to bring cursor into view
                Visual.showCursor();
                Visual.hideCursor();
            }
        }
    }

    self.mappings = new Trie();
    self.map_node = self.mappings;
    self.mappings.add(KeyboardUtils.encodeKeystroke("<Ctrl-e>"), {
        annotation: "Move the cursor to the end of the line",
        feature_group: 15,
        code: moveCusorEOL
    });
    self.mappings.add(KeyboardUtils.encodeKeystroke("<Ctrl-f>"), {
        annotation: "Move the cursor to the beginning of the line",
        feature_group: 15,
        code: function() {
            var element = getRealEdit();
            if (element.setSelectionRange !== undefined) {
                element.setSelectionRange(0, 0);
            } else {
                // for contenteditable div
                var selection = document.getSelection();
                selection.setPosition(selection.focusNode, 0);
                // blink cursor to bring cursor into view
                Visual.showCursor();
                Visual.hideCursor();
            }
        }
    });
    self.mappings.add(KeyboardUtils.encodeKeystroke("<Ctrl-u>"), {
        annotation: "Delete all entered characters before the cursor",
        feature_group: 15,
        code: function() {
            var element = getRealEdit();
            if (element.setSelectionRange !== undefined) {
                element.value = element.value.substr(element.selectionStart);
                element.setSelectionRange(0, 0);
            } else {
                // for contenteditable div
                var selection = document.getSelection();
                selection.focusNode.data = selection.focusNode.data.substr(selection.focusOffset);
            }
        }
    });
    self.mappings.add(KeyboardUtils.encodeKeystroke("<Alt-b>"), {
        annotation: "Move the cursor Backward 1 word",
        feature_group: 15,
        code: function() {
            var element = getRealEdit();
            if (element.setSelectionRange !== undefined) {
                var pos = nextNonWord(element.value, -1, element.selectionStart);
                element.setSelectionRange(pos, pos);
            } else {
                // for contenteditable div
                document.getSelection().modify("move", "backward", "word");
            }
        }
    });
    self.mappings.add(KeyboardUtils.encodeKeystroke("<Alt-f>"), {
        annotation: "Move the cursor Forward 1 word",
        feature_group: 15,
        code: function() {
            var element = getRealEdit();
            if (element.setSelectionRange !== undefined) {
                var pos = nextNonWord(element.value, 1, element.selectionStart);
                element.setSelectionRange(pos, pos);
            } else {
                // for contenteditable div
                document.getSelection().modify("move", "forward", "word");
            }
        }
    });
    self.mappings.add(KeyboardUtils.encodeKeystroke("<Alt-w>"), {
        annotation: "Delete a word backwards",
        feature_group: 15,
        code: function() {
            var element = getRealEdit();
            if (element.setSelectionRange !== undefined) {
                var pos = deleteNextWord(element.value, -1, element.selectionStart);
                element.value = pos[0];
                element.setSelectionRange(pos[1], pos[1]);
            } else {
                // for contenteditable div
                var selection = document.getSelection();
                var p0 = selection.focusOffset;
                document.getSelection().modify("move", "backward", "word");
                var v = selection.focusNode.data, p1 = selection.focusOffset;
                selection.focusNode.data = v.substr(0, p1) + v.substr(p0);
                selection.setPosition(selection.focusNode, p1);
            }
        }
    });
    self.mappings.add(KeyboardUtils.encodeKeystroke("<Alt-d>"), {
        annotation: "Delete a word forwards",
        feature_group: 15,
        code: function() {
            var element = getRealEdit();
            if (element.setSelectionRange !== undefined) {
                var pos = deleteNextWord(element.value, 1, element.selectionStart);
                element.value = pos[0];
                element.setSelectionRange(pos[1], pos[1]);
            } else {
                // for contenteditable div
                var selection = document.getSelection();
                var p0 = selection.focusOffset;
                document.getSelection().modify("move", "forward", "word");
                var v = selection.focusNode.data, p1 = selection.focusOffset;
                selection.focusNode.data = v.substr(0, p0) + v.substr(p1);
                selection.setPosition(selection.focusNode, p0);
            }
        }
    });
    self.mappings.add(KeyboardUtils.encodeKeystroke("<Esc>"), {
        annotation: "Exit insert mode",
        feature_group: 15,
        keepPropagation: true,
        code: function() {
            getRealEdit().blur();
            self.exit();
        }
    });

    var _emojiDiv = createElement('<div id="sk_emoji" style="display: block; opacity: 1;"/>'),
        _emojiList,
        _emojiPending = -1;

    self.mappings.add(":", {
        annotation: "Input emoji",
        feature_group: 15,
        keepPropagation: true,
        code: function() {
            var element = getRealEdit();
            if (element.selectionStart !== undefined) {
                _emojiPending = element.selectionStart;
            } else {
                _emojiPending = document.getSelection().focusOffset;
            }
            fetch(chrome.extension.getURL("pages/emoji.tsv"))
                .then(res => Promise.all([res.text()]))
                .then(res => {
                    _emojiList = res[0].split("\n");
                    listEmoji();
                });
        }
    });

    function listEmoji() {
        var input = getRealEdit(), query = "", isInput = true;
        if (input.selectionStart !== undefined && input.value !== undefined) {
            query = input.value.substr(_emojiPending, input.selectionStart - _emojiPending);
        } else {
            // for contenteditable div
            isInput = false;
            var selection = document.getSelection();
            query = selection.focusNode.data.substr(_emojiPending, selection.focusOffset - _emojiPending);
        }
        if (query.length < runtime.conf.startToShowEmoji || query[0] === " ") {
            _emojiDiv.remove();
        } else {
            var emojiMatched = _emojiList.filter(function(emoji) {
                return emoji.indexOf(query) !== -1;
            }).slice(0, 5).map(function(emoji) {
                var ee = emoji.split("\t");
                var parsedUnicodeEmoji = String.fromCodePoint.apply(null, ee[0].split(','));
                return "<div><span>{0}</span>{1}</div>".format(parsedUnicodeEmoji, ee[1]);
            }).join("");

            if (emojiMatched === "") {
                _emojiDiv.remove();
            } else {
                _emojiDiv.innerHTML = emojiMatched;
                document.body.append(_emojiDiv);
                _emojiDiv.style.display = "";
                _emojiDiv.querySelector('#sk_emoji>div').classList.add("selected");
                var br;
                if (isInput) {
                    br = getCursorPixelPos(input);
                } else {
                    Visual.showCursor();
                    br = Visual.getCursorPixelPos();
                    Visual.hideCursor();
                }
                var top = br.top + br.height + 4;
                if (window.innerHeight - top < _emojiDiv.offsetHeight) {
                    top = br.top - _emojiDiv.offsetHeight;
                }

                _emojiDiv.style.position = "fixed";
                _emojiDiv.style.top = top + "px";
                _emojiDiv.style.left = br.left + "px";
            }
        }
    }

    function getCursorPixelPos(input) {
        var css = getComputedStyle(input),
            br = input.getBoundingClientRect(),
            mask = document.createElement("div"),
            span = document.createElement("span");
        mask.style.font = css.font;
        mask.style.position = "fixed";
        mask.innerHTML = input.value;
        mask.style.left = (input.clientLeft + br.left) + "px";
        mask.style.top = (input.clientTop + br.top) + "px";
        mask.style.color = "red";
        mask.style.overflow = "scroll";
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
        scrollIntoViewIfNeeded(span);

        br = span.getBoundingClientRect();

        mask.remove();
        return br;
    }

    function rotateResult(backward) {
        var si = _emojiDiv.querySelector('#sk_emoji>div.selected');
        var _items = _emojiDiv.querySelectorAll('#sk_emoji>div');
        var ci = (_items.indexOf(si) + (backward ? -1 : 1)) % _items.length;
        si.classList.remove('selected');
        _items[ci].classList.add('selected');
    }

    var _suppressKeyup = false;
    self.addEventListener('keydown', function(event) {
        // prevent this event to be handled by Surfingkeys' other listeners
        event.sk_suppressed = true;
        var realTarget = getRealEdit(event);
        if (_emojiDiv.offsetHeight > 0) {
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
                var emoji = _emojiDiv.querySelector('#sk_emoji>div.selected>span').innerHTML;
                if (realTarget.setSelectionRange !== undefined) {
                    var val = realTarget.value;
                    realTarget.value = val.substr(0, _emojiPending - 1) + emoji + val.substr(realTarget.selectionStart);
                    realTarget.setSelectionRange(_emojiPending, _emojiPending);
                } else {
                    // for contenteditable div
                    var selection = document.getSelection(), val = selection.focusNode.data;
                    selection.focusNode.data = val.substr(0, _emojiPending - 1) + emoji + val.substr(selection.focusOffset);
                    selection.setPosition(selection.focusNode, _emojiPending);
                }

                _emojiDiv.remove();
                _emojiPending = -1;
                event.sk_stopPropagation = true;
            }
        } else if (!isEditable(realTarget)) {
            self.exit();
        } else if (KeyboardUtils.keyCodes.enter === event.keyCode && realTarget.localName === "input") {
            // leave time 300ms for origin event handler of the input widget
            setTimeout(function() {
                realTarget.blur();
                self.exit();
            }, 300);
        } else if (event.sk_keyName.length) {
            Mode.handleMapKey.call(self, event, function(last) {
                // for insert mode to insert unmapped chars with preceding chars same as some mapkeys
                // such as, to insert `,m` in case of mapkey `,,` defined.
                var pw = last.getPrefixWord();
                if (pw) {
                    var elm = getRealEdit(), str = elm.value, pos = elm.selectionStart;
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
        var realTarget = getRealEdit(event);
        if (!_suppressKeyup && _emojiPending !== -1) {
            var v, ss;
            if (realTarget.selectionStart !== undefined && realTarget.value !== undefined) {
                v = realTarget.value;
                ss = realTarget.selectionStart;
            } else {
                // for contenteditable div
                var selection = document.getSelection();
                v = selection.focusNode.data;
                ss = selection.focusOffset;
            }
            if (ss < _emojiPending || v[_emojiPending - 1] !== ":") {
                _emojiDiv.remove();
            } else {
                listEmoji();
            }
        }
        _suppressKeyup = false;
    });
    self.addEventListener('focus', function(event) {
        var realTarget = getRealEdit(event);
        if (!isEditable(realTarget)) {
            self.exit();
        }
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

    var _element;
    var _enter = self.enter;
    self.enter = function(elm) {
        var changed = (_enter.call(self) === -1);
        if (_element !== elm) {
            _element = elm;
            changed = true;
        }
        if (changed && runtime.conf.cursorAtEndOfInput && elm.nodeName !== 'SELECT') {
            moveCusorEOL();
        }
    };

    return self;
})();
