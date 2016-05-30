var Normal = (function() {
    var self = {};
    self.name = "Normal";
    self.mappings = new Trie('', Trie.SORT_NONE);
    self.map_node = self.mappings;
    self.repeats = "";
    self.surfingkeysHold = 0;

    var stepSize = 70,
        scrollNodes, scrollIndex = 0;

    function easeFn(t, b, c, d) {
        // t: current time, b: begInnIng value, c: change In value, d: duration
        return (t === d) ? b + c : c * (-Math.pow(2, -10 * t / d) + 1) + b;
    }

    function initScroll(elm) {
        elm.skScrollBy = function(x, y, d) {
            if (runtime.settings.smoothScroll && (Math.abs(x) > stepSize || Math.abs(y) > stepSize)) {
                elm.smoothScrollBy(x, y, d);
            } else {
                elm.scrollLeft = elm.scrollLeft + x;
                elm.scrollTop = elm.scrollTop + y;
            }
        };
        elm.smoothScrollBy = function(x, y, d) {
            if (self.surfingkeysHold === 0) {
                var x0 = elm.scrollLeft,
                    y0 = elm.scrollTop,
                    start = window.performance.now();

                function step(timestamp) {
                    elm.scrollLeft = easeFn(timestamp - start, x0, x, d);
                    elm.scrollTop = easeFn(timestamp - start, y0, y, d);
                    if (self.surfingkeysHold !== 2 && (timestamp - start) < d) {
                        window.requestAnimationFrame(step);
                    } else {
                        elm.scrollLeft = x0 + x;
                        elm.scrollTop = y0 + y;
                    }
                }

                window.requestAnimationFrame(step);
                self.surfingkeysHold++;
            } else if (self.surfingkeysHold === 1) {
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

    function hasScroll(el, direction, barSize) {
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
                    return (hasScroll(node, 'y', 16) || hasScroll(node, 'x', 16)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
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
    ];
    function renderMappings() {
        var div = $("<div></div>");
        var help_groups = feature_groups.map(function(){return [];});
        [ Normal.mappings, Visual.mappings ].map(function(mappings) {
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

    self.chooseTab = function() {
        runtime.frontendCommand({
            action: 'chooseTab'
        });
    };

    self.openOmnibar = function(args) {
        args.action = 'openOmnibar';
        runtime.frontendCommand(args);
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
    };

    self._handleMapKey = function(key) {
        var ret = false;
        var finish = self.finish.bind(this);
        if (this.pendingMap) {
            if (key == "<Esc>" || key == "<Ctrl-[>"){
                self.repeats = "";
                finish();
            }else{
                var pf = this.pendingMap.bind(this);
                setTimeout(function() {
                    pf(key);
                    self.repeats = "";
                    finish();
                }, 0);
            }
            ret = true;
        } else if (this.map_node === this.mappings && (key >= "1" || (self.repeats !== "" && key >= "0")) && key <= "9") {
            // self.repeats is shared by Normal and Visual
            // and reset only after target action executed or cancelled
            self.repeats += key;
            runtime.frontendCommand({
                action: 'showKeystroke',
                key: key
            });
            ret = true;
        } else {
            this.map_node = this.map_node.find(key);
            if (this.map_node === null) {
                finish();
                ret = false;
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
                        RUNTIME.repeats = parseInt(self.repeats) || 1;
                        setTimeout(function() {
                            while(RUNTIME.repeats > 0) {
                                code();
                                RUNTIME.repeats--;
                            }
                            self.repeats = "";
                            finish();
                        }, 0);
                    }
                } else {
                    runtime.frontendCommand({
                        action: 'showKeystroke',
                        key: key
                    });
                }
                ret = true;
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

    self.handleKeyEvent = function(event, key) {
        var handled = self._handleMapKey(key);
        if (event.keyCode === KeyboardUtils.keyCodes.ESC) {
            self.repeats = "";
            self.finish();
        }
        return handled;
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
})();
