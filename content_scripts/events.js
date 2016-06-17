var Events = (function() {
    var self = {
        hotKey: '<Alt-s>'
    };

    self.isBlacklisted = function() {
        return runtime.settings.blacklist[window.location.origin] || runtime.settings.blacklist['.*']
            || (runtime.settings.blacklistPattern && typeof(runtime.settings.blacklistPattern.test) === "function" && runtime.settings.blacklistPattern.test(window.location.href));
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
            Disabled.enter();
        } else if (self.needGetBackFocus && typeof(Omnibar) === 'undefined') {
            GetBackFocus.enter();
            self.needGetBackFocus = false;
        }

    }

    self.resetMode = function() {
        if (Mode.stack().length === 0) {
            // if mode stack is empty, enter normal mode automatically
            Normal.enter();
            self.needGetBackFocus = true;
        }
        if (document.body) {
            blackList()
        } else {
            $(document).ready(blackList);
        }
    };

    return self;
})();
