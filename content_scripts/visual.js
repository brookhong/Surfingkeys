var Visual = (function() {
    var self = new Mode("Visual");

    self.addEventListener('keydown', function(event) {
        if (visualf) {
            var exitf = false;
            event.sk_stopPropagation = true;
            event.sk_suppressed = true;

            if (KeyboardUtils.isWordChar(event)) {
                visualSeek(visualf, event.sk_keyName);
                lastF = [visualf, event.sk_keyName];
                exitf = true;
            } else if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
                exitf = true;
            }

            if (exitf) {
                self.statusLine = self.name + " - " + status[state];
                Mode.showStatus();
                visualf = 0;
            }
        } else if (event.sk_keyName.length) {
            Mode.handleMapKey.call(self, event);
            if (event.sk_stopPropagation) {
                event.sk_suppressed = true;
            } else if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
                if (state > 1) {
                    self.hideCursor();
                    selection.collapse(selection.anchorNode, selection.anchorOffset);
                    self.showCursor();
                } else {
                    self.visualClear();
                    self.exit();
                }
                state--;
                _onStateChange();
                event.sk_stopPropagation = true;
                event.sk_suppressed = true;
            }
        }
    });

    self.addEventListener('click', function(event) {
        switch (selection.type) {
            case "None":
                self.hideCursor();
                state = 0;
                break;
            case "Caret":
                if (state) {
                    self.hideCursor();
                    if (state === 0) {
                        state = 1;
                    }
                    self.showCursor();
                }
                break;
            case "Range":
                if (state) {
                    self.hideCursor();
                    state = 2;
                    self.showCursor();
                }
                break;
        }
        _onStateChange();
    });

    self.mappings = new Trie();
    self.map_node = self.mappings;
    self.repeats = "";
    self.mappings.add("l", {
        annotation: "forward character",
        feature_group: 9,
        code: modifySelection
    });
    self.mappings.add("h", {
        annotation: "backward character",
        feature_group: 9,
        code: modifySelection
    });
    self.mappings.add("j", {
        annotation: "forward line",
        feature_group: 9,
        code: modifySelection
    });
    self.mappings.add("k", {
        annotation: "backward line",
        feature_group: 9,
        code: modifySelection
    });
    self.mappings.add("w", {
        annotation: "forward word",
        feature_group: 9,
        code: modifySelection
    });
    self.mappings.add("e", {
        annotation: "forward word",
        feature_group: 9,
        code: modifySelection
    });
    self.mappings.add("b", {
        annotation: "backward word",
        feature_group: 9,
        code: modifySelection
    });
    self.mappings.add(")", {
        annotation: "forward sentence",
        feature_group: 9,
        code: modifySelection
    });
    self.mappings.add("(", {
        annotation: "backward sentence",
        feature_group: 9,
        code: modifySelection
    });
    self.mappings.add("}", {
        annotation: "forward paragraphboundary",
        feature_group: 9,
        code: modifySelection
    });
    self.mappings.add("{", {
        annotation: "backward paragraphboundary",
        feature_group: 9,
        code: modifySelection
    });
    self.mappings.add("0", {
        annotation: "backward lineboundary",
        feature_group: 9,
        code: modifySelection
    });
    self.mappings.add("$", {
        annotation: "forward lineboundary",
        feature_group: 9,
        code: modifySelection
    });
    self.mappings.add("G", {
        annotation: "forward documentboundary",
        feature_group: 9,
        code: function() {
            document.scrollingElement.scrollTop = document.scrollingElement.scrollHeight;
            modifySelection();
            if (matches.length) {
                currentOccurrence = matches.length - 1;
                Front.showStatus(2, currentOccurrence + 1 + ' / ' + matches.length);
            }
        }
    });
    self.mappings.add("gg", {
        annotation: "backward documentboundary",
        feature_group: 9,
        code: function() {
            // there may be some fixed-position div for navbar on top on some pages.
            // so scrollIntoView can not send us top, as it's already in view.
            // explicitly set scrollTop 0 here.
            document.scrollingElement.scrollTop = 0;
            currentOccurrence = 0;
            if (matches.length) {
                Front.showStatus(2, currentOccurrence + 1 + ' / ' + matches.length);
            }
            modifySelection();
        }
    });

    self.mappings.add("o", {
        annotation: "Go to Other end of highlighted text",
        feature_group: 9,
        code: function() {
            self.hideCursor();
            var pos = [selection.anchorNode, selection.anchorOffset];
            selection.collapse(selection.focusNode, selection.focusOffset);
            selection.extend(pos[0], pos[1]);
            self.showCursor();
        }
    });
    var _units = {
        w: "word",
        l: "lineboundary",
        s: "sentence",
        p: "paragraphboundary"
    };
    function _selectUnit(w) {
        if (window.navigator.userAgent.indexOf("Firefox") === -1 || (w !== "p" && w !== "s")) {
            var unit = _units[w];
            // sentence and paragraphboundary not support in firefox
            // document.getSelection().modify("move", "backward", "paragraphboundary")
            // gets 0x80004001 (NS_ERROR_NOT_IMPLEMENTED)
            selection.modify("move", "backward", unit);
            selection.modify("extend", "forward", unit);
        }
    }
    var _yankFunctions = [{}, {
        annotation: "Yank a word(w) or line(l) or sentence(s) or paragraph(p)",
        feature_group: 9,
        code: function(w) {
            var pos = [selection.focusNode, selection.focusOffset];
            self.hideCursor();
            _selectUnit(w);
            Clipboard.write(selection.toString());
            selection.collapseToStart();
            selection.setPosition(pos[0], pos[1]);
            self.showCursor();
        }
    }, {
        annotation: "Copy selected text",
        feature_group: 9,
        code: function() {
            var pos = [selection.focusNode, selection.focusOffset];
            Clipboard.write(selection.toString());
            if (runtime.conf.modeAfterYank === "Caret") {
                selection.setPosition(pos[0], pos[1]);
                self.showCursor();
                state = 1;
                _onStateChange();
            } else if (runtime.conf.modeAfterYank === "Normal") {
                state = 2;
                self.toggle();
            }
        }
    }];
    self.mappings.add("*", {
        annotation: "Search word under the cursor",
        feature_group: 9,
        code: function() {
            self.star();
        }
    });
    self.mappings.add(KeyboardUtils.encodeKeystroke("<Enter>"), {
        annotation: "Click on node under cursor.",
        feature_group: 9,
        code: function() {
            Hints.dispatchMouseClick(selection.focusNode.parentNode);
        }
    });
    self.mappings.add("zz", {
        annotation: "make cursor at center of window.",
        feature_group: 9,
        code: function() {
            var offset = cursor.getBoundingClientRect().top - window.innerHeight/2;
            self.hideCursor();
            document.scrollingElement.scrollTop += offset;
            self.showCursor();
        }
    });
    self.mappings.add("f", {
        annotation: "Forward to next char.",
        feature_group: 9,
        code: function() {
            self.statusLine = self.name + " - " + status[state] + " - forward";
            Mode.showStatus();
            visualf = 1;
        }
    });
    self.mappings.add("F", {
        annotation: "Backward to next char.",
        feature_group: 9,
        code: function() {
            self.statusLine = self.name + " - " + status[state] + " - backward";
            Mode.showStatus();
            visualf = -1;
        }
    });
    self.mappings.add(";", {
        annotation: "Repeat latest f, F",
        feature_group: 9,
        code: function() {
            if (lastF) {
                visualSeek(lastF[0], lastF[1]);
            }
        }
    });
    self.mappings.add(",", {
        annotation: "Repeat latest f, F in opposite direction",
        feature_group: 9,
        code: function() {
            if (lastF) {
                visualSeek(-lastF[0], lastF[1]);
            }
        }
    });
    self.mappings.add("q", {
        annotation: "Translate word under cursor",
        feature_group: 9,
        code: function() {
            var w = Visual.getWordUnderCursor();
            readText(w);
            Front.performInlineQuery(w, function(queryResult) {
                var br = cursor.getBoundingClientRect();
                Front.showBubble({
                    left: br.left,
                    top: br.top,
                    height: br.height,
                    width: br.width
                }, queryResult, true);
            });
        }
    });

    self.mappings.add("V", {
        annotation: "Select a word(w) or line(l) or sentence(s) or paragraph(p)",
        feature_group: 9,
        code: function(w) {
            self.hideCursor();
            state = 2;
            _onStateChange();
            _selectUnit(w);
            self.showCursor();
        }
    });

    var selection = document.getSelection(),
        matches = [],
        currentOccurrence,
        state = 0,
        status = ['', 'Caret', 'Range'],
        mark_template = document.createElement("surfingkeys_mark"),
        cursor = document.createElement("div");
    cursor.className = "surfingkeys_cursor";
    cursor.style.zIndex = 2147483298;

    // f in visual mode
    var visualf = 0, lastF = null;

    function visualSeek(dir, chr) {
        self.hideCursor();
        var lastPosBeforeF = [selection.anchorNode, selection.anchorOffset];
        if (selection.focusNode
            && selection.focusNode.textContent
            && selection.focusNode.textContent.length
            && selection.focusNode.textContent[selection.focusOffset] === chr
            && dir === 1
        ) {
            // if the char after cursor is the char to find, forward one step.
            selection.setPosition(selection.focusNode, selection.focusOffset + 1);
        }
        if (findNextTextNodeBy(chr, true, (dir === -1))) {
            if (state === 1) {
                selection.setPosition(selection.focusNode, selection.focusOffset - 1);
            } else {
                var found = [selection.focusNode, selection.focusOffset - 1];
                selection.collapseToStart();
                selection.setPosition(lastPosBeforeF[0], lastPosBeforeF[1]);
                selection.extend(found[0], found[1]);
            }
        } else {
            selection.setPosition(lastPosBeforeF[0], lastPosBeforeF[1]);
        }
        self.showCursor();
    }

    function getTextNodeByY(y) {
        var node = null;
        var treeWalker = getTextNodes(document.body, /./, 0);
        while (treeWalker.nextNode()) {
            var br = treeWalker.currentNode.parentNode.getBoundingClientRect();
            if (br.top > window.innerHeight * y) {
                node = treeWalker.currentNode;
                break;
            }
        }
        return node;
    }

    function getNearestWord(text, offset) {
        var ret = text;
        var nonWord = /\W/;
        if (offset < 0) {
            offset = 0;
        } else if (offset >= text.length) {
            offset = text.length - 1;
        }
        var found = true;
        if (nonWord.test(text[offset])) {
            var delta = 0;
            found = false;
            while (!found && (offset > delta || (offset + delta) < text.length)) {
                delta++;
                found = ((offset - delta) >= 0 && !nonWord.test(text[offset - delta])) || ((offset + delta) < text.length && !nonWord.test(text[offset + delta]));
            }
            offset = ((offset - delta) >= 0 && !nonWord.test(text[offset - delta])) ? (offset - delta) : (offset + delta);
        }
        if (found) {
            var start = offset,
                end = offset;
            while (start >= 0 && !nonWord.test(text[start])) {
                start--;
            }
            while (end < text.length && !nonWord.test(text[end])) {
                end++;
            }
            ret = text.substr(start + 1, end - start - 1);
        }
        return ret;
    }

    self.hideCursor = function () {
        if (document.body.contains(cursor)) {
            cursor.remove();
            document.dispatchEvent(new CustomEvent('surfingkeys:cursorHidden'));
        }
    };

    var _focusedRange = document.createRange();
    function getTextRect() {
        _focusedRange.setStart(arguments[0], arguments[1]);
        if (arguments.length > 3) {
            _focusedRange.setEnd(arguments[2], arguments[3]);
        } else {
            _focusedRange.setEnd(arguments[0], arguments[1]);
        }
        return _focusedRange.getBoundingClientRect();
    }

    self.showCursor = function () {
        if (selection.focusNode && (selection.focusNode.offsetHeight > 0 || selection.focusNode.parentNode.offsetHeight > 0)) {
            // https://developer.mozilla.org/en-US/docs/Web/API/Selection
            // If focusNode is a text node, this is the number of characters within focusNode preceding the focus. If focusNode is an element, this is the number of child nodes of the focusNode preceding the focus.
            scrollIntoViewIfNeeded(selection.focusNode.parentElement, true);

            var r = getTextRect(selection.focusNode, selection.focusOffset);
            cursor.style.position = "fixed";
            cursor.style.left = r.left + 'px';
            if (r.left < 0 || r.left >= window.innerWidth) {
                document.scrollingElement.scrollLeft += r.left - window.innerWidth / 2;
                cursor.style.left = window.innerWidth / 2 + 'px';
            } else {
                cursor.style.left = r.left + 'px';
            }
            if (r.top < 0 || r.top >= window.innerHeight) {
                document.scrollingElement.scrollTop += r.top - window.innerHeight / 2;
                cursor.style.top = window.innerHeight / 2 + 'px';
            } else {
                cursor.style.top = r.top + 'px';
            }
            cursor.style.height = r.height + 'px';
            cursor.style.width = r.width + 'px';

            document.body.appendChild(cursor);
        }
    };
    self.getCursorPixelPos = function () {
        return cursor.getBoundingClientRect();
    };

    function select(found) {
        self.hideCursor();
        if (selection.anchorNode && state === 2) {
            selection.extend(found[0], found[1]);
        } else {
            selection.setPosition(found[0], found[1]);
        }
        self.showCursor();
    }

    function modifySelection() {
        var sel = self.map_node.meta.annotation.split(" ");
        var alter = (state === 2) ? "extend" : "move";
        self.hideCursor();
        var prevPos = [selection.focusNode, selection.focusOffset];
        selection.modify(alter, sel[0], sel[1]);

        if (prevPos[0] === selection.focusNode && prevPos[1] === selection.focusOffset) {
            selection.modify(alter, sel[0], "word");
        }
        self.showCursor();
    }

    var holder = document.createElement("div");
    function createMatchMark(node1, offset1, node2, offset2) {
        var r = getTextRect(node1, offset1, node2, offset2);
        if (r.width > 0 && r.height > 0) {
            var mark = mark_template.cloneNode(false);
            mark.style.position = "absolute";
            mark.style.zIndex = 2147483298;
            mark.style.left = document.scrollingElement.scrollLeft + r.left + 'px';
            mark.style.top = document.scrollingElement.scrollTop + r.top + 'px';
            mark.style.width = r.width + 'px';
            mark.style.height = r.height + 'px';
            holder.appendChild(mark);
            if (!document.body.contains(holder)) {
                document.body.appendChild(holder);
            }

            matches.push([node1, offset1, mark]);
        }
    }

    function highlight(pattern) {
        getTextNodes(document.body, pattern).forEach(function(node) {
            var mtches;
            while ((mtches = pattern.exec(node.data)) !== null) {
                var match = mtches[0];
                if (match.length) {
                    var pos = pattern.lastIndex - match.length;
                    createMatchMark(node, pos, node, pos + match.length);
                } else {
                    // matches like \b
                    break;
                }
            }
        });
        if (matches.length === 0) {
            // find across nodes with window.find if no found within each node.
            selection.setPosition(null, 0);
            while (findNextTextNodeBy(pattern.source, runtime.conf.caseSensitive, false)) {
                if (selection.anchorNode !== selection.focusNode) {
                    createMatchMark(selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset);
                }
            }
        }
        if (matches.length) {
            currentOccurrence = 0;
            Front.showStatus(2, currentOccurrence + 1 + ' / ' + matches.length);
        }
    }

    self.visualClear = function() {
        self.hideCursor();
        matches = [];
        registeredScrollNodes.forEach(function(n) {
            n.onscroll = null;
        });
        registeredScrollNodes = [];
        setInnerHTML(holder, "");
        holder.remove();
        Front.showStatus(2, '');
    };

    function onCursorHiden() {
        Front.hideBubble();
    }

    self.onEnter = function() {
        document.addEventListener('surfingkeys:cursorHidden', onCursorHiden);
        _incState();
    };

    var _lastPos = null;
    self.onExit = function() {
        document.removeEventListener('surfingkeys:cursorHidden', onCursorHiden);
        _lastPos = [selection.anchorNode, selection.anchorOffset];
    };

    function _onStateChange() {
        self.mappings.add("y", _yankFunctions[state]);
        self.statusLine = self.name + " - " + status[state];
        Mode.showStatus();
    }
    function _incState() {
        state = (state + 1) % 3;
        _onStateChange();
    }
    self.restore = function() {
        if (_lastPos) {
            selection.setPosition(_lastPos[0], _lastPos[1]);
            self.showCursor();
            self.enter();
        }
    };
    self.toggle = function(ex) {
        switch (state) {
            case 1:
                selection.extend(selection.anchorNode, selection.anchorOffset);
                _incState();
                break;
            case 2:
                self.hideCursor();
                selection.collapse(selection.focusNode, selection.focusOffset);
                self.exit();
                _incState();
                break;
            default:
                if (ex === "ym") {
                    var textToYank = [];
                    Hints.create(/./, function(element) {
                        textToYank.push(element[0].data.trim());
                        Clipboard.write(textToYank.join('\n'));
                    }, {multipleHits: true});
                } else {
                    Hints.create(/./, function(element) {
                        if (ex === "y") {
                            Clipboard.write(element[0].data.trim());
                        } else {
                            setTimeout(function() {
                                selection.setPosition(element[0], element[1]);
                                self.enter();
                                if (ex === "z") {
                                    selection.extend(element[0], element[0].data.length);
                                    _incState();
                                }
                                self.showCursor();
                            }, 0);
                        }
                    });
                }
                break;
        }
    };

    self.star = function() {
        if (selection.focusNode && selection.focusNode.nodeValue) {
            var query = self.getWordUnderCursor();
            if (query.length) {
                self.hideCursor();
                var pos = [selection.focusNode, selection.focusOffset];
                runtime.updateHistory('find', query);
                self.visualClear();
                highlight(new RegExp(query, "g" + (runtime.conf.caseSensitive ? "" : "i")));
                selection.setPosition(pos[0], pos[1]);
                self.showCursor();
            }
        }
    };

    self.getWordUnderCursor = function() {
        var word = selection.toString();
        if (word.length === 0 && selection.focusNode) {
            var pe = selection.focusNode;
            word = getNearestWord(pe.textContent, selection.focusOffset);
        }
        return word;
    };

    self.next = function(backward) {
        if (matches.length) {
            // need enter visual mode again when modeAfterYank is set to Normal / Caret.
            if (state === 0) {
                self.enter();
            }
            currentOccurrence = (backward ? (matches.length + currentOccurrence - 1) : (currentOccurrence + 1)) % matches.length;
            select(matches[currentOccurrence]);
            Front.showStatus(2, currentOccurrence + 1 + ' / ' + matches.length);
        } else if (runtime.conf.lastQuery) {
            highlight(new RegExp(runtime.conf.lastQuery, "g" + (runtime.conf.caseSensitive ? "" : "i")));
            self.visualEnter(runtime.conf.lastQuery);
        }
    };

    self.feedkeys = function(keys) {
        setTimeout(function() {
            var evt = new Event("keydown");
            for (var i = 0; i < keys.length; i ++) {
                evt.sk_keyName = keys[i];
                Mode.handleMapKey.call(self, evt);
            }
        }, 1);
    };

    function findNextTextNodeBy(query, caseSensitive, backwards) {
        var found = false;
        // window.find sometimes does not move selection forward
        var firstNode = null;
        while (window.find(query, caseSensitive, backwards)) {
            if (selection.anchorNode.splitText) {
                found = true;
                break;
            } else if (firstNode === null) {
                firstNode = selection.anchorNode;
            } else if (firstNode === selection.anchorNode) {
                break;
            }
        }
        return found;
    }
    self.visualUpdateForContentWindow = function(query) {
        self.visualClear();

        // set caret to top in view
        selection.setPosition(getTextNodeByY(0), 0);

        var scrollTop = document.scrollingElement.scrollTop,
            posToStartFind = [selection.anchorNode, selection.anchorOffset];

        if (findNextTextNodeBy(query, runtime.conf.caseSensitive, false)) {
            selection.setPosition(posToStartFind[0], posToStartFind[1]);
        } else {
            // start from beginning if no found from current position
            selection.setPosition(document.body.firstChild, 0);
        }

        if (findNextTextNodeBy(query, runtime.conf.caseSensitive, false)) {
            if (document.scrollingElement.scrollTop !== scrollTop) {
                // set new start position if there is no occurrence in current view.
                scrollTop = document.scrollingElement.scrollTop;
                posToStartFind = [selection.anchorNode, selection.anchorOffset];
            }
            createMatchMark(selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset);

            while (document.scrollingElement.scrollTop === scrollTop && findNextTextNodeBy(query, runtime.conf.caseSensitive, false)) {
                createMatchMark(selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset);
            }
            document.scrollingElement.scrollTop = scrollTop;
            selection.setPosition(posToStartFind[0], posToStartFind[1]);
        }

    };

    // this is only for finding in frontend.html, like in usage popover.
    self.visualUpdate = function(query) {
        self.visualClear();
        highlight(new RegExp(query, "g" + (runtime.conf.caseSensitive ? "" : "i")));
    };

    var registeredScrollNodes = [];
    self.visualEnter = function (query) {
        self.visualClear();
        highlight(new RegExp(query, "g" + (runtime.conf.caseSensitive ? "" : "i")));
        if (matches.length) {
            self.enter();
            select(matches[currentOccurrence]);
        } else {
            Front.showStatus(2, "Pattern not found: {0}".format(query), 1000);
        }
        Normal.getScrollableElements().forEach(function(n) {
            if (n !== document.scrollingElement) {
                n.onscroll = function() {
                    matches.forEach(function(m) {
                        var r = getTextRect(m[0], m[1]);
                        m[2].style.left = document.scrollingElement.scrollLeft + r.left + 'px';
                        m[2].style.top = document.scrollingElement.scrollTop + r.top + 'px';
                    });
                };
                registeredScrollNodes.push(n);
            }
        });
    };

    self.findSentenceOf = function (query) {
        var wr = new RegExp("\\b" + query + "\\b");
        var elements = getVisibleElements(function(e, v) {
            if (wr.test(e.innerText)) {
                v.push(e);
            }
        });
        elements = filterAncestors(elements);

        var sentence = "";
        actionWithSelectionPreserved(function(selection) {
            selection.setPosition(elements[0], 0);
            if (window.find(query, false, false, true, true)) {
                _selectUnit("s");
                sentence = selection.toString();
            }
        });
        return sentence;
    };

    var _style = {};
    self.style = function (element, style) {
        _style[element] = style;

        cursor.setAttribute('style', _style.cursor || '');
        mark_template.setAttribute('style', _style.marks || '');
    };
    return self;
})();
