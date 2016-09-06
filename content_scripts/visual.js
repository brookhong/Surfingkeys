var Visual = (function(mode) {
    var self = $.extend({name: "Visual", eventListeners: {}, _style: {}}, mode);

    self.addEventListener('keydown', function(event) {
        var updated = "";
        if (event.sk_keyName === Mode.specialKeys["<Esc>"]) {
            if (state > 1) {
                cursor.remove();
                selection.collapse(selection.anchorNode, selection.anchorOffset);
                showCursor();
            } else {
                self.visualClear();
                self.exit();
            }
            state--;
            Front.showStatus(2, status[state]);
            updated = "stopEventPropagation";
        } else if (event.sk_keyName.length) {
            updated = Normal._handleMapKey.call(self, event.sk_keyName);
        }
        return updated;
    });

    self.addEventListener('click', function(event) {
        switch (selection.type) {
            case "None":
                hideCursor();
                state = 0;
                break;
            case "Caret":
                if (state) {
                    hideCursor();
                    if (state === 0) {
                        state = 1;
                    }
                    showCursor();
                }
                break;
            case "Range":
                if (state) {
                    hideCursor();
                    state = 2;
                    showCursor();
                }
                break;
        }
        Front.showStatus(2, status[state]);
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
        annotation: "forward paragraph",
        feature_group: 9,
        code: modifySelection
    });
    self.mappings.add("{", {
        annotation: "backward paragraph",
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
        code: modifySelection
    });
    self.mappings.add("gg", {
        annotation: "backward documentboundary",
        feature_group: 9,
        code: modifySelection
    });
    self.mappings.add("y", {
        annotation: "Copy selected text",
        feature_group: 9,
        code: function() {
            var pos = [selection.anchorNode, selection.anchorOffset];
            Front.writeClipboard(selection.toString());
            if (runtime.conf.afterYank === 1) {
                selection.setPosition(pos[0], pos[1]);
                showCursor();
            }
        }
    });
    self.mappings.add("*", {
        annotation: "Search word under the cursor",
        feature_group: 9,
        code: function() {
            self.star();
        }
    });
    self.mappings.add("<Enter>", {
        annotation: "Click on node under cursor.",
        feature_group: 9,
        code: function() {
            Hints.dispatchMouseClick(selection.focusNode.parentNode);
        }
    });

    var selection = document.getSelection(),
        caseSensitive = false,
        matches = [],
        currentOccurrence,
        state = 0,
        status = ['', 'Caret', 'Range'],
        mark_template = $('<surfingkeys_mark>')[0],
        cursor = $('<div class="surfingkeys_cursor"></div>')[0];

    function getStartPos() {
        var node = null,
            offset = 0;
        if (selection.anchorNode && selection.anchorNode.parentNode && selection.anchorNode.parentNode.className !== "surfingkeys_cursor") {
            var top = $(selection.anchorNode.parentNode).offset().top;
            if (top > document.body.scrollTop && top < document.body.scrollTop + window.innerHeight) {
                node = selection.anchorNode;
                offset = selection.anchorOffset;
            }
        }
        if (!node) {
            var nodes = getTextNodes(document.body, /./);
            var anodes = nodes.filter(function(i) {
                return ($(i.parentNode).offset().top > (document.body.scrollTop + window.innerHeight / 3));
            });
            node = (anodes.length) ? anodes[0] : nodes[0];
        }
        return [node, offset];
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
            offset = ((offset + delta) < text.length && !nonWord.test(text[offset + delta])) ? (offset + delta) : (offset - delta);
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

    function hideCursor() {
        var lastPos = cursor.parentNode;
        cursor.remove();
        if (lastPos) {
            lastPos.normalize();
        }
        return lastPos;
    }

    function showCursor() {
        var ret = false;
        if ($(selection.focusNode).is(':visible') || $(selection.focusNode.parentNode).is(':visible')) {
            // https://developer.mozilla.org/en-US/docs/Web/API/Selection
            // If focusNode is a text node, this is the number of characters within focusNode preceding the focus. If focusNode is an element, this is the number of child nodes of the focusNode preceding the focus.
            if (selection.focusNode.nodeType === Node.TEXT_NODE) {
                var node = selection.focusNode;
                var pos = node.splitText(selection.focusOffset);
                node.parentNode.insertBefore(cursor, pos);
            } else {
                selection.focusNode.insertBefore(cursor, selection.focusNode.childNodes[selection.focusOffset]);
            }
            cursor.style.display = 'initial';
            var cr = cursor.getBoundingClientRect();
            if (cr.width === 0 || cr.height === 0) {
                cursor.style.display = 'inline-block';
            }
        }
        return ret;
    }

    function select(found) {
        hideCursor();
        if (selection.anchorNode && state === 2) {
            selection.extend(found.firstChild, 0);
        } else {
            selection.setPosition(found.firstChild, 0);
        }
        showCursor();
        scrollIntoView();
    }

    function getTextNodes(root, pattern) {
        var skip_tags = ['script', 'style', 'noscript', 'surfingkeys_mark'];
        var nodeIterator = document.createNodeIterator(
            root,
            NodeFilter.SHOW_TEXT, {
                acceptNode: function(node) {
                    if (!node.data.trim() || !node.parentNode.offsetParent || skip_tags.indexOf(node.parentNode.localName.toLowerCase()) !== -1 || !pattern.test(node.data))
                        return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }, false);

        var nodes = [];
        for (var node; node = nodeIterator.nextNode(); nodes.push(node));
        return nodes;
    }

    function modifySelection() {
        var sel = self.map_node.meta.annotation.split(" ");
        var alter = (state === 2) ? "extend" : "move";
        hideCursor();
        var prevPos = [selection.focusNode, selection.focusOffset];
        selection.modify(alter, sel[0], sel[1]);
        if (prevPos[0] === selection.focusNode && prevPos[1] === selection.focusOffset) {
            selection.modify(alter, sel[0], "word");
        }
        showCursor();
        scrollIntoView();
    }

    function scrollIntoView() {
        // set content of cursor to enable scrollIntoViewIfNeeded
        $(cursor).html('|');
        cursor.scrollIntoViewIfNeeded();
        $(cursor).html('');
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
            var mtches = node.data.match(pattern);
            mtches.forEach(function(match) {
                var mark = createMatchMark(node, node.data.indexOf(match), match.length);
                matches.push(mark);
                node = mark.nextSibling;
            });
        });
        document.body.normalize();
        if (matches.length) {
            currentOccurrence = 0;
            for (var i = 0; i < matches.length; i++) {
                var br = matches[i].getBoundingClientRect();
                if (br.top > 0 && br.left > 0) {
                    currentOccurrence = i;
                    Front.showStatus(3, currentOccurrence + 1 + ' / ' + matches.length);
                    break;
                }
            }
        }
    }

    self.visualClear = function() {
        hideCursor();
        var nodes = matches;
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].parentNode) {
                nodes[i].parentNode.innerHTML = nodes[i].parentNode.innerHTML.replace(/<surfingkeys_mark[^>]*>([^<]+)<\/surfingkeys_mark>/gi, '$1');
            }
        }
        matches = [];
        Front.showStatus(3, '');
    }

    self.toggle = function() {
        switch (state) {
            case 1:
                selection.extend(selection.anchorNode, selection.anchorOffset);
                break;
            case 2:
                hideCursor();
                selection.collapse(selection.focusNode, selection.focusOffset);
                self.exit();
                break;
            default:
                var pos = getStartPos();
                selection.setPosition(pos[0], pos[1]);
                showCursor();
                self.enter();
                break;
        }
        state = (state + 1) % 3;
        Front.showStatus(2, status[state]);
    };

    self.star = function() {
        if (selection.focusNode && selection.focusNode.nodeValue) {
            hideCursor();
            var query = self.getWordUnderCursor();
            runtime.updateHistory('find', query);
            self.visualClear();
            highlight(new RegExp(query, "g" + (caseSensitive ? "" : "i")));
            showCursor();
        }
    };

    self.getWordUnderCursor = function() {
        var word = selection.toString();
        if (word.length === 0 && selection.focusNode && selection.focusNode.nodeValue) {
            word = getNearestWord(selection.focusNode.nodeValue, selection.focusOffset);
        }
        return word;
    };

    self.next = function(backward) {
        if (matches.length) {
            currentOccurrence = (backward ? (matches.length + currentOccurrence - 1) : (currentOccurrence + 1)) % matches.length;
            select(matches[currentOccurrence]);
            Front.showStatus(3, currentOccurrence + 1 + ' / ' + matches.length);
        } else if (runtime.conf.lastQuery) {
            highlight(new RegExp(runtime.conf.lastQuery, "g" + (caseSensitive ? "" : "i")));
            self.visualEnter(runtime.conf.lastQuery);
        }
    };

    self.feedkeys = function(keys) {
        setTimeout(function() {
            for (var i = 0; i < keys.length; i ++) {
                Normal._handleMapKey.call(self, keys[i]);
            }
        }, 1);
    };

    function findNextTextNodeBy(query, caseSensitive) {
        var found = false;
        var pos = [selection.anchorNode, selection.anchorOffset];
        while(window.find(query, caseSensitive) && (selection.anchorNode != pos[0] || selection.anchorOffset != pos[1])) {
            pos = [selection.anchorNode, selection.anchorOffset];
            if (selection.anchorNode.splitText) {
                found = true;
                break;
            }
        }
        return found;
    }
    function visualUpdateForContentWindow(query) {
        self.visualClear();

        var scrollTop = document.body.scrollTop,
            posToStartFind = [selection.anchorNode, selection.anchorOffset];

        if (findNextTextNodeBy(query, caseSensitive)) {
            selection.setPosition(posToStartFind[0], posToStartFind[1]);
        } else {
            // start from beginning if no found from current position
            selection.setPosition(document.body.firstChild, 0);
        }

        if (findNextTextNodeBy(query, caseSensitive)) {
            if (document.body.scrollTop !== scrollTop) {
                // set new start position if there is no occurrence in current view.
                scrollTop = document.body.scrollTop;
                posToStartFind = [selection.anchorNode, selection.anchorOffset];
            }
            var mark = createMatchMark(selection.anchorNode, selection.anchorOffset, query.length);
            matches.push(mark);
            selection.setPosition(mark.nextSibling, 0);

            while(document.body.scrollTop === scrollTop && findNextTextNodeBy(query, caseSensitive)) {
                var mark = createMatchMark(selection.anchorNode, selection.anchorOffset, query.length);
                matches.push(mark);
                selection.setPosition(mark.nextSibling, 0);
            }
            document.body.scrollTop = scrollTop;
            selection.setPosition(posToStartFind[0], posToStartFind[1]);
        }

    }
    runtime.on('visualUpdate', function(message) {
        // for finding in content window, we use window.find for a better performance.
        visualUpdateForContentWindow(message.query);
    });

    // this is only for finding in frontend.html, like in usage popover.
    self.visualUpdate = function(query) {
        self.visualClear();
        highlight(new RegExp(query, "g" + (caseSensitive ? "" : "i")));
    };

    runtime.on('visualClear', self.visualClear);

    self.visualEnter = function (query) {
        highlight(new RegExp(query, "g" + (caseSensitive ? "" : "i")));
        if (matches.length) {
            state = 1;
            Front.showStatus(2, status[state]);
            select(matches[currentOccurrence]);
            self.enter();
        } else {
            Front.showStatus(3, "Pattern not found: {0}".format(query), 1000);
        }
    };
    runtime.on('visualEnter', function(message) {
        self.visualEnter(message.query);
    });

    self.style = function (element, style) {
        self._style[element] = style;

        cursor.setAttribute('style', self._style.cursor || '');
        mark_template.setAttribute('style', self._style.marks || '');
    };
    return self;
})(Mode);
