var Events = (function() {
    var self = {
        keydownHandlers: [Hints, Visual, Normal],
        hotKey: 'a-s',
        focusHandlers: {}
    };
    var clickHandlers = {};

    function getBackFocusOnLoad(e) {
        var handled = false;
        if (isEditable(e.target)) {
            e.target.blur();
            handled = true;
        }
        return handled;
    }
    self.focusHandlers['getBackFocusOnLoad'] = getBackFocusOnLoad;
    clickHandlers['setBackFocus'] = function(e) {
        delete self.focusHandlers.getBackFocusOnLoad;
    };

    var excludedNodes = [];

    function isExcluded(node) {
        for (var i = 0; i < excludedNodes.length; i++) {
            if (excludedNodes[i].contains(node)) {
                return true;
            }
        }
        return false;
    }
    self.includeNode = function(node) {
        var i = excludedNodes.indexOf(node);
        if (i !== -1) {
            excludedNodes.splice(i, 1);
        }
    };
    self.excludeNode = function(node) {
        excludedNodes.push(node);
    };
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

    self.isBlacklisted = function() {
        return runtime.settings.blacklist[window.location.origin] || runtime.settings.blacklist['.*'];
    };

    var eventListeners = {
        'pushState': function(event) {
            self.focusHandlers['getBackFocusOnLoad'] = getBackFocusOnLoad;
        },
        'focus': function(event) {
            for (var fn in self.focusHandlers) {
                if (self.focusHandlers[fn](event)) {
                    window.stopEventPropagation(event, false);
                    break;
                }
            }
        },
        'click': function(event) {
            for (var fn in clickHandlers) {
                if (clickHandlers[fn](event)) {
                    window.stopEventPropagation(event, false);
                    break;
                }
            }
        },
        'keydown': function(event) {
            var key = KeyboardUtils.getKeyChar(event);
            if (key === self.hotKey) {
                self.toggleBlacklist(window.location.origin);
                return;
            }
            if (isExcluded(event.target)) {
                return;
            }
            delete self.focusHandlers.getBackFocusOnLoad;
            if (event.keyCode === KeyboardUtils.keyCodes.ctrlKey || event.keyCode === KeyboardUtils.keyCodes.shiftKey) {
                return;
            }
            if (!isEditable(event.target)) {
                for (var i = 0; i < self.keydownHandlers.length; i++) {
                    if (self.keydownHandlers[i].handleKeyEvent(event, key)) {
                        window.stopEventPropagation(event, true);
                        break;
                    }
                }
            }
            if (event.keyCode === KeyboardUtils.keyCodes.ESC && isEditable(document.activeElement)) {
                document.activeElement.blur();
                window.stopEventPropagation(event, true);
            }
        },
        'keyup': function(event) {
            Normal.surfingkeysHold = 0;
            if (window.stopKeyupPropagation) {
                event.stopImmediatePropagation();
                window.stopKeyupPropagation = false;
            }
        }
    };
    window.stopEventPropagation = function(e, stopKeyUp) {
        e.stopImmediatePropagation();
        e.preventDefault();
        window.stopKeyupPropagation = stopKeyUp;
    };
    Normal.insertJS(function() {
        var _wr = function(type) {
            var orig = history[type];
            return function() {
                var rv = orig.apply(this, arguments);
                var e = new Event(type);
                e.arguments = arguments;
                window.dispatchEvent(e);
                return rv;
            };
        };
        history.pushState = _wr('pushState'), history.replaceState = _wr('replaceState');
    });
    function blackList() {
        if (self.isBlacklisted()) {
            self.excludeNode(document.body);
        } else {
            self.includeNode(document.body);
        }
    }
    self.resetListeners = function() {
        if (document.body) {
            blackList()
        } else {
            $(document).ready(blackList);
        }

        for (var evt in eventListeners) {
            window.removeEventListener(evt, eventListeners[evt], true);
            window.addEventListener(evt, eventListeners[evt], true);
        }
    };

    return self;
})();
