var Mode = (function() {
    var self = {}, mode_stack = [];
    self.specialKeys = {
        "<Alt-s>": "<Alt-s>",       // hotkey to toggleBlacklist
        "<Esc>": "<Esc>"
    };

    self.addEventListener = function(evt, handler) {
        var mode_name = this.name;
        this.eventListeners[evt] = function(event) {
            if (event.type === "keydown" && !event.hasOwnProperty('sk_keyName')) {
                event.sk_keyName = KeyboardUtils.getKeyChar(event);
            }

            if (!event.hasOwnProperty('sk_suppressed')) {
                var ret = handler(event);
                if (ret === "stopEventPropagation") {
                    window.stopEventPropagation(event, true);
                }
            }
        };
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

    self.enter = function() {
        // we need clear the modes stack first to make sure eventListeners of this mode added at first.
        popModes(mode_stack);

        var pos = mode_stack.indexOf(this);

        if (pos === -1) {
            // push this mode into stack
            mode_stack.unshift(this);
        } else {
            // pop up all the modes over this
            mode_stack = mode_stack.slice(pos);
        }

        pushModes(mode_stack);
        // var modes = mode_stack.map(function(m) {
            // return m.name;
        // }).join('->');
        // console.log('enter {0}, {1}'.format(this.name, modes));
    };

    self.exit = function() {
        var pos = mode_stack.indexOf(this);
        if (pos !== -1) {
            pos++;
            var popup = mode_stack.slice(0, pos);
            popModes(popup);
            mode_stack = mode_stack.slice(pos);
            // var modes = mode_stack.map(function(m) {
                // return m.name;
            // }).join('->');
            // console.log('exit {0}, {1}'.format(this.name, modes));
        }
    };

    self.stack = function() {
        return mode_stack;
    };

    return self;
})();

var Disabled = (function(mode) {
    var self = $.extend({name: "Disabled", eventListeners: {}}, mode);

    self.addEventListener('keydown', function(event) {
        // prevent this event to be handled by Surfingkeys' other listeners
        event.sk_suppressed = true;
        if (event.sk_keyName === Mode.specialKeys["<Alt-s>"]) {
            Normal.toggleBlacklist(window.location.origin);
            self.exit();
            return "stopEventPropagation";
        }
    });

    return self;
})(Mode);

var GetBackFocus = (function(mode) {
    var self = $.extend({name: "GetBackFocus", eventListeners: {}}, mode);

    self.addEventListener('focus', function(event) {
        var handled = "", elm = event.target;
        if (isEditable(elm)) {
            elm.blur();
            handled = "stopEventPropagation";
        }
        return handled;
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

    self.mappings = new Trie('', Trie.SORT_NONE);
    self.map_node = self.mappings;
    self.suppressKeyEsc = true;

    self.addEventListener('keydown', function(event) {
        // prevent this event to be handled by Surfingkeys' other listeners
        event.sk_suppressed = true;
        if (event.sk_keyName === Mode.specialKeys["<Esc>"]) {
            document.activeElement.blur();
            self.exit();
            return self.suppressKeyEsc ? "stopEventPropagation" : "";
        } else if (!isEditable(event.target)) {
            self.exit();
        } else if (event.sk_keyName.length) {
            return Normal._handleMapKey.call(self, event.sk_keyName);
        }
    });
    self.addEventListener('focus', function(event) {
        if (!isEditable(event.target)) {
            self.exit();
        }
    });

    return self;
})(Mode);

var Normal = (function(mode) {
    var self = $.extend({name: "Normal", eventListeners: {}}, mode);

    self.addEventListener('keydown', function(event) {
        var handled;
        if (isEditable(event.target)) {
            Insert.enter();
        } else if (event.sk_keyName === Mode.specialKeys["<Esc>"]) {
            self.finish();
            handled = "stopEventPropagation";
        } else if (event.sk_keyName === Mode.specialKeys["<Alt-s>"]) {
            self.toggleBlacklist(window.location.origin);
            handled = "stopEventPropagation";
        } else if (event.sk_keyName.length) {
            handled = self._handleMapKey(event.sk_keyName);
        }
        return handled;
    });
    self.addEventListener('keyup', function(event) {
        Normal.surfingkeysHold = 0;
        if (window.stopKeyupPropagation) {
            event.stopImmediatePropagation();
            window.stopKeyupPropagation = false;
        }
    });
    self.addEventListener('pushState', function(event) {
        Insert.exit();
        GetBackFocus.enter();
    });
    self.addEventListener('mousedown', function(event) {
        if (isEditable(event.target)) {
            Insert.enter();
        } else {
            Insert.exit();
        }
    });

    self.toggleBlacklist = function(domain) {
        if (runtime.settings.blacklist.hasOwnProperty(domain)) {
            delete runtime.settings.blacklist[domain];
        } else {
            runtime.settings.blacklist[domain] = 1;
        }
        RUNTIME('updateSettings', {
            settings: {
                blacklist: runtime.settings.blacklist
            }
        });
    };

    self.mappings = new Trie('', Trie.SORT_NONE);
    self.map_node = self.mappings;
    self.repeats = "";
    self.surfingkeysHold = 0;

    var stepSize = 70,
        scrollNodes, scrollIndex = 0,
        lastKeys;

    function easeFn(t, b, c, d) {
        // t: current time, b: begInnIng value, c: change In value, d: duration
        return (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
    }

    function initScroll(elm) {
        elm.skScrollBy = function(x, y, d) {
            if (runtime.settings.smoothScroll) {
                elm.smoothScrollBy(x, y, d);
            } else {
                elm.scrollLeft = elm.scrollLeft + x;
                elm.scrollTop = elm.scrollTop + y;
            }
        };
        elm.smoothScrollBy = function(x, y, d) {
            // surfingkeysHold:
            // 0 - smoothScroll not started
            // 1 - smoothScroll just started
            // 2 - smoothScroll transfered to normal scroll because user holds the key
            if (self.surfingkeysHold === 0) {
                var x0 = elm.scrollLeft,
                    y0 = elm.scrollTop,
                    start = window.performance.now();

                function step(timestamp) {
                    elm.scrollLeft = easeFn(timestamp - start, x0, x, d);
                    elm.scrollTop = easeFn(timestamp - start, y0, y, d);
                    if (self.surfingkeysHold !== 2 && (timestamp - start) < d) {
                        window.requestAnimationFrame(step);
                    } else if (Math.abs(x) > stepSize || Math.abs(y) > stepSize) {
                        // don't do fine tune for minor scroll
                        elm.scrollLeft = x0 + x;
                        elm.scrollTop = y0 + y;
                    }
                }

                window.requestAnimationFrame(step);
                self.surfingkeysHold++;
            } else if (self.surfingkeysHold === 1) {
                // smoothScroll already started, hold key to keep scroll
                // use no easeFn to keep fixed speed
                function holdStep(timestamp) {
                    elm.scrollLeft = elm.scrollLeft + x / 4;
                    elm.scrollTop = elm.scrollTop + y / 4;
                    if (self.surfingkeysHold === 2) {
                        window.requestAnimationFrame(holdStep);
                    }
                }

                window.requestAnimationFrame(holdStep);
                self.surfingkeysHold++;
            }
        };
    }

    self.hasScroll = function(el, direction, barSize) {
        var offset = (direction === 'y') ? 'scrollTop' : 'scrollLeft';
        var result = el[offset];

        if (result < barSize) {
            // set scroll offset to barSize, and verify if we can get scroll offset as barSize
            var originOffset = el[offset];
            el[offset] = barSize;
            result = el[offset];
            el[offset] = originOffset;
        }
        return result >= barSize && (
            el === document.body
            || $(el).css('overflow-' + direction) === 'auto'
            || $(el).css('overflow-' + direction) === 'scroll');
    }

    function getScrollableElements() {
        var nodes = [];
        var nodeIterator = document.createNodeIterator(
            document.body,
            NodeFilter.SHOW_ELEMENT, {
                acceptNode: function(node) {
                    return (self.hasScroll(node, 'y', 16) || self.hasScroll(node, 'x', 16)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            });
        for (var node; node = nodeIterator.nextNode(); nodes.push(node));
        return nodes;
    }

    var feature_groups = [
        'Help',                  // 0
        'Mouse Click',           // 1
        'Scroll Page / Element', // 2
        'Tabs',                  // 3
        'Page Navigation',       // 4
        'Sessions',              // 5
        'Search selected with',  // 6
        'Clipboard',             // 7
        'Omnibar',               // 8
        'Visual Mode',           // 9
        'vim-like marks',        // 10
        'Settings',              // 11
        'Chrome URLs',           // 12
        'Proxy',                 // 13
        'Misc',                  // 14
        'Insert Mode',           // 15
    ];
    function renderMappings() {
        var div = $("<div></div>");
        var help_groups = feature_groups.map(function(){return [];});
        [ Normal.mappings, Visual.mappings, Insert.mappings ].map(function(mappings) {
            var words = mappings.getWords();
            for (var i = 0; i < words.length; i++) {
                var w = words[i];
                var meta = mappings.find(w).meta[0];
                var item = "<div><span class=kbd-span><kbd>{0}</kbd></span><span class=annotation>{1}</span></div>".format(htmlEncode(w), meta.annotation);
                help_groups[meta.feature_group].push(item);
            }
        });
        help_groups = help_groups.map(function(g, i) {
            return "<div><div class=feature_name><span>{0}</span></div>{1}</div>".format(feature_groups[i], g.join(''));
        }).join("");
        return $(help_groups);
    }

    self.highlightElement = function(sn, duration) {
        var rc = sn.getBoundingClientRect();
        runtime.frontendCommand({
            action: 'highlightElement',
            duration: duration || 200,
            rect: {
                top: rc.top,
                left: rc.left,
                width: rc.width,
                height: rc.height
            }
        });
    };

    function isElementPartiallyInViewport(el) {
        var rect = el.getBoundingClientRect();
        var windowHeight = (window.innerHeight || document.documentElement.clientHeight);
        var windowWidth = (window.innerWidth || document.documentElement.clientWidth);

        var vertInView = (rect.top <= windowHeight) && ((rect.top + rect.height) >= 0);
        var horInView = (rect.left <= windowWidth) && ((rect.left + rect.width) >= 0);

        return (vertInView && horInView);
    }

    self.changeScrollTarget = function() {
        scrollNodes = getScrollableElements(100, 1.1);
        if (scrollNodes.length > 0) {
            scrollIndex = (scrollIndex + 1) % scrollNodes.length;
            var sn = scrollNodes[scrollIndex];
            sn.scrollIntoViewIfNeeded();
            self.highlightElement(sn);
        }
    };

    self.scroll = function(type) {
        if (!scrollNodes || scrollNodes.length === 0) {
            scrollNodes = getScrollableElements(100, 1.1);
        } else {
            scrollNodes = scrollNodes.filter(function(n) {
                return $(n).is(":visible");
            });
            if (scrollIndex >= scrollNodes.length) {
                scrollIndex = 0;
            }
        }
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
                scrollNode.skScrollBy(0, stepSize, 500);
                break;
            case 'up':
                scrollNode.skScrollBy(0, -stepSize, 500);
                break;
            case 'pageDown':
                scrollNode.skScrollBy(0, size[1] / 2, 500);
                break;
            case 'fullPageDown':
                scrollNode.skScrollBy(0, size[1], 500);
                break;
            case 'pageUp':
                scrollNode.skScrollBy(0, -size[1] / 2, 500);
                break;
            case 'fullPageUp':
                scrollNode.skScrollBy(0, -size[1], 500);
                break;
            case 'top':
                scrollNode.skScrollBy(0, -scrollNode.scrollTop, 500);
                break;
            case 'bottom':
                scrollNode.skScrollBy(scrollNode.scrollLeft, scrollNode.scrollHeight - scrollNode.scrollTop, 500);
                break;
            case 'left':
                scrollNode.skScrollBy(-stepSize / 2, 0, 500);
                break;
            case 'right':
                scrollNode.skScrollBy(stepSize / 2, 0, 500);
                break;
            case 'leftmost':
                scrollNode.skScrollBy(-scrollNode.scrollLeft - 10, 0, 500);
                break;
            case 'rightmost':
                scrollNode.skScrollBy(scrollNode.scrollWidth - scrollNode.scrollLeft - size[0] + 20, 0, 500);
                break;
            default:
                break;
        }
    };

    self.rotateFrame = function() {
        RUNTIME('nextFrame');
    };

    self.showUsage = function() {
        var _usage = $('<div/>');
        renderMappings().appendTo(_usage);
        $("<p style='float:right; width:100%; text-align:right'>").html("<a href='https://github.com/brookhong/surfingkeys' target='_blank' style='color:#0095dd'>More help</a>").appendTo(_usage);
        runtime.frontendCommand({
            action: 'showUsage',
            content: _usage.html(),
        });
    };

    self.showPopup = function(content) {
        runtime.frontendCommand({
            action: 'showPopup',
            content: content
        });
    };

    self.showEditor = function(element, onWrite, type) {
        var content;
        if (typeof(element) === "string") {
            content = element;
            self.elementBehindEditor = document.body;
        } else if (type === 'select') {
            var options = $(element).find('option').map(function() {
                return "{0} >< {1}".format($(this).text(), $(this).val());
            }).toArray();
            content = options.join('\n');
            self.elementBehindEditor = element;
        } else {
            content = $(element).val();
            self.elementBehindEditor = element;
        }
        self.onEditorSaved = onWrite;
        runtime.frontendCommand({
            action: 'showEditor',
            type: type || "textarea",
            content: content
        });
    };

    self.chooseTab = function() {
        runtime.frontendCommand({
            action: 'chooseTab'
        });
    };

    self.openOmnibar = function(args) {
        args.action = 'openOmnibar';
        runtime.frontendCommand(args);
    };

    self.openOmniquery = function(args) {
        self.onOmniQuery = function(query) {
            httpRequest({
                'url': args.url + query
            }, function(res) {
                var words = args.parseResult(res);

                runtime.frontendCommand({
                    action: 'updateOmnibarResult',
                    words: words
                });
            });
        };
        self.openOmnibar(({type: "OmniQuery", extra: args.query}))
    };

    self.openFinder = function() {
        runtime.frontendCommand({
            action: "openFinder"
        });
    };

    self.showBanner = function(msg, linger_time) {
        runtime.frontendCommand({
            action: "showBanner",
            content: msg,
            linger_time: linger_time
        });
    };

    self.showBubble = function(pos, msg) {
        runtime.frontendCommand({
            action: "showBubble",
            content: msg,
            position: pos
        });
    };

    self.hideBubble = function() {
        runtime.frontendCommand({
            action: 'hideBubble'
        });
    };

    self.getContentFromClipboard = function(onReady) {
        runtime.frontendCommand({
            action: 'getContentFromClipboard'
        }, onReady);
    };

    self.writeClipboard = function(text) {
        runtime.frontendCommand({
            action: 'writeClipboard',
            content: text
        });
    };

    self.finish = function() {
        this.map_node = this.mappings;
        this.pendingMap = null;
        runtime.frontendCommand({
            action: 'hideKeystroke'
        });
        if (this.repeats) {
            this.repeats = "";
        }
    };

    self._handleMapKey = function(key) {
        var ret = "";
        var finish = self.finish.bind(this);
        if (this.pendingMap) {
            if (key == "<Esc>" || key == "<Ctrl-[>") {
                finish();
            } else {
                this.setLastKeys && this.setLastKeys(this.map_node.meta[0].word + key);
                var pf = this.pendingMap.bind(this);
                setTimeout(function() {
                    pf(key);
                    finish();
                }, 0);
            }
            ret = "stopEventPropagation";
        } else if (this.repeats !== undefined &&
            this.map_node === this.mappings && (key >= "1" || (this.repeats !== "" && key >= "0")) && key <= "9") {
            // reset only after target action executed or cancelled
            this.repeats += key;
            runtime.frontendCommand({
                action: 'showKeystroke',
                key: key
            });
            ret = "stopEventPropagation";
        } else {
            this.map_node = this.map_node.find(key);
            if (this.map_node === null) {
                finish();
            } else {
                if (this.map_node.meta.length) {
                    var code = this.map_node.meta[0].code;
                    if (this.map_node.meta[0].extra_chars) {
                        this.pendingMap = code;
                        runtime.frontendCommand({
                            action: 'showKeystroke',
                            key: key
                        });
                    } else {
                        this.setLastKeys && this.setLastKeys(this.map_node.meta[0].word);
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
                    runtime.frontendCommand({
                        action: 'showKeystroke',
                        key: key
                    });
                }
                ret = "stopEventPropagation";
            }
        }
        return ret;
    };

    self.feedkeys = function(keys) {
        setTimeout(function() {
            for (var i = 0; i < keys.length; i ++) {
                self._handleMapKey(keys[i]);
            }
        }, 1);
    };

    self.setLastKeys = function(key) {
        if (!this.map_node.meta[0].repeatIgnore) {
            lastKeys = [key];
            saveLastKeys();
        }
    };

    function saveLastKeys() {
        RUNTIME('updateSettings', {
            settings: {
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
        lastKeys = settings.lastKeys;
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

    self.addVIMark = function(mark, url) {
        url = url || window.location.href;
        runtime.settings.marks[mark] = {
            url: url,
            scrollLeft: document.body.scrollLeft,
            scrollTop: document.body.scrollTop
        };
        RUNTIME('updateSettings', {
            settings: {
                marks: runtime.settings.marks
            }
        });
        self.showBanner("Mark '{0}' added for: {1}.".format(htmlEncode(mark), url));
    };

    self.jumpVIMark = function(mark) {
        if (runtime.settings.marks.hasOwnProperty(mark)) {
            var markInfo = runtime.settings.marks[mark];
            if (typeof(markInfo) === "string") {
                markInfo = {
                    url: markInfo,
                    scrollLeft: 0,
                    scrollTop: 0
                }
            }
            markInfo.tab = {
                tabbed: false,
                active: true
            };
            RUNTIME("openLink", markInfo);
        } else {
            self.showBanner("No mark '{0}' defined.".format(htmlEncode(mark)));
        }
    };

    self.resetSettings = function() {
        RUNTIME("resetSettings");
        self.showBanner("Settings reset.");
    };

    self.insertJS = function(code) {
        var s = document.createElement('script');
        s.type = 'text/javascript';
        if (typeof(code) === 'function') {
            s.innerText = "(" + code.toString() + ")(window);";
        } else {
            s.src = code;
        }
        document.lastElementChild.appendChild(s);
        s.remove();
    };

    self.moveTab = function(pos) {
        RUNTIME('moveTab', {
            position: pos
        });
    };

    return self;
})(Mode);
