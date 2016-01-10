var Visual = (function() {
    var self = {};
    self.mappings = new Trie('', Trie.SORT_NONE);
    self.map_node = self.mappings;
    self.mappings.add("l", {
        annotation: "forward character",
        code: modifySelection
    });
    self.mappings.add("h", {
        annotation: "backward character",
        code: modifySelection
    });
    self.mappings.add("j", {
        annotation: "forward line",
        code: modifySelection
    });
    self.mappings.add("k", {
        annotation: "backward line",
        code: modifySelection
    });
    self.mappings.add("w", {
        annotation: "forward word",
        code: modifySelection
    });
    self.mappings.add("e", {
        annotation: "forward word",
        code: modifySelection
    });
    self.mappings.add("b", {
        annotation: "backward word",
        code: modifySelection
    });
    self.mappings.add(")", {
        annotation: "forward sentence",
        code: modifySelection
    });
    self.mappings.add("(", {
        annotation: "backward sentence",
        code: modifySelection
    });
    self.mappings.add("}", {
        annotation: "forward paragraph",
        code: modifySelection
    });
    self.mappings.add("{", {
        annotation: "backward paragraph",
        code: modifySelection
    });
    self.mappings.add("0", {
        annotation: "backward lineboundary",
        code: modifySelection
    });
    self.mappings.add("$", {
        annotation: "forward lineboundary",
        code: modifySelection
    });
    self.mappings.add("G", {
        annotation: "forward documentboundary",
        code: modifySelection
    });
    self.mappings.add("gg", {
        annotation: "backward documentboundary",
        code: modifySelection
    });
    self.mappings.add("y", {
        annotation: "Copy selected text",
        code: function() {
            var pos = [selection.anchorNode, selection.anchorOffset];
            Normal.writeClipboard(selection.toString());
            selection.setPosition(pos[0], pos[1]);
            showCursor();
        }
    });
    self.mappings.add("*", {
        annotation: "Search word under the cursor",
        code: function() {
            self.star();
        }
    });

    var selection = document.getSelection(),
        caseSensitive = false,
        matches = [],
        currentOccurrence,
        state = 0,
        status = ['', 'Caret', 'Range'],
        mark_template = $('<surfingkeys_mark>')[0],
        cursor = $('<div class="surfingkeys_cursor"/>')[0];

    document.addEventListener('click', function(event) {
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
        showStatus(2, status[state]);
    });

    function showStatus(pos, msg) {
        runtime.frontendCommand({
            action: "showStatus",
            content: msg,
            position: pos
        });
    }

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
        var sel = self.map_node.meta[0].annotation.split(" ");
        var alter = (state === 2) ? "extend" : "move";
        hideCursor();
        var prevPos = [selection.focusNode, selection.focusOffset];
        selection.modify(alter, sel[0], sel[1]);
        if (prevPos[0] === selection.focusNode && prevPos[1] === selection.focusOffset) {
            selection.modify(alter, sel[0], "word");
        }
        showCursor();
        scrollIntoView();
        self.finish();
    }

    function scrollIntoView() {
        var ff = cursor;
        var front = $(ff).offset();
        if (front.top < document.body.scrollTop || (front.top + $(ff).height()) > (document.body.scrollTop + window.innerHeight) || front.left < document.body.scrollLeft || (front.left + $(ff).width()) > (document.body.scrollLeft + window.innerWidth)) {
            window.scrollTo($(ff).offset().left, $(ff).offset().top - window.innerHeight / 2);
        }
    }

    function highlight(pattern) {
        getTextNodes(document.body, pattern).forEach(function(node) {
            var mtches = node.data.match(pattern);
            mtches.forEach(function(match) {
                var mark = mark_template.cloneNode(false);
                var found = node.splitText(node.data.indexOf(match));
                found.splitText(match.length);
                mark.appendChild(found.cloneNode(true));
                found.parentNode.replaceChild(mark, found);
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
                    showStatus(3, currentOccurrence + 1 + ' / ' + matches.length);
                    break;
                }
            }
        }
    }

    function clear() {
        var nodes = matches;
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].parentNode) {
                nodes[i].parentNode.innerHTML = nodes[i].parentNode.innerHTML.replace(/<surfingkeys_mark[^>]*>([^<]+)<\/surfingkeys_mark>/gi, '$1');
            }
        }
        matches = [];
        showStatus(3, '');
    }

    self.onQuery = function(message) {
        hideCursor();
        clear();
        var query = message.query;
        if (query.length > 0 && (query[0].charCodeAt(0) > 0x7f || query.length > 2)) {
            highlight(new RegExp(query, "g" + (caseSensitive ? "" : "i")));
        }
    };

    self.onClear = function(message) {
        clear();
    };

    self.onEnter = function(message) {
        if (matches.length) {
            state = 1;
            select(matches[currentOccurrence]);
            showStatus(2, status[state]);
        } else {
            showStatus(3, "Pattern not found: {0}".format(message.query));
        }
    };

    self.toggle = function() {
        switch (state) {
            case 1:
                selection.extend(selection.anchorNode, selection.anchorOffset);
                break;
            case 2:
                hideCursor();
                selection.collapse(selection.focusNode, selection.focusOffset);
                break;
            default:
                var pos = getStartPos();
                selection.setPosition(pos[0], pos[1]);
                showCursor();
                break;
        }
        state = (state + 1) % 3;
        showStatus(2, status[state]);
    };

    self.star = function() {
        if (selection.focusNode && selection.focusNode.nodeValue) {
            hideCursor();
            var query = selection.toString();
            if (query.length === 0) {
                query = getNearestWord(selection.focusNode.nodeValue, selection.focusOffset);
            }
            runtime.updateHistory('find', query);
            clear();
            highlight(new RegExp(query, "g" + (caseSensitive ? "" : "i")));
            showCursor();
        }
    };

    self.finish = function() {
        self.map_node = self.mappings;
        runtime.frontendCommand({
            action: 'hideKeystroke'
        });
    };

    var _handleMapKey = Normal._handleMapKey.bind(self);
    self.handleKeyEvent = function(event, key) {
        var updated = false;
        if (state) {
            if (event.keyCode === KeyboardUtils.keyCodes.ESC) {
                if (state > 1) {
                    cursor.remove();
                    selection.collapse(selection.anchorNode, selection.anchorOffset);
                    showCursor();
                } else {
                    hideCursor();
                    clear();
                }
                state--;
                showStatus(2, status[state]);
                updated = true;
            } else {
                updated = _handleMapKey(key);
            }
        } else {
            if (event.keyCode === KeyboardUtils.keyCodes.ESC) {
                showStatus(-1, "");
            }
        }
        return updated;
    };

    self.next = function(backward) {
        if (matches.length) {
            currentOccurrence = (backward ? (matches.length + currentOccurrence - 1) : (currentOccurrence + 1)) % matches.length;
            select(matches[currentOccurrence]);
            showStatus(3, currentOccurrence + 1 + ' / ' + matches.length);
        } else if (runtime.settings.findHistory.length) {
            var query = runtime.settings.findHistory[0];
            highlight(new RegExp(query, "g" + (caseSensitive ? "" : "i")));
            if (matches.length) {
                state = 1;
                showStatus(2, status[state]);
                hideCursor();
                select(matches[currentOccurrence]);
            }
        }
    };

    runtime.actions['visualUpdate'] = function(message) {
        hideCursor();
        clear();
        var query = message.query;
        if (query.length > 0 && (query[0].charCodeAt(0) > 0x7f || query.length > 2)) {
            highlight(new RegExp(query, "g" + (caseSensitive ? "" : "i")));
        }
    };
    runtime.actions['visualClear'] = function(message) {
        clear();
    };
    runtime.actions['visualEnter'] = function(message) {
        if (matches.length) {
            state = 1;
            select(matches[currentOccurrence]);
            showStatus(2, status[state]);
        } else {
            showStatus(3, "Pattern not found: {0}".format(message.query));
        }
    };
    return self;
})();
