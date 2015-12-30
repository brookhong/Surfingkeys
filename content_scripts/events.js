var Events = (function() {
    var self = {
        keydownHandlers: [Hints, Visual, Normal],
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
        if (isEditable(e.target)) {
            delete self.focusHandlers.getBackFocusOnLoad;
        }
    };

    self.addListeners = function() {
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

        window.addEventListener('pushState', function(event) {
            self.focusHandlers['getBackFocusOnLoad'] = getBackFocusOnLoad;
        });
        window.addEventListener('focus', function(event) {
            for (var fn in self.focusHandlers) {
                if (self.focusHandlers[fn](event)) {
                    window.stopEventPropagation(event, false);
                    break;
                }
            }
        }, true);
        window.addEventListener('click', function(event) {
            for (var fn in clickHandlers) {
                if (clickHandlers[fn](event)) {
                    window.stopEventPropagation(event, false);
                    break;
                }
            }
        }, true);
        window.stopEventPropagation = function(e, stopKeyUp) {
            e.stopImmediatePropagation();
            e.preventDefault();
            window.stopKeyupPropagation = stopKeyUp;
        };
        window.addEventListener('keydown', function(event) {
            delete self.focusHandlers.getBackFocusOnLoad;
            if (event.keyCode === KeyboardUtils.keyCodes.ctrlKey || event.keyCode === KeyboardUtils.keyCodes.shiftKey) {
                return;
            }
            if (!isEditable(event.target)) {
                var key = KeyboardUtils.getKeyChar(event);
                for (var i = 0; i < self.keydownHandlers.length; i++) {
                    if (self.keydownHandlers[i].handleKeyEvent(event, key)) {
                        window.stopEventPropagation(event, true);
                        break;
                    }
                }
            }
            if (event.keyCode === KeyboardUtils.keyCodes.ESC && isEditable(document.activeElement) && !window.Omnibar) {
                document.activeElement.blur();
                window.stopEventPropagation(event, true);
            }
        }, true);
        window.addEventListener('keyup', function(event) {
            Normal.surfingkeysHold = 0;
            if (window.stopKeyupPropagation) {
                event.stopImmediatePropagation();
                window.stopKeyupPropagation = false;
            }
        }, true);
    };

    return self;
})();
