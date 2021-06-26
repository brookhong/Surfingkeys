function createMode() {
    var self = function(name, statusLine) {
        this.name = name;
        this.statusLine = statusLine;
        this.eventListeners = {};
        this.addEventListener = function(evtName, handler) {
            this.eventListeners[evtName] = handler;

            if (!_listenedEvents.hasOwnProperty(evtName)) {
                _listenedEvents[evtName] = function(event) {
                    handleStack(evtName, event);
                };
                window.addEventListener(evtName, _listenedEvents[evtName], true);
            }

            return this;
        };

        this.enter = function(priority, reentrant) {
            var pos = mode_stack.indexOf(this);
            if (!this.priority) {
                this.priority = priority || mode_stack.length;
            }

            if (pos === -1) {
                // push this mode into stack
                mode_stack.unshift(this);
            } else if (pos > 0) {
                if (reentrant) {
                    // pop up all the modes over this
                    mode_stack = mode_stack.slice(pos);
                } else {
                    var modeList = mode_stack.map(function(u) { return u.name; }).join(',');
                    reportIssue("Mode {0} pushed into mode stack again.".format(this.name), "Modes in stack: {0}".format(modeList));
                }
                // stackTrace();
            }

            mode_stack.sort(function(a,b) {
                return (a.priority < b.priority) ? 1 : ((b.priority < a.priority) ? -1 : 0);
            } );
            // var modes = mode_stack.map(function(m) {
            // return m.name;
            // }).join('->');
            // console.log('enter {0}, {1}'.format(this.name, modes));

            this.onEnter && this.onEnter();

            self.showStatus();
            return pos;
        };

        this.exit = function(peek) {
            var pos = mode_stack.indexOf(this);
            if (pos !== -1) {
                this.priority = 0;
                if (peek) {
                    // for peek exit, we need push modes above this back to the stack.
                    mode_stack.splice(pos, 1);
                } else {
                    // otherwise, we just pop all modes above this inclusively.
                    pos++;
                    var popup = mode_stack.slice(0, pos);
                    mode_stack = mode_stack.slice(pos);
                }

                // var modes = mode_stack.map(function(m) {
                // return m.name;
                // }).join('->');
                // console.log('exit {0}, {1}'.format(this.name, modes));
            }
            self.showStatus();
            this.onExit && this.onExit(pos);
        };
    }, mode_stack = [];
    self.specialKeys = {
        "<Alt-s>": ["<Alt-s>"],       // hotkey to toggleBlocklist
        "<Esc>": ["<Esc>"]
    };

    self.isSpecialKeyOf = function(specialKey, keyToCheck) {
        return (-1 !== self.specialKeys[specialKey].indexOf(KeyboardUtils.decodeKeystroke(keyToCheck)));
    };

    // Enable to stop propagation of the event whose keydown handler has been triggered
    // Why we need this?
    // For example, there is keyup event handler of `s` on some site to set focus on an input box,
    // Now user presses `sg` to search with google, Surfingkeys got `s` and triggered its keydown handler.
    // But keyup handler of the site also got triggered, then `g` was swallowed by the input box.
    // This setting now is only turned on for Normal.
    // For Hints, we could not turn on it, as keyup should be propagated to Normal
    // to stop scrolling when holding a key.
    var keysNeedKeyupSuppressed = [];
    self.suppressKeyUp = function(keyCode) {
        if (keysNeedKeyupSuppressed.indexOf(keyCode) === -1) {
            keysNeedKeyupSuppressed.push(keyCode);
        }
    };

    function onAfterHandler(mode, event) {
        if (event.sk_stopPropagation) {
            event.stopImmediatePropagation();
            event.preventDefault();
            // keyup event also needs to be suppressed for the key whose keydown has been suppressed.
            if (event.type === "keydown" && mode === Normal) {
                self.suppressKeyUp(event.keyCode);
            }
        }
    }

    function handleStack(eventName, event, cb) {
        for (var i = 0; i < mode_stack.length && !event.sk_stopPropagation; i++) {
            var m = mode_stack[i];
            if (!event.sk_suppressed && m.eventListeners.hasOwnProperty(eventName)) {
                var handler = m.eventListeners[eventName];
                handler(event);
                onAfterHandler(m, event);
            }
            if (m.name === "Disabled") {
                break;
            }
            cb && cb(m);
        }
    }

    var _listenedEvents = {
        "keydown": function (event) {
            event.sk_keyName = KeyboardUtils.getKeyChar(event);
            handleStack("keydown", event);
        },
        "keyup": function (event) {
            handleStack("keyup", event, function (m) {
                var i = keysNeedKeyupSuppressed.indexOf(event.keyCode);
                if (i !== -1) {
                    event.stopImmediatePropagation();
                    keysNeedKeyupSuppressed.splice(i, 1);
                }
            });
        },
        "scroll": function (event) {
            if (suppressScrollEvent > 0) {
                event.stopImmediatePropagation();
                event.preventDefault();
                suppressScrollEvent--;
            }
        }
    };
    var suppressScrollEvent = 0;

    function init() {
        for (var evtName in _listenedEvents) {
            window.addEventListener(evtName, _listenedEvents[evtName], true);
        }
    }
    self.suppressNextScrollEvent = function() {
        suppressScrollEvent++;
    };
    self.destroy = function() {
        for (var evtName in _listenedEvents) {
            window.removeEventListener(evtName, _listenedEvents[evtName], true);
        }
    };

    // For blank page in frames, we defer init to page loaded
    // as document.write will clear added eventListeners.
    if (window.location.href === "about:blank" && window.frameElement && document.body.childElementCount === 0) {
        window.frameElement.addEventListener("load", function(evt) {
            try {
                init();
            } catch (e) {
                console.log("Error on blank iframe loaded: " + e);
            }
        });
    } else {
        init();
    }


    self.showStatus = function() {
        if (document.hasFocus() && mode_stack.length) {
            var cm = mode_stack[0];
            var sl = cm.statusLine;
            if (sl === undefined) {
                sl = runtime.conf.showModeStatus ? cm.name :  "";
            }
            if (sl !== "" && window !== top) {
                if (chrome.extension.getURL('').indexOf(window.location.origin) === 0) {
                    if (cm !== Find) {
                        sl += "✩";
                    }
                } else {
                    var pathname = window.location.pathname.split('/');
                    if (pathname.length) {
                        sl += " - frame: " + pathname[pathname.length - 1];
                    }
                }
            }
            typeof(Front) === "object" && Front.showStatus(0, sl);
        }
    };

    self.stack = function() {
        return mode_stack;
    };

    self.finish = function (mode) {
        var ret = false;
        if (mode.map_node !== mode.mappings || mode.pendingMap != null || mode.repeats) {
            mode.map_node = mode.mappings;
            mode.pendingMap = null;
            mode.isTrustedEvent && Front.hideKeystroke();
            if (mode.repeats) {
                mode.repeats = "";
            }
            ret = true;
        }
        return ret;
    };

    self.handleMapKey = function(event, onNoMatched) {
        var thisMode = this,
            key = event.sk_keyName;
        this.isTrustedEvent = event.isTrusted;

        var isEscKey = Mode.isSpecialKeyOf("<Esc>", key);
        if (isEscKey) {
            key = KeyboardUtils.encodeKeystroke("<Esc>");
        }

        if (isEscKey && self.finish(this)) {
            event.sk_stopPropagation = true;
            event.sk_suppressed = true;
        } else if (this.pendingMap) {
            this.setLastKeys && this.setLastKeys(this.map_node.meta.word + key);
            var pf = this.pendingMap.bind(this);
            event.sk_stopPropagation = (!this.map_node.meta.stopPropagation
                || this.map_node.meta.stopPropagation(key));
            pf(key);
            self.finish(thisMode);
        } else if (this.repeats !== undefined &&
            this.map_node === this.mappings &&
            runtime.conf.digitForRepeat &&
            (key >= "1" || (this.repeats !== "" && key >= "0")) && key <= "9" &&
            this.map_node.getWords().length > 0
        ) {
            // reset only after target action executed or cancelled
            this.repeats += key;
            this.isTrustedEvent && Front.showKeystroke(key, this);
            event.sk_stopPropagation = true;
        } else {
            var last = this.map_node;
            this.map_node = this.map_node.find(key);
            if (!this.map_node) {
                onNoMatched && onNoMatched(last);
                event.sk_suppressed = (last !== this.mappings);
                self.finish(this);
            } else {
                if (this.map_node.meta) {
                    var code = this.map_node.meta.code;
                    if (code.length) {
                        // bound function needs arguments
                        this.pendingMap = code;
                        this.isTrustedEvent && Front.showKeystroke(key, this);
                        event.sk_stopPropagation = true;
                    } else {
                        this.setLastKeys && this.setLastKeys(this.map_node.meta.word);
                        RUNTIME.repeats = parseInt(this.repeats) || 1;
                        event.sk_stopPropagation = (!this.map_node.meta.stopPropagation
                            || this.map_node.meta.stopPropagation(key));
                        while(RUNTIME.repeats > 0) {
                            code();
                            RUNTIME.repeats--;
                        }
                        self.finish(thisMode);
                    }
                } else {
                    this.isTrustedEvent && Front.showKeystroke(key, this);
                    event.sk_stopPropagation = true;
                }
            }
        }
    };

    return self;
}

function createDisabled() {
    var self = new Mode("Disabled");

    // Disabled has higher priority than others.
    self.priority = 99;

    self.addEventListener('keydown', function(event) {
        // prevent this event to be handled by Surfingkeys' other listeners
        event.sk_suppressed = true;
        if (Mode.isSpecialKeyOf("<Alt-s>", event.sk_keyName)) {
            Normal.toggleBlocklist();
            self.exit();
            event.sk_stopPropagation = true;
        }
    });

    return self;
}

function createPassThrough() {
    var self = new Mode("PassThrough");
    var _autoExit, _timeout;

    self.addEventListener('keydown', function(event) {
        // prevent this event to be handled by Surfingkeys' other listeners
        event.sk_suppressed = true;
        if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
            self.exit();
            event.sk_stopPropagation = true;
        } else if (_timeout > 0) {
            if (_autoExit) {
                clearTimeout(_autoExit);
                _autoExit = undefined;
            }
            _autoExit = setTimeout(function() {
                self.exit();
            }, _timeout);
        }
    }).addEventListener('mousedown', function(event) {
        event.sk_suppressed = true;
    });
    self.addEventListener('focus', function(event) {
        event.sk_suppressed = true;
    });

    self.onEnter = function() {
        if (_timeout > 0) {
            _autoExit = setTimeout(function() {
                self.exit();
            }, _timeout);
            self.statusLine = `ephemeral(${_timeout}ms) pass through`;
        } else {
            self.statusLine = "pass through";
        }
    };

    self.setTimeout = function(timeout) {
        _timeout = timeout;
    };

    return self;
}

function createNormal() {
    var self = new Mode("Normal");

    // let next focus event pass
    var _passFocus = false;
    self.passFocus = function(pf) {
        _passFocus = pf;
    };

    self.addEventListener('keydown', function(event) {
        var realTarget = getRealEdit(event);
        if (isEditable(realTarget) && event.isTrusted) {
            if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)) {
                realTarget.blur();
                Insert.exit();
            } else {
                if (runtime.conf.editableBodyCare && realTarget === document.body && event.key !== "i") {
                    self.statusLine = "Press i to enter Insert mode";
                    runtime.conf.showModeStatus = true;
                    if (event.sk_keyName.length) {
                        Mode.handleMapKey.call(self, event);
                    }
                } else {
                    event.sk_stopPropagation = (runtime.conf.editableBodyCare
                        && realTarget === document.body && event.key === "i");
                    if (event.sk_stopPropagation) {
                        Normal.passFocus(true);
                        realTarget.focus();
                    }

                    var stealFocus = false;
                    if (!isElementPartiallyInViewport(realTarget)) {
                        var n = realTarget;
                        while (n !== document.documentElement && !n.newlyCreated) {
                            n = n.parentElement;
                        }
                        stealFocus = n !== document.documentElement && n.newlyCreated;
                    }
                    if (stealFocus) {
                        // steal focus from dynamically created input widget
                        realTarget.blur();
                        delete n.newlyCreated;
                        Mode.handleMapKey.call(self, event);
                    } else {
                        // keep cursor where it is
                        Insert.enter(realTarget, true);
                    }

                }
            }
        } else if (Mode.isSpecialKeyOf("<Alt-s>", event.sk_keyName)) {
            self.toggleBlocklist();
            Mode.finish(self);
            event.sk_stopPropagation = true;
        } else if (event.sk_keyName.length) {
            Mode.handleMapKey.call(self, event);
        }
    });
    self.addEventListener('blur', function(event) {
        keyHeld = 0;
    });
    self.addEventListener('focus', function(event) {
        Mode.showStatus();
        if (runtime.conf.stealFocusOnLoad && !isInUIFrame()) {
            var elm = getRealEdit(event);
            if (isEditable(elm)) {
                if (_passFocus || elm.enableAutoFocus) {
                    if (!runtime.conf.enableAutoFocus) {
                        // prevent focus on input only when enableAutoFocus is turned off.
                        _passFocus = false;
                    }
                } else {
                    elm.blur();
                    event.sk_stopPropagation = true;
                }
            }
        }
    });
    self.addEventListener('keyup', function(event) {
        setTimeout(function() {
            keyHeld = 0;
        }, 0);
    });
    var _clickPos = null;
    self.addEventListener('mousedown', function(event) {
        _clickPos = [event.clientX, event.clientY];
        // Insert mode will never be created in frontend frame.
        if (typeof(Insert) === "undefined") {
            return;
        }
        // The isTrusted read-only property of the Event interface is a boolean
        // that is true when the event was generated by a user action, and false
        // when the event was created or modified by a script or dispatched via dispatchEvent.

        // enable only mouse click from human being to focus input
        if (runtime.conf.enableAutoFocus) {
            self.passFocus(true);
        } else {
            self.passFocus(event.isTrusted);
        }

        var realTarget = getRealEdit(event);
        if (isEditable(realTarget)) {
            // keep cursor where it is
            Insert.enter(realTarget, true);
        } else {
            Insert.exit();
        }
    });
    self.getWordUnderCursor = function() {
        var selection = document.getSelection();
        if (selection.focusNode && selection.focusNode.textContent) {
            var range = getNearestWord(selection.focusNode.textContent, selection.focusOffset);
            var selRect = getTextRect(selection.focusNode, range[0], range[0] + range[1]);
            var word = selection.focusNode.textContent.substr(range[0], range[1]);
            if (selRect && _clickPos && selRect.has(_clickPos[0], _clickPos[1], 0, 0) && word) {
                return word.trim();
            }
        }
        return null;
    };

    self.toggleBlocklist = function() {
        if (document.location.href.indexOf(chrome.extension.getURL("")) !== 0) {
            RUNTIME('toggleBlocklist', {
                blocklistPattern: (runtime.conf.blocklistPattern ? runtime.conf.blocklistPattern.toJSON() : "")
            }, function(resp) {
                if (resp.disabled) {
                    if (resp.blocklist.hasOwnProperty(".*")) {
                        Front.showBanner('Surfingkeys is globally disabled, please enable it globally from popup menu.', 3000);
                    } else {
                        Front.showBanner('Surfingkeys turned OFF for ' + resp.url, 3000);
                    }
                } else {
                    Front.showBanner('Surfingkeys turned ON for ' + resp.url, 3000);
                }
            });
        } else {
            Front.showBanner('You could not toggle Surfingkeys on its own pages.', 3000);
        }
    };

    self.passThrough = function(timeout) {
        PassThrough.setTimeout(timeout);
        PassThrough.enter();
    };

    self.mappings = new Trie();
    self.map_node = self.mappings;

    self.repeats = "";
    var keyHeld = 0;

    var scrollNodes, scrollIndex = 0,
        lastKeys;

    function easeFn(t, b, c, d) {
        // t: current time, b: begInnIng value, c: change In value, d: duration
        return (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
    }

    var _nodesHasSKScroll = [];
    function initScroll(elm) {
        elm.skScrollBy = function(x, y) {
            if (runtime.conf.smartPageBoundary && ((this === document.scrollingElement)
                || scrollNodes.length === 1 && this === scrollNodes[0])) {
                if (this.scrollTop === 0 && y <= 0 && previousPage()
                    || this.scrollHeight - this.scrollTop <= this.clientHeight + 1 && y > 0 && nextPage()) {
                    return;
                }
            }
            if (RUNTIME.repeats > 1) {
                x = RUNTIME.repeats * x;
                y = RUNTIME.repeats * y;
                RUNTIME.repeats = 0;
            }
            if (runtime.conf.smoothScroll) {
                var d = Math.max(100, 20 * Math.log(Math.abs( x || y)));
                elm.smoothScrollBy(x, y, d);
            } else {
                document.dispatchEvent(new CustomEvent('surfingkeys:scrollStarted'));
                elm.scrollBy({
                    'behavior': 'instant',
                    'left': x,
                    'top': y,
                });
                document.dispatchEvent(new CustomEvent('surfingkeys:scrollDone'));
            }
        };
        elm.smoothScrollBy = function(x, y, d) {
            if (!keyHeld) {
                var [prop, distance] = y ? ['scrollTop', y] : ['scrollLeft', x],
                    duration = d,
                    previousTimestamp = 0,
                    originValue = elm[prop],
                    stepCompleted = false;
                keyHeld = 1;
                function step(t) {
                    if (previousTimestamp === 0) {
                        // init previousTimestamp in first step
                        previousTimestamp = t;
                        document.dispatchEvent(new CustomEvent('surfingkeys:scrollStarted'));
                        return window.requestAnimationFrame(step);
                    }
                    var old = elm[prop], delta = (t - previousTimestamp) * distance / duration;
                    if (Math.abs(old + delta - originValue) >= Math.abs(distance)) {
                        stepCompleted = true;
                        if (keyHeld > runtime.conf.scrollFriction) {
                            elm[prop] += delta;
                            originValue = elm[prop];
                        } else if (keyHeld > 0) {
                            keyHeld ++;
                        } else {
                            elm[prop] = originValue + distance;
                        }
                    } else {
                        elm[prop] += delta;
                    }
                    previousTimestamp = t;

                    if (!keyHeld && (elm[prop] === old // boundary hit
                        || stepCompleted )// distance completed
                    ) {
                        keyHeld = 0;
                        elm.style.scrollBehavior = '';
                        document.dispatchEvent(new CustomEvent('surfingkeys:scrollDone'));
                    } else {
                        window.requestAnimationFrame(step);
                    }
                }
                elm.style.scrollBehavior = 'auto';
                window.requestAnimationFrame(step);
            }
        };
        _nodesHasSKScroll.push(elm);
    }

    // set scrollIndex to the highest node
    function initScrollIndex() {
        if (!scrollNodes || scrollNodes.length === 0) {
            scrollNodes = getScrollableElements();
            scrollIndex = 0;
        }
    }

    function scrollableMousedownHandler(e) {
        var n = e.currentTarget;
        if (!n.contains(e.target)) return;
        var index = scrollNodes.lastIndexOf(e.target);
        for (var i = scrollNodes.length - 1; i >= 0 && index === -1; i--) {
            if (scrollNodes[i] !== document.body && scrollNodes[i].contains(e.target)) {
                index = i;
            }
        }
        if (index !== -1) {
            scrollIndex = index;
        }
    }

    function getScrollableElements() {
        var nodes = listElements(document.body, NodeFilter.SHOW_ELEMENT, function(n) {
            return (hasScroll(n, 'y', 16) && n.scrollHeight > 200 ) || (hasScroll(n, 'x', 16) && n.scrollWidth > 200);
        });
        nodes.sort(function(a, b) {
            if (b.contains(a)) return 1;
            else if (a.contains(b)) return -1;
            return b.scrollHeight * b.scrollWidth - a.scrollHeight * a.scrollWidth;
        });
        // document.scrollingElement will be null when document.body.tagName === "FRAMESET", for example http://www.knoppix.org/
        if (document.scrollingElement && (document.scrollingElement.scrollHeight > window.innerHeight
            || document.scrollingElement.scrollWidth > window.innerWidth)) {
            nodes.unshift(document.scrollingElement);
        }
        nodes.forEach(function (n) {
            n.removeEventListener('mousedown', scrollableMousedownHandler);
            n.addEventListener('mousedown', scrollableMousedownHandler);
            n.dataset.hint_scrollable = true;
        });
        return nodes;
    }

    function _highlightElement(elm) {
        var rc;
        if (document.scrollingElement === elm) {
            rc = {
                top: 0,
                left: 0,
                width: window.innerWidth,
                height: window.innerHeight
            };
        } else {
            rc = elm.getBoundingClientRect();
        }
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
    function changeScrollTarget(silent) {
        scrollNodes = getScrollableElements();
        if (scrollNodes.length > 0) {
            scrollIndex = (scrollIndex + 1) % scrollNodes.length;
            var sn = scrollNodes[scrollIndex];
            scrollIntoViewIfNeeded(sn);
            if (!silent) {
                _highlightElement(sn);
            }
        }
    }

    self.scroll = function(type) {
        initScrollIndex();
        var scrollNode = document.scrollingElement;
        if (scrollNodes.length > 0) {
            scrollNode = scrollNodes[scrollIndex];
            if (scrollNode !== document.scrollingElement && scrollNode !== document.body) {
                var br = scrollNode.getBoundingClientRect();
                if (br.width === 0 || br.height === 0 || !isElementPartiallyInViewport(scrollNode)
                    || !hasScroll(scrollNode, 'x', 16) && !hasScroll(scrollNode, 'y', 16)) {
                    // Recompute scrollable elements, the webpage has changed.
                    self.refreshScrollableElements();
                    scrollNode = scrollNodes[scrollIndex];
                }
            }
        }
        if (!scrollNode) {
            // scrollNode could be null on a page with frameset as its body.
            return;
        }
        if (!scrollNode.skScrollBy) {
            initScroll(scrollNode);
        }
        var size = (scrollNode === document.scrollingElement) ? [window.innerWidth, window.innerHeight] : [scrollNode.offsetWidth, scrollNode.offsetHeight];
        switch (type) {
            case 'down':
                scrollNode.skScrollBy(0, runtime.conf.scrollStepSize);
                break;
            case 'up':
                scrollNode.skScrollBy(0, -runtime.conf.scrollStepSize);
                break;
            case 'pageDown':
                scrollNode.skScrollBy(0, Math.round(size[1] / 2));
                break;
            case 'fullPageDown':
                scrollNode.skScrollBy(0, size[1]);
                break;
            case 'pageUp':
                scrollNode.skScrollBy(0, -Math.round(size[1] / 2));
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
                scrollNode.skScrollBy(-Math.round(runtime.conf.scrollStepSize / 2), 0);
                break;
            case 'right':
                scrollNode.skScrollBy(Math.round(runtime.conf.scrollStepSize / 2), 0);
                break;
            case 'leftmost':
                scrollNode.skScrollBy(-scrollNode.scrollLeft - 10, 0);
                break;
            case 'rightmost':
                scrollNode.skScrollBy(scrollNode.scrollWidth - scrollNode.scrollLeft - size[0] + 20, 0);
                break;
            case 'byRatio':
                var y = parseInt(RUNTIME.repeats * scrollNode.scrollHeight / 100) - size[1] / 2 - scrollNode.scrollTop;
                RUNTIME.repeats = 0;
                scrollNode.skScrollBy(0, y);
                break;
            default:
                break;
        }
        window.Observer && window.Observer.turnOffDOMObserver();
    };

    self.refreshScrollableElements = function () {
        scrollNodes = null;
        initScrollIndex();
        return scrollNodes;
    };

    self.getScrollableElements = function() {
        initScrollIndex();
        return scrollNodes;
    };

    self.addScrollableElement = function(elm) {
        if (!scrollNodes || !elm.contains(scrollNodes[scrollIndex]) && scrollNodes.indexOf(elm) === -1) {
            initScrollIndex();
            scrollNodes.push(elm);
            scrollIndex = scrollNodes.length - 1;
        }
    };

    self.rotateFrame = function() {
        RUNTIME('nextFrame');
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

    self.setLastKeys = function(key) {
        if (!this.map_node.meta.repeatIgnore && key.length > 1) {
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
        if (lastKeys && lastKeys.length > 0) {
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
                function closureWrapper() {
                    var hints = modeKey[1];
                    return function() {
                        Hints.feedkeys(hints);
                    };
                }
                setTimeout(closureWrapper(), 120 + i*100);
            }
        }
    };

    self.addVIMark = function(mark, url) {
        url = url || window.location.href;
        var mo = {};
        mo[mark] = {
            url: url,
            scrollLeft: document.scrollingElement.scrollLeft,
            scrollTop: document.scrollingElement.scrollTop
        };
        RUNTIME('addVIMark', {mark: mo});
        Front.showBanner("Mark '{0}' added for: {1}.".format(mark, url));
    };

    self.jumpVIMark = function(mark) {
        RUNTIME('jumpVIMark', {
            mark: mark
        });
    };

    self.insertJS = function(code, onload) {
        var s = document.createElement('script');
        s.type = 'text/javascript';
        if (typeof(code) === 'function') {
            setSanitizedContent(s, "(" + code.toString() + ")(window);");
            setTimeout(function() {
                onload && onload();
                s.remove();
            }, 1);
        } else {
            s.src = code;
            s.onload = function() {
                onload && onload();
                s.remove();
            };
        }
        document.lastElementChild.appendChild(s);
    };

    self.moveTab = function(pos) {
        RUNTIME('moveTab', {
            position: pos
        });
    };

    self.captureElement = function(elm) {
        RUNTIME('getCaptureSize', null, function(response) {
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
            Front.toggleStatus(false);

            var dx = 0, dy = 0, sx, sy, sw, sh, ww, wh, dh = elm.scrollHeight, dw = elm.scrollWidth;
            if (elm === document.scrollingElement) {
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
                        Front.toggleStatus(true);
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
                            RUNTIME('captureVisibleTab', null, function(response) {
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
                        RUNTIME('captureVisibleTab', null, function(response) {
                            img.src = response.dataUrl;
                        });
                    }, 100);
                }
            };

            // wait 500 millisecond for keystrokes of Surfingkeys to hide
            setTimeout(function() {
                RUNTIME('captureVisibleTab', null, function(response) {
                    img.src = response.dataUrl;
                });
            }, 500);

        });
    };

    self.mappings.add("yG", {
        annotation: "Capture current full page",
        feature_group: 7,
        code: function() {
            self.captureElement(document.scrollingElement);
        }
    });
    self.mappings.add("yS", {
        annotation: "Capture scrolling element",
        feature_group: 7,
        code: function() {
            var scrollNode = document.scrollingElement;
            initScrollIndex();
            if (scrollNodes.length > 0) {
                scrollNode = scrollNodes[scrollIndex];
            }
            self.captureElement(scrollNode);
        }
    });

    self.mappings.add("cS", {
        annotation: "Reset scroll target",
        feature_group: 2,
        code: function() {
            scrollNodes = null;
            initScrollIndex();
            if (scrollNodes.length > 0) {
                var scrollNode = scrollNodes[scrollIndex];
                _highlightElement(scrollNode);
            }
        }
    });
    self.mappings.add("e", {
        annotation: "Scroll half page up",
        feature_group: 2,
        repeatIgnore: true,
        code: self.scroll.bind(self, "pageUp")
    });
    self.mappings.add("d", {
        annotation: "Scroll half page down",
        feature_group: 2,
        repeatIgnore: true,
        code: self.scroll.bind(self, "pageDown")
    });
    self.mappings.add("gg", {
        annotation: "Scroll to the top of the page",
        feature_group: 2,
        repeatIgnore: true,
        code: self.scroll.bind(self, "top")
    });
    self.mappings.add("G", {
        annotation: "Scroll to the bottom of the page",
        feature_group: 2,
        repeatIgnore: true,
        code: self.scroll.bind(self, "bottom")
    });
    self.mappings.add("j", {
        annotation: "Scroll down",
        feature_group: 2,
        repeatIgnore: true,
        code: self.scroll.bind(self, "down")
    });
    self.mappings.add("k", {
        annotation: "Scroll up",
        feature_group: 2,
        repeatIgnore: true,
        code: self.scroll.bind(self, "up")
    });
    self.mappings.add("h", {
        annotation: "Scroll left",
        feature_group: 2,
        repeatIgnore: true,
        code: self.scroll.bind(self, "left")
    });
    self.mappings.add("l", {
        annotation: "Scroll right",
        feature_group: 2,
        repeatIgnore: true,
        code: self.scroll.bind(self, "right")
    });
    self.mappings.add("0", {
        annotation: "Scroll all the way to the left",
        feature_group: 2,
        repeatIgnore: true,
        code: self.scroll.bind(self, "leftmost")
    });
    self.mappings.add("$", {
        annotation: "Scroll all the way to the right",
        feature_group: 2,
        repeatIgnore: true,
        code: self.scroll.bind(self, "rightmost")
    });
    self.mappings.add("%", {
        annotation: "Scroll to percentage of current page",
        feature_group: 2,
        repeatIgnore: true,
        code: self.scroll.bind(self, "byRatio")
    });
    self.mappings.add("cs", {
        annotation: "Change scroll target",
        feature_group: 2,
        repeatIgnore: true,
        code: function() {
            changeScrollTarget();
        }
    });

    self.mappings.add("f", {
        annotation: "Open a link, press SHIFT to flip overlapped hints, hold SPACE to hide hints",
        feature_group: 1,
        repeatIgnore: true,
        code: function() {
            Hints.create("", Hints.dispatchMouseClick);
        }
    });

    self.mappings.add(";fs", {
        annotation: "Display hints to focus scrollable elements",
        feature_group: 1,
        repeatIgnore: true,
        code: function() {
            Hints.create(Normal.refreshScrollableElements(), Hints.dispatchMouseClick);
        }
    });

    self.mappings.add("v", {
        annotation: "Toggle visual mode",
        feature_group: 9,
        repeatIgnore: true,
        code: function() {
            Visual.toggle();
        }
    });
    self.mappings.add("cq", {
        annotation: "Query word with Hints",
        feature_group: 7,
        repeatIgnore: true,
        code: function() {
            Visual.toggle("q");
        }
    });
    self.mappings.add("/", {
        annotation: "Find in current page",
        feature_group: 9,
        repeatIgnore: true,
        code: function() {
            Front.openFinder();
        }
    });
    self.mappings.add("n", {
        annotation: "Next found text",
        feature_group: 9,
        repeatIgnore: true,
        code: function() {
            Visual.next(false);
        }
    });
    self.mappings.add("N", {
        annotation: "Previous found text",
        feature_group: 9,
        repeatIgnore: true,
        code: function() {
            Visual.next(true);
        }
    });

    self.mappings.add("E", {
        annotation: "Go one tab left",
        feature_group: 3,
        repeatIgnore: true,
        code: function() {
            RUNTIME("previousTab");
        }
    });
    self.mappings.add("R", {
        annotation: "Go one tab right",
        feature_group: 3,
        repeatIgnore: true,
        code: function() {
            RUNTIME("nextTab");
        }
    });

    function _onMouseUp(event) {
        if (runtime.conf.mouseSelectToQuery.indexOf(window.origin) !== -1
            && !isElementClickable(event.target)
            && !event.target.matches(".cm-matchhighlight")) {
            // perform inline query after 1 ms
            // to avoid calling on selection collapse
            setTimeout(Front.querySelectedWord, 1);
        }
    }

    var _disabled = null;
    self.disable = function() {
        if (!_disabled) {
            _disabled = createDisabled();
            _disabled.enter(0, true);
        }
        window.Observer && window.Observer.turnOffDOMObserver();
        document.removeEventListener("mouseup", _onMouseUp);
    };

    self.enable = function() {
        if (_disabled) {
            _disabled.exit();
            _disabled = null;
        }
        document.addEventListener("mouseup", _onMouseUp);
    };
    self.enable();

    self.onExit = function() {
        window.Observer && window.Observer.turnOffDOMObserver();
        _nodesHasSKScroll.forEach(function(n) {
            delete n.skScrollBy;
            delete n.smoothScrollBy;
        });
    };

    return self;
}
