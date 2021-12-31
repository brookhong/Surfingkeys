import Trie from './trie';
import { dispatchSKEvent, runtime } from './runtime.js';
import Mode from './mode';
import KeyboardUtils from './keyboardUtils';
import {
    actionWithSelectionPreserved,
    dispatchMouseEvent,
    filterAncestors,
    flashPressedLink,
    getBrowserName,
    getTextNodes,
    getTextRect,
    getVisibleElements,
    getWordUnderCursor,
    scrollIntoViewIfNeeded,
    setSanitizedContent,
    tabOpenLink,
} from './utils.js';

function createVisual(clipboard, hints) {
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

    self.addEventListener('resize', function(event) {
        self.visualUpdate(runtime.conf.lastQuery);
        select(matches[currentOccurrence]);
    });
    let selectionMark_ = null;
    const clearSelectionMark = () => {
        if (selectionMark_) {
            selectionMark_.forEach((m) => {
                m.remove();
            });
        }
    };
    self.addEventListener('selectionchange', function(event) {
        clearSelectionMark();
        selectionMark_ = createSelectionMark(selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset);
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
            if (getBrowserName() !== "Firefox") {
                modifySelection();
            } else {
                self.hideCursor();
                selection.setPosition(document.body.lastChild, 0);
                self.showCursor();
            }
            if (matches.length) {
                currentOccurrence = matches.length - 1;
                dispatchSKEvent('showStatus', [2, currentOccurrence + 1 + ' / ' + matches.length]);
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
                dispatchSKEvent('showStatus', [2, currentOccurrence + 1 + ' / ' + matches.length]);
            }

            if (getBrowserName() !== "Firefox") {
                modifySelection();
            } else {
                self.hideCursor();
                selection.setPosition(document.body.firstChild, 0);
                self.showCursor();
            }
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
        if (getBrowserName() !== "Firefox" || (w !== "p" && w !== "s")) {
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
            clipboard.write(selection.toString());
            selection.collapseToStart();
            selection.setPosition(pos[0], pos[1]);
            self.showCursor();
        }
    }, {
        annotation: "Copy selected text",
        feature_group: 9,
        code: function() {
            var pos = [selection.focusNode, selection.focusOffset];
            clipboard.write(selection.toString());
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
    function clickLink(element, shiftKey) {
        flashPressedLink(element);
        dispatchMouseEvent(element, ['click'], shiftKey);
    }
    self.mappings.add(KeyboardUtils.encodeKeystroke("<Enter>"), {
        annotation: "Click on node under cursor.",
        feature_group: 9,
        code: function() {
            clickLink(selection.focusNode.parentNode, false);
        }
    });
    self.mappings.add(KeyboardUtils.encodeKeystroke("<Shift-Enter>"), {
        annotation: "Click on node under cursor.",
        feature_group: 9,
        code: function() {
            clickLink(selection.focusNode.parentNode, true);
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

    self.mappings.add("p", {
        annotation: "Expand selection to parent element",
        feature_group: 9,
        code: function() {
            var p = selection.focusNode;
            while (p !== document.body) {
                p = p.parentElement;
                var textNodes = getTextNodes(p, /./);
                var lastNode = textNodes[textNodes.length-1];
                var range = selection.getRangeAt(0);
                if (range.comparePoint(textNodes[0], 0) === -1
                    || range.comparePoint(lastNode, lastNode.length) === 1) {
                    self.hideCursor();
                    state = 2;
                    _onStateChange();
                    selection.setBaseAndExtent(textNodes[0], 0, lastNode, lastNode.length);
                    self.showCursor();
                    break;
                }
            }
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
        mark_template = document.createElement("div"),
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

    self.hideCursor = function () {
        if (document.body.contains(cursor)) {
            cursor.remove();
            dispatchSKEvent('cursorHidden');
        }
    };

    self.showCursor = function () {
        if (selection.focusNode && (selection.focusNode.offsetHeight > 0 || selection.focusNode.parentNode.offsetHeight > 0)) {
            // https://developer.mozilla.org/en-US/docs/Web/API/Selection
            // If focusNode is a text node, this is the number of characters within focusNode preceding the focus. If focusNode is an element, this is the number of child nodes of the focusNode preceding the focus.
            scrollIntoViewIfNeeded(selection.focusNode.parentElement, true);

            var r = getTextRect(selection.focusNode, selection.focusOffset)[0];
            if (!r) {
                r = selection.focusNode.getBoundingClientRect();
            }
            if (r) {
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
            }

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
    function createSelectionMark(node1, offset1, node2, offset2) {
        return Array.from(getTextRect(node1, offset1, node2, offset2)).map((r) => {
            if (r.width > 0 && r.height > 0) {
                var mark = mark_template.cloneNode(false);
                mark.className = "surfingkeys_selection_mark";
                mark.style.position = "absolute";
                mark.style.zIndex = 2147483298;
                mark.style.left = document.scrollingElement.scrollLeft + r.left + 'px';
                mark.style.top = document.scrollingElement.scrollTop + r.top + 'px';
                mark.style.width = r.width + 'px';
                mark.style.height = r.height + 'px';
                holder.appendChild(mark);
                if (!document.documentElement.contains(holder)) {
                    document.documentElement.prepend(holder);
                }
                return mark;
            }
            return null;
        }).filter((m) => m !== null);
    }
    function createMatchMark(node1, offset1, node2, offset2) {
        const marks = createSelectionMark(node1, offset1, node2, offset2);

        if (marks.length) {
            marks.forEach((m) => {
                m.className = "surfingkeys_match_mark";
            });
            matches.push([node1, offset1, marks]);
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
        var scrollTop = document.scrollingElement.scrollTop;
        selection.setPosition(null, 0);
        while (findNextTextNodeBy(pattern.source, pattern.flags.indexOf('i') === -1, false)) {
            if (selection.anchorNode !== selection.focusNode) {
                createMatchMark(selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset);
            }
        }
        document.scrollingElement.scrollTop = scrollTop;
        if (matches.length) {
            currentOccurrence = 0;
            for (var i = 0; i < matches.length; i++) {
                var br = matches[i][2][0].getBoundingClientRect();
                if (br.top > 0) {
                    currentOccurrence = i;
                    break;
                }
            }
            dispatchSKEvent('showStatus', [2, currentOccurrence + 1 + ' / ' + matches.length]);
        }
    }

    self.visualClear = function() {
        clearSelectionMark();
        self.hideCursor();
        matches = [];
        registeredScrollNodes.forEach(function(n) {
            n.onscroll = null;
        });
        registeredScrollNodes = [];
        setSanitizedContent(holder, "");
        holder.remove();
        dispatchSKEvent('showStatus', [2, '']);
    };

    self.emptySelection = function() {
        document.getSelection().empty();
    };

    function onCursorHiden() {
        dispatchSKEvent('hideBubble');
    }

    self.onEnter = function() {
        document.addEventListener('surfingkeys:cursorHidden', onCursorHiden);
        _incState();
    };

    self.onExit = function() {
        self.visualClear();
        document.removeEventListener('surfingkeys:cursorHidden', onCursorHiden);
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
        if (selection && selection.anchorNode) {
            selection.setPosition(selection.anchorNode, selection.anchorOffset);
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
                hints.create(runtime.conf.textAnchorPat, function (element) {
                    setTimeout(function () {
                        selection.setPosition(element[0], element[1]);
                        self.enter();
                        if (ex === "z") {
                            selection.extend(element[0], element[1] + element[2].length);
                            _incState();
                        }
                        self.showCursor();
                    }, 0);
                });
                break;
        }
    };

    self.star = function() {
        if (selection.focusNode && selection.focusNode.nodeValue) {
            var query = getWordUnderCursor();
            if (query.length && query !== ".") {
                self.hideCursor();
                var pos = [selection.focusNode, selection.focusOffset];
                runtime.updateHistory('find', query);
                self.visualClear();
                highlight(new RegExp(query, "g" + (runtime.getCaseSensitive(query) ? "" : "i")));
                selection.setPosition(pos[0], pos[1]);
                self.showCursor();
            }
        }
    };

    self.next = function(backward) {
        if (matches.length) {
            // need enter visual mode again when modeAfterYank is set to Normal / Caret.
            if (state === 0) {
                self.enter();
            }
            currentOccurrence = (backward ? (matches.length + currentOccurrence - 1) : (currentOccurrence + 1)) % matches.length;
            select(matches[currentOccurrence]);
            dispatchSKEvent('showStatus', [2, currentOccurrence + 1 + ' / ' + matches.length]);
        } else if (runtime.conf.lastQuery) {
            highlight(new RegExp(runtime.conf.lastQuery, "g" + (runtime.getCaseSensitive(runtime.conf.lastQuery) ? "" : "i")));
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

        var caseSensitive = runtime.getCaseSensitive(query);
        if (findNextTextNodeBy(query, caseSensitive, false)) {
            selection.setPosition(posToStartFind[0], posToStartFind[1]);
        } else {
            // start from beginning if no found from current position
            selection.setPosition(document.body.firstChild, 0);
        }

        if (findNextTextNodeBy(query, caseSensitive, false)) {
            if (document.scrollingElement.scrollTop !== scrollTop) {
                // set new start position if there is no occurrence in current view.
                scrollTop = document.scrollingElement.scrollTop;
                posToStartFind = [selection.anchorNode, selection.anchorOffset];
            }
            createMatchMark(selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset);

            while (document.scrollingElement.scrollTop === scrollTop && findNextTextNodeBy(query, caseSensitive, false)) {
                createMatchMark(selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset);
            }
            document.scrollingElement.scrollTop = scrollTop;
            selection.setPosition(posToStartFind[0], posToStartFind[1]);
        }

    };

    // this is only for finding in frontend.html, like in usage popover.
    self.visualUpdate = function(query) {
        if (query.length && query !== ".") {
            self.visualClear();
            highlight(new RegExp(query, "g" + (runtime.getCaseSensitive(query) ? "" : "i")));
        }
    };

    var registeredScrollNodes = [];
    self.visualEnter = function (query) {
        if (query.length === 0 || query === ".") {
            return;
        }
        self.visualClear();
        highlight(new RegExp(query, "g" + (runtime.getCaseSensitive(query) ? "" : "i")));
        if (matches.length) {
            self.enter();
            select(matches[currentOccurrence]);
        } else {
            dispatchSKEvent('showStatus', [2, "Pattern not found: {0}".format(query), 1000]);
        }
        Mode.getScrollableElements().forEach(function(n) {
            if (n !== document.scrollingElement) {
                n.onscroll = function() {
                    matches.forEach(function(m) {
                        var r = getTextRect(m[0], m[1])[0];
                        m[2].forEach((mi) => {
                            mi.style.left = document.scrollingElement.scrollLeft + r.left + 'px';
                            mi.style.top = document.scrollingElement.scrollTop + r.top + 'px';
                        });
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
    /**
     * Set styles for visual mode.
     *
     * @param {string} element element in visual mode, which can be `marks` and `cursor`.
     * @param {string} style css style
     * @name Visual.style
     *
     * @example
     * Visual.style('marks', 'background-color: #89a1e2;');
     * Visual.style('cursor', 'background-color: #9065b7;');
     */
    self.style = function (element, style) {
        _style[element] = style;

        cursor.setAttribute('style', _style.cursor || '');
        mark_template.setAttribute('style', _style.marks || '');
    };
    return self;
}

export default createVisual;
