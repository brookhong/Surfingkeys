var Mode = (function() {
    var self = {}, mode_stack = [];
    self.specialKeys = {
        "<Alt-s>": ["<Alt-s>"],       // hotkey to toggleBlacklist
        "<Esc>": ["<Esc>"]
    };

    self.isSpecialKeyOf = function(specialKey, keyToCheck) {
        return (-1 !== self.specialKeys[specialKey].indexOf(decodeKeystroke(keyToCheck)));
    };

    self.addEventListener = function(evt, handler) {
        var mode_name = this.name;
        this.eventListeners[evt] = function(event) {
            if (event.type === "keydown" && !event.hasOwnProperty('sk_keyName')) {
                event.sk_keyName = KeyboardUtils.getKeyChar(event);
            }

            if (!event.hasOwnProperty('sk_suppressed')) {
                handler(event);
                if (event.sk_stopPropagation) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                    this.stopKeyupPropagation = true;
                }
            }
        };
        if (this.name !== "Disabled" && !Disabled.eventListeners.hasOwnProperty(evt)) {
            // Disabled mode listenes all events that are listened by any other mode,
            // so that it could suppress any event.
            Disabled.eventListeners[evt] = function(event) {
                event.sk_suppressed = true;
            };
        }
        return this;
    };

    function popModes(modes) {
        modes.forEach(function(m) {
            for (var evt in m.eventListeners) {
                window.removeEventListener(evt, m.eventListeners[evt], true);
            }
        });
    }

    function pushModes(modes) {
        modes.forEach(function(m) {
            for (var evt in m.eventListeners) {
                window.addEventListener(evt, m.eventListeners[evt], true);
            }
        });
    }

    self.enter = function(priority, reentrant) {
        // we need clear the modes stack first to make sure eventListeners of this mode added at first.
        popModes(mode_stack);

        var pos = mode_stack.indexOf(this);
        if (!this.priority) {
            this.priority = priority || mode_stack.length;
        }

        if (pos === -1) {
            // push this mode into stack
            mode_stack.unshift(this);
        } else if (pos > 0 && !reentrant) {
            // pop up all the modes over this
            // mode_stack = mode_stack.slice(pos);
            var modeList = Mode.stack().map(function(u) { return u.name; }).join(',');
            reportIssue("Mode {0} pushed into mode stack again.".format(this.name), "Modes in stack: {0}".format(modeList));
            // stackTrace();
        }

        mode_stack.sort(function(a,b) {
            return (a.priority < b.priority) ? 1 : ((b.priority < a.priority) ? -1 : 0);
        } );
        pushModes(mode_stack);
        // var modes = mode_stack.map(function(m) {
            // return m.name;
        // }).join('->');
        // console.log('enter {0}, {1}'.format(this.name, modes));

        self.showStatus();
    };

    self.showStatus = function() {
        if (mode_stack.length && document.hasFocus()) {
            var sl = mode_stack[0].statusLine;
            if (sl === undefined) {
                sl = mode_stack[0].name;
            }
            if (window !== top) {
                if (chrome.extension.getURL('').indexOf(window.location.origin) === 0) {
                    sl += "✩";
                } else {
                    var pathname = window.location.pathname.split('/');
                    if (pathname.length) {
                        sl += " - frame: " + pathname[pathname.length - 1]
                    }
                }
            }
            Front.showStatus(0, sl);
        }
    };

    self.exit = function(peek) {
        var pos = mode_stack.indexOf(this);
        if (pos !== -1) {
            if (peek) {
                // for peek exit, we need push modes above this back to the stack.
                popModes(mode_stack);
                mode_stack.splice(pos, 1);
                pushModes(mode_stack);
            } else {
                // otherwise, we just pop all modes above this inclusively.
                pos++;
                var popup = mode_stack.slice(0, pos);
                popModes(popup);
                mode_stack = mode_stack.slice(pos);
            }

            // var modes = mode_stack.map(function(m) {
                // return m.name;
            // }).join('->');
            // console.log('exit {0}, {1}'.format(this.name, modes));
        }
        self.showStatus();
    };

    self.stack = function() {
        return mode_stack;
    };

    return self;
})();

var Disabled = (function(mode) {
    var self = $.extend({name: "Disabled", eventListeners: {}}, mode);

    // Disabled has higher priority than others.
    self.priority = 99;

    self.addEventListener('keydown', function(event) {
        // prevent this event to be handled by Surfingkeys' other listeners
        event.sk_suppressed = true;
        if (Mode.isSpecialKeyOf("<Alt-s>", event.sk_keyName)) {
            Normal.toggleBlacklist(window.location.origin);
            self.exit();
            event.sk_stopPropagation = true;
        }
    });

    return self;
})(Mode);

var PassThrough = (function(mode) {
    var self = $.extend({
        name: "PassThrough",
        statusLine: "",
        eventListeners: {}
    }, mode);

    self.addEventListener('keydown', function(event) {
        // prevent this event to be handled by Surfingkeys' other listeners
        event.sk_suppressed = true;
    }).addEventListener('mousedown', function(event) {
        event.sk_suppressed = true;
    });

    return self;
})(Mode);

var GetBackFocus = (function(mode) {
    var self = $.extend({name: "GetBackFocus", eventListeners: {}}, mode);

    self.addEventListener('focus', function(event) {
        var elm = event.target;
        if (isEditable(elm)) {
            elm.blur();
            event.sk_stopPropagation = true;
        }
    });

    self.enter = function() {
        mode.enter.call(self);
        document.activeElement.blur();
    };

    self.addEventListener('mousedown', function(event) {
        self.exit();
    });

    self.addEventListener('keydown', function(event) {
        self.exit();
    });

    return self;
})(Mode);

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
        annotation: "Exit insert mode.",
        feature_group: 15,
        code: function() {
            document.activeElement.blur();
            self.exit();
        }
    });

    self.addEventListener('keydown', function(event) {
        // prevent this event to be handled by Surfingkeys' other listeners
        event.sk_suppressed = true;
        if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
            document.activeElement.blur();
            self.exit();
            event.sk_stopPropagation = true;
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

var Normal = (function(mode) {
    var self = $.extend({name: "Normal", eventListeners: {}}, mode);

    self.addEventListener('keydown', function(event) {
        if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
            if (self.finish()) {
                event.sk_stopPropagation = true;
            } else if (isEditable(event.target)) {
                document.activeElement.blur();
            }
        } else if (isEditable(event.target)) {
            Insert.enter();
        } else if (Mode.isSpecialKeyOf("<Alt-s>", event.sk_keyName)) {
            self.toggleBlacklist(window.location.origin);
            event.sk_stopPropagation = true;
        } else if (event.sk_keyName.length) {
            self._handleMapKey(event);
        }
    });
    self.addEventListener('blur', function(event) {
        self.scrollOptions[5] = false;
    });
    self.addEventListener('focus', function(evt) {
        Mode.showStatus();
    });
    self.addEventListener('keyup', function(event) {
        setTimeout(function() {
            self.scrollOptions[5] = false;
            if (self.stopKeyupPropagation) {
                event.stopImmediatePropagation();
                self.stopKeyupPropagation = false;
            }
        }, 0);
    });
    self.addEventListener('pushState', function(event) {
        Insert.exit();
        GetBackFocus.enter(0, true);
    });
    self.addEventListener('mousedown', function(event) {
        if (isEditable(event.target)) {
            Insert.enter();
        } else {
            Insert.exit();
        }
    });

    self.toggleBlacklist = function(domain) {
        if (chrome.extension.getURL('').indexOf(domain) !== 0) {
            // can not blacklist URLs from this extension.
            runtime.command({
                action: 'toggleBlacklist',
                domain: domain
            }, function(resp) {
                if (checkBlackList(resp)) {
                    Front.showBanner('Surfingkeys turned OFF for ' + domain, 3000);
                } else {
                    Front.showBanner('Surfingkeys turned ON for ' + domain, 3000);
                }
            });
        }
    };

    self.mappings = new Trie();
    self.map_node = self.mappings;
    self.mappings.add(encodeKeystroke("<Alt-s>"), {
        annotation: "Toggle Surfingkeys for current site",
        feature_group: 0,
        code: function() {
        }
    });

    self.repeats = "";
    self.scrollOptions = ['scrollTop', 0, 0, 0, 0, false];

    var scrollNodes, scrollIndex = 0,
        lastKeys;

    function easeFn(t, b, c, d) {
        // t: current time, b: begInnIng value, c: change In value, d: duration
        return (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
    }

    function initScroll(elm) {
        elm.skScrollBy = function(x, y) {
            if (runtime.conf.smoothScroll) {
                var d = Math.max(100, 20 * Math.log(Math.abs( x || y)));
                elm.smoothScrollBy(x, y, d);
            } else {
                $(document).trigger("surfingkeys:scrollStarted");
                elm.scrollLeft = elm.scrollLeft + x;
                elm.scrollTop = elm.scrollTop + y;
                $(document).trigger("surfingkeys:scrollDone");
            }
        };
        elm.smoothScrollBy = function(x, y, d) {
            if (!self.scrollOptions[5]) {
                // scrollOptions: prop, step, duration, previousTimestamp, delta, keyHeld
                self.scrollOptions = y ? ['scrollTop', y, d, 0, 0, true] : ['scrollLeft', x, d, 0, 0, true];
                function step(t) {
                    var so = self.scrollOptions;
                    if (so[3] === 0) {
                        // init previousTimestamp in first step
                        so[3] = t;
                        $(document).trigger("surfingkeys:scrollStarted");
                        return window.requestAnimationFrame(step);
                    }
                    var old = elm[so[0]], delta = (t - so[3]) * so[1] / so[2];
                    elm[so[0]] += delta;
                    so[3] = t;
                    so[4] += delta;

                    var keyHeld = so[5];
                    if (elm[so[0]] === old // boundary hit
                        || (!keyHeld && Math.abs(so[4]) >= Math.abs(so[1])) // step completed
                    ) {
                        so[5] = false;
                        $(document).trigger("surfingkeys:scrollDone");
                    } else {
                        return window.requestAnimationFrame(step);
                    }
                }
                return window.requestAnimationFrame(step);
            }
        };
    }

    function hasScroll(el, direction, barSize) {
        var offset = (direction === 'y') ? ['scrollTop', 'height'] : ['scrollLeft', 'width'];
        var result = el[offset[0]];

        if (result < barSize) {
            // set scroll offset to barSize, and verify if we can get scroll offset as barSize
            var originOffset = el[offset[0]];
            el[offset[0]] = el.getBoundingClientRect()[offset[1]];
            result = el[offset[0]];
            el[offset[0]] = originOffset;
        }
        return result >= barSize && (
            el === document.body
            || $(el).css('overflow-' + direction) === 'auto'
            || $(el).css('overflow-' + direction) === 'scroll');
    }

    // set scrollIndex to the highest node
    function initScrollIndex() {
        if (!scrollNodes || scrollNodes.length === 0) {
            scrollNodes = getScrollableElements(100, 1.1);
            while (scrollNodes.length) {
                var maxHeight = 0;
                scrollIndex = 0;
                scrollNodes.forEach(function(n, i) {
                    var h = n.getBoundingClientRect().height;
                    if (h > maxHeight) {
                        scrollIndex = i;
                        maxHeight = h
                    }
                });
                var sn = scrollNodes[scrollIndex];
                sn.scrollIntoViewIfNeeded();
                if (isElementPartiallyInViewport(sn)) {
                    break;
                } else {
                    // remove the node that could not be scrolled into view.
                    scrollNodes.splice(scrollIndex, 1);
                }
            }
        }
    }

    function getScrollableElements() {
        var nodes = [];
        var nodeIterator = document.createNodeIterator(
            document.body,
            NodeFilter.SHOW_ELEMENT, {
                acceptNode: function(node) {
                    return ((hasScroll(node, 'y', 16) || hasScroll(node, 'x', 16)) && $(node).is(":visible")) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            });
        for (var node; node = nodeIterator.nextNode(); nodes.push(node));

        return nodes;
    }

    self.changeScrollTarget = function() {
        scrollNodes = getScrollableElements(100, 1.1);
        if (scrollNodes.length > 0) {
            scrollIndex = (scrollIndex + 1) % scrollNodes.length;
            var sn = scrollNodes[scrollIndex];
            sn.scrollIntoViewIfNeeded();
            while (!isElementPartiallyInViewport(sn) && scrollNodes.length) {
                // remove the node that could not be scrolled into view.
                scrollNodes.splice(scrollIndex, 1);
                scrollIndex = scrollIndex % scrollNodes.length;
                sn = scrollNodes[scrollIndex];
                sn.scrollIntoViewIfNeeded();
            }
            var rc = sn.getBoundingClientRect();
            Front.highlightElement({
                duration: 200,
                rect: {
                    top: rc.top,
                    left: rc.left,
                    width: rc.width,
                    height: rc.height
                }
            });
        }
    };

    self.scroll = function(type) {
        initScrollIndex();
        if (scrollNodes.length === 0) {
            return;
        }
        var scrollNode = scrollNodes[scrollIndex];
        if (!scrollNode.skScrollBy) {
            initScroll(scrollNode);
        }
        var size = (scrollNode === document.body) ? [window.innerWidth, window.innerHeight] : [scrollNode.offsetWidth, scrollNode.offsetHeight];
        switch (type) {
            case 'down':
                scrollNode.skScrollBy(0, runtime.conf.scrollStepSize);
                break;
            case 'up':
                scrollNode.skScrollBy(0, -runtime.conf.scrollStepSize);
                break;
            case 'pageDown':
                scrollNode.skScrollBy(0, size[1] / 2);
                break;
            case 'fullPageDown':
                scrollNode.skScrollBy(0, size[1]);
                break;
            case 'pageUp':
                scrollNode.skScrollBy(0, -size[1] / 2);
                break;
            case 'fullPageUp':
                scrollNode.skScrollBy(0, -size[1]);
                break;
            case 'top':
                scrollNode.skScrollBy(0, -scrollNode.scrollTop);
                break;
            case 'bottom':
                scrollNode.skScrollBy(scrollNode.scrollLeft, scrollNode.scrollHeight - scrollNode.scrollTop);
                break;
            case 'left':
                scrollNode.skScrollBy(-runtime.conf.scrollStepSize / 2, 0);
                break;
            case 'right':
                scrollNode.skScrollBy(runtime.conf.scrollStepSize / 2, 0);
                break;
            case 'leftmost':
                scrollNode.skScrollBy(-scrollNode.scrollLeft - 10, 0);
                break;
            case 'rightmost':
                scrollNode.skScrollBy(scrollNode.scrollWidth - scrollNode.scrollLeft - size[0] + 20, 0);
                break;
            default:
                break;
        }
    };

    self.rotateFrame = function() {
        RUNTIME('nextFrame');
    };

    self.finish = function() {
        var ret = false;
        if (this.map_node !== this.mappings || this.pendingMap != null || this.repeats) {
            this.map_node = this.mappings;
            this.pendingMap = null;
            Front.hideKeystroke();
            if (this.repeats) {
                this.repeats = "";
            }
            ret = true;
        }
        return ret;
    };

    self._handleMapKey = function(event, beforeFinish) {
        var finish = self.finish.bind(this),
            key = event.sk_keyName;
        if (this.pendingMap) {
            if (key == "<Esc>" || key == "<Ctrl-[>") {
                finish();
            } else {
                this.setLastKeys && this.setLastKeys(this.map_node.meta.word + key);
                var pf = this.pendingMap.bind(this);
                setTimeout(function() {
                    pf(key);
                    finish();
                }, 0);
            }
            event.sk_stopPropagation = true;
        } else if (this.repeats !== undefined &&
            this.map_node === this.mappings && (key >= "1" || (this.repeats !== "" && key >= "0")) && key <= "9") {
            // reset only after target action executed or cancelled
            this.repeats += key;
            Front.showKeystroke(key);
            event.sk_stopPropagation = true;
        } else {
            var last = this.map_node;
            this.map_node = this.map_node.find(key);
            if (!this.map_node) {
                beforeFinish && beforeFinish(last);
                finish();
            } else {
                if (this.map_node.meta) {
                    var code = this.map_node.meta.code;
                    if (code.length) {
                        // bound function needs arguments
                        this.pendingMap = code;
                        Front.showKeystroke(key);
                    } else {
                        this.setLastKeys && this.setLastKeys(this.map_node.meta.word);
                        RUNTIME.repeats = parseInt(this.repeats) || 1;
                        setTimeout(function() {
                            while(RUNTIME.repeats > 0) {
                                code();
                                RUNTIME.repeats--;
                            }
                            finish();
                        }, 0);
                    }
                } else {
                    Front.showKeystroke(key);
                }
                event.sk_stopPropagation = true;
            }
        }
    };

    self.feedkeys = function(keys) {
        setTimeout(function() {
            var evt = new Event("keydown");
            for (var i = 0; i < keys.length; i ++) {
                evt.sk_keyName = keys[i];
                self._handleMapKey(evt);
            }
        }, 1);
    };

    self.setLastKeys = function(key) {
        if (!this.map_node.meta.repeatIgnore) {
            lastKeys = [key];
            saveLastKeys();
        }
    };

    function saveLastKeys() {
        RUNTIME('localData', {
            data: {
                lastKeys: lastKeys
            }
        });
    }

    self.appendKeysForRepeat = function(mode, keys) {
        if (lastKeys.length > 0) {
            // keys for normal mode must be pushed.
            lastKeys.push('{0}\t{1}'.format(mode, keys));
            saveLastKeys();
        }
    };

    self.repeatLast = function() {
        // lastKeys in format: <keys in normal mode>[,(<mode name>\t<keys in this mode>)*], examples
        // ['se']
        // ['f', 'Hints\tBA']
        lastKeys = runtime.conf.lastKeys;
        self.feedkeys(lastKeys[0]);
        var modeKeys = lastKeys.slice(1);
        for (var i = 0; i < modeKeys.length; i++) {
            var modeKey = modeKeys[i].split('\t');
            if (modeKey[0] === 'Hints') {
                setTimeout(function() {
                    Hints.feedkeys(modeKey[1]);
                }, 120 + i*100);
            }
        }
    };

    var localMarks = {};
    self.addVIMark = function(mark, url) {
        if (/^[a-z]$/.test(mark)) {
            // local mark
            localMarks[mark] = {
                scrollLeft: document.body.scrollLeft,
                scrollTop: document.body.scrollTop
            };
        } else {
            // global mark
            url = url || window.location.href;
            var mo = {};
            mo[mark] = {
                url: url,
                scrollLeft: document.body.scrollLeft,
                scrollTop: document.body.scrollTop
            };
            RUNTIME('addVIMark', {mark: mo});
            Front.showBanner("Mark '{0}' added for: {1}.".format(mark, url));
        }
    };

    self.jumpVIMark = function(mark, newTab) {
        if (localMarks.hasOwnProperty(mark)) {
            var markInfo = localMarks[mark];
            document.body.scrollLeft = markInfo.scrollLeft;
            document.body.scrollTop = markInfo.scrollTop;
        } else {
            runtime.command({
                action: 'getSettings',
                key: 'marks'
            }, function(response) {
                var marks = response.settings.marks;
                if (marks.hasOwnProperty(mark)) {
                    var markInfo = marks[mark];
                    if (typeof(markInfo) === "string") {
                        markInfo = {
                            url: markInfo,
                            scrollLeft: 0,
                            scrollTop: 0
                        }
                    }
                    markInfo.tab = {
                        tabbed: newTab,
                        active: true
                    };
                    RUNTIME("openLink", markInfo);
                } else {
                    Front.showBanner("No mark '{0}' defined.".format(mark));
                }
            });
        }
    };

    self.insertJS = function(code, onload) {
        var s = document.createElement('script');
        s.type = 'text/javascript';
        if (typeof(code) === 'function') {
            s.innerHTML = "(" + code.toString() + ")(window);";
        } else {
            s.src = code;
            s.onload = onload;
        }
        document.lastElementChild.appendChild(s);
        s.remove();
    };

    self.moveTab = function(pos) {
        RUNTIME('moveTab', {
            position: pos
        });
    };

    self.captureElement = function(elm) {
        runtime.command({
            action: 'getCaptureSize'
        }, function(response) {
            var scale = response.width / window.innerWidth;

            elm.scrollTop = 0;
            elm.scrollLeft = 0;
            var lastScrollTop = -1, lastScrollLeft = -1;
            // hide scrollbars
            var overflowY = elm.style.overflowY;
            elm.style.overflowY = "hidden";
            var overflowX = elm.style.overflowX;
            elm.style.overflowX = "hidden";
            // hide borders
            var borderStyle = elm.style.borderStyle;
            elm.style.borderStyle = "none";

            var dx = 0, dy = 0, sx, sy, sw, sh, ww, wh, dh = elm.scrollHeight, dw = elm.scrollWidth;
            if (elm === document.body) {
                ww = window.innerWidth;
                wh = window.innerHeight;
                sx = 0;
                sy = 0;
            } else {
                var br = elm.getBoundingClientRect();
                // visible rectangle
                var rc = [
                    Math.max(br.left, 0),
                    Math.max(br.top, 0),
                    Math.min(br.right, window.innerWidth),
                    Math.min(br.bottom, window.innerHeight)
                ];
                ww = rc[2] - rc[0];
                wh = rc[3] - rc[1];
                sx = rc[0] * scale;
                sy = rc[1] * scale;
            }
            sw = ww * scale;
            sh = wh * scale;

            var canvas = document.createElement( "canvas" );
            canvas.width = dw * scale;
            canvas.height = dh * scale;
            var ctx = canvas.getContext( "2d" );

            var br = elm.getBoundingClientRect();
            var img = document.createElement( "img" );

            img.onload = function() {
                ctx.drawImage(img, sx, sy, sw, sh, dx, dy, sw, sh);
                if (lastScrollTop === elm.scrollTop) {
                    if (lastScrollLeft === elm.scrollLeft) {
                        // done
                        Front.showPopup("<img src='{0}' />".format(canvas.toDataURL( "image/png" )));
                        // restore overflow
                        elm.style.overflowY = overflowY;
                        elm.style.overflowX = overflowX;
                        // restore borders
                        elm.style.borderStyle = borderStyle;
                    } else {
                        lastScrollTop = -1;
                        elm.scrollTop = 0;
                        dy = 0;
                        lastScrollLeft = elm.scrollLeft;
                        if (elm.scrollLeft + 2 * ww < dw) {
                            elm.scrollLeft += ww;
                            dx += ww * scale;
                        } else {
                            elm.scrollLeft += dw % ww;
                            dx = elm.scrollLeft * scale;
                        }
                        setTimeout(function() {
                            runtime.command({
                                action: 'captureVisibleTab'
                            }, function(response) {
                                img.src = response.dataUrl;
                            });
                        }, 100);
                    }
                } else {
                    lastScrollTop = elm.scrollTop;
                    if (elm.scrollTop + 2 * wh < dh) {
                        elm.scrollTop += wh;
                        dy += wh * scale;
                    } else {
                        elm.scrollTop += dh % wh;
                        dy = elm.scrollTop * scale;
                    }
                    setTimeout(function() {
                        runtime.command({
                            action: 'captureVisibleTab'
                        }, function(response) {
                            img.src = response.dataUrl;
                        });
                    }, 100);
                }
            };

            // wait 500 millisecond for keystrokes of Surfingkeys to hide
            setTimeout(function() {
                runtime.command({
                    action: 'captureVisibleTab'
                }, function(response) {
                    img.src = response.dataUrl;
                });
            }, 500);

        });
    };

    self.captureFullPage = function() {
        self.captureElement(document.body);
    };

    self.captureScrollingElement = function() {
        var scrollNode = document.body;
        initScrollIndex();
        if (scrollNodes.length > 0) {
            scrollNode = scrollNodes[scrollIndex];
        }
        self.captureElement(scrollNode);
    };

    return self;
})(Mode);
