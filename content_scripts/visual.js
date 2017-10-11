var Visual = (function(mode) {
    var self = $.extend({
        name: "Visual",
        eventListeners: {},
        statusLine: "Visual"
    }, mode);

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
            Normal._handleMapKey.call(self, event);
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

    function reconstructSelectionAfterCursorPlaced() {
        var pos = [selection.anchorOffset, selection.focusOffset];
        self.showCursor();
        selection.collapseToStart();
        selection.setPosition(cursor.nextSibling, pos[0] - pos[1] - 1);
        selection.extend(cursor.previousSibling, cursor.previousSibling.data.length);
    }

    self.mappings.add("o", {
        annotation: "forward documentboundary",
        feature_group: 9,
        code: function() {
            self.hideCursor();
            var pos = [selection.anchorNode, selection.anchorOffset];
            selection.collapse(selection.focusNode, selection.focusOffset);
            selection.extend(pos[0], pos[1]);
            if (selection.anchorNode === selection.focusNode && selection.anchorOffset > selection.focusOffset) {
                // need to re-construct selection after curosr placed, as cursor breaks selection in this case.
                reconstructSelectionAfterCursorPlaced();
            } else {
                self.showCursor();
            }
        }
    });
    var _units = {
        w: "word",
        l: "lineboundary",
        s: "sentence",
        p: "paragraphboundary"
    };
    function _selectUnit(w) {
        var unit = _units[w];
        var pos = [selection.focusNode, selection.focusOffset];
        selection.modify("move", "forward", unit);
        if (selection.focusNode !== pos[0]) {
            selection.setPosition(pos[0], pos[1]);
        }
        selection.modify("move", "backward", unit);
        if (selection.focusNode !== pos[0]) {
            selection.setPosition(pos[0], pos[1]);
        }
        selection.modify("extend", "forward", unit);
    }
    var _yankFunctions = [{}, {
        annotation: "Yank a word(w) or line(l) or sentence(s) or paragraph(p)",
        feature_group: 9,
        code: function(w) {
            var pos = [selection.focusNode, selection.focusOffset];
            self.hideCursor();
            _selectUnit(w);
            Front.writeClipboard(selection.toString());
            selection.collapseToStart();
            selection.setPosition(pos[0], pos[1]);
            self.showCursor();
        }
    }, {
        annotation: "Copy selected text",
        feature_group: 9,
        code: function() {
            var pos = [selection.focusNode, selection.focusOffset];
            Front.writeClipboard(selection.toString());
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
    self.mappings.add(encodeKeystroke("<Enter>"), {
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
            document.scrollingElement.scrollTop += cursor.getBoundingClientRect().top - window.innerHeight/2;
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
            httpRequest({
                url: _translationUrl + w
            }, function(res) {
                var pos = Visual.getCursorPos();
                Front.showBubble(pos, _parseTranslation(res));
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

    var _translationUrl, _parseTranslation;
    self.setTranslationService = function(url, cb) {
        _translationUrl = url;
        _parseTranslation = cb;
    };

    var selection = document.getSelection(),
        matches = [],
        currentOccurrence,
        state = 0,
        status = ['', 'Caret', 'Range'],
        mark_template = $('<surfingkeys_mark>')[0],
        cursor = $('<div class="surfingkeys_cursor"></div>')[0];

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
            if ($(treeWalker.currentNode.parentNode).offset().top > (document.scrollingElement.scrollTop + window.innerHeight * y)) {
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
        var lastPos = cursor.parentNode;
        if (lastPos) {
            lastPos.insertBefore(document.createTextNode(cursor.textContent), cursor);
            cursor.textContent = "";
            cursor.remove();
            lastPos.normalize();
            $(document).trigger("surfingkeys:cursorHidden");
        }
        return lastPos;
    };

    self.showCursor = function () {
        if (selection.focusNode && ($(selection.focusNode).is(':visible') || $(selection.focusNode.parentNode).is(':visible'))) {
            // https://developer.mozilla.org/en-US/docs/Web/API/Selection
            // If focusNode is a text node, this is the number of characters within focusNode preceding the focus. If focusNode is an element, this is the number of child nodes of the focusNode preceding the focus.
            var ch = "";
            if (selection.focusNode.nodeType === Node.TEXT_NODE) {
                var node = selection.focusNode;
                ch = node.textContent[selection.focusOffset];
                if (/^[\s\n]+$/.test(ch)) {
                    ch = "";
                }
                var pos = node.splitText(selection.focusOffset);
                node.parentNode.insertBefore(cursor, pos);
                if (ch !== "") {
                    pos.data = pos.data.substr(1);
                }
            } else {
                selection.focusNode.insertBefore(cursor, selection.focusNode.childNodes[selection.focusOffset]);
            }
            cursor.style.display = 'initial';
            var cr = cursor.getBoundingClientRect();
            if (cr.width === 0 || cr.height === 0) {
                cursor.style.display = 'inline-block';
            }

            // set content of cursor to enable scrollIntoViewIfNeeded
            $(cursor).html(ch);
            cursor.scrollIntoViewIfNeeded();
        }
    };
    self.getCursorPixelPos = function () {
        return cursor.getBoundingClientRect();
    };


    function select(found) {
        self.hideCursor();
        if (selection.anchorNode && state === 2) {
            selection.extend(found.firstChild, 0);
        } else {
            selection.setPosition(found.firstChild, 0);
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
        if (selection.anchorNode === selection.focusNode && selection.anchorOffset > selection.focusOffset) {
            // need to re-construct selection after curosr placed, as cursor breaks selection in this case.
            reconstructSelectionAfterCursorPlaced();
        } else {
            self.showCursor();
        }
    }

    function createMatchMark(node, pos, len) {
        var mark = mark_template.cloneNode(false);
        var found = node.splitText(pos);
        found.splitText(len);
        mark.appendChild(found.cloneNode(true));
        found.parentNode.replaceChild(mark, found);
        return mark;
    }

    function highlight(pattern) {
        getTextNodes(document.body, pattern).forEach(function(node) {
            var mtches;
            while ((mtches = pattern.exec(node.data)) !== null) {
                var match = mtches[0];
                if (match.length) {
                    var mark = createMatchMark(node, pattern.lastIndex - match.length, match.length);
                    matches.push(mark);

                    node = mark.nextSibling;
                    // node changed, reset pattern.lastIndex
                    pattern.lastIndex = 0;
                } else {
                    // matches like \b
                    break;
                }
            }
        });
        document.body.normalize();
        if (matches.length) {
            currentOccurrence = 0;
            for (var i = 0; i < matches.length; i++) {
                var br = matches[i].getBoundingClientRect();
                if (br.top > 0 && br.left > 0) {
                    currentOccurrence = i;
                    Front.showStatus(2, currentOccurrence + 1 + ' / ' + matches.length);
                    break;
                }
            }
        }
    }

    self.visualClear = function() {
        self.hideCursor();
        var nodes = matches;
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].parentNode) {
                nodes[i].parentNode.innerHTML = nodes[i].parentNode.innerHTML.replace(/<surfingkeys_mark[^>]*>([^<]+)<\/surfingkeys_mark>/gi, '$1');
            }
        }
        matches = [];
        Front.showStatus(2, '');
    };

    function onCursorHiden() {
        Front.hideBubble();
    }

    self.enter = function() {
        mode.enter.apply(self, arguments);
        $(document).on('surfingkeys:cursorHidden', onCursorHiden);
        _incState();
    };

    var _lastPos = null;
    self.exit = function() {
        $(document).off('surfingkeys:cursorHidden', onCursorHiden);
        _lastPos = [selection.anchorNode, selection.anchorOffset];
        mode.exit.apply(self, arguments);
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
                        Front.writeClipboard(textToYank.join('\n'));
                    }, {multipleHits: true});
                } else {
                    Hints.create(/./, function(element) {
                        if (ex === "y") {
                            Front.writeClipboard(element[0].data.trim());
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
        if (word.length === 0 && cursor.parentElement) {
            var pe = cursor.parentElement;
            if (pe.tagName === "SURFINGKEYS_MARK") {
                pe = pe.parentElement;
            }
            var ch = cursor.innerText;
            cursor.innerText = "🇿";
            var pos = pe.innerText.indexOf(cursor.innerText);
            cursor.innerText = ch;
            word = getNearestWord(pe.innerText, pos);
        }
        return word;
    };

    self.getCursorPos = function() {
        var br = cursor.getBoundingClientRect();
        return {
            left: br.left,
            top: br.top,
            height: br.height,
            width: br.width
        };
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
                Normal._handleMapKey.call(self, evt);
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
            var mark = createMatchMark(selection.anchorNode, selection.anchorOffset, query.length);
            matches.push(mark);
            selection.setPosition(mark.nextSibling, 0);

            while (document.scrollingElement.scrollTop === scrollTop && findNextTextNodeBy(query, runtime.conf.caseSensitive, false)) {
                var mark = createMatchMark(selection.anchorNode, selection.anchorOffset, query.length);
                matches.push(mark);
                selection.setPosition(mark.nextSibling, 0);
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

    self.visualEnter = function (query) {
        self.visualClear();
        highlight(new RegExp(query, "g" + (runtime.conf.caseSensitive ? "" : "i")));
        if (matches.length) {
            self.enter();
            select(matches[currentOccurrence]);
        } else {
            Front.showStatus(2, "Pattern not found: {0}".format(query), 1000);
        }
    };

    var _style = {};
    self.style = function (element, style) {
        _style[element] = style;

        cursor.setAttribute('style', _style.cursor || '');
        mark_template.setAttribute('style', _style.marks || '');
    };
    return self;
})(Mode);
