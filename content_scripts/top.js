// Hook focus on top window on load
// test with http://askubuntu.com/questions/529781/upgrade-from-gdb-7-7-to-7-8
var TopHook = (function(mode) {
    var self = $.extend({name: "TopHook", eventListeners: {}}, mode);

    self.addEventListener('blur', function(event) {
        setTimeout(function() {
            window.focus();
        }, 0);
    });

    self.enter = function(priority) {
        mode.enter.call(self, priority);
    };

    self.addEventListener('mousedown', function(event) {
        self.exit();
    });

    self.addEventListener('keydown', function(event) {
        self.exit();
    });

    self.addEventListener('pushState', function(event) {
        event.sk_suppressed = true;
        Insert.exit();
    });

    return self;
})(Mode);
TopHook.enter(9999);

var frontendFrame = (function() {
    var self = {};
    var uiHost = document.createElement("div");
    var frontEndURL = chrome.runtime.getURL('pages/frontend.html');
    var ifr = $('<iframe allowtransparency=true frameborder=0 scrolling=no class=sk_ui src="{0}" />'.format(frontEndURL));
    uiHost.createShadowRoot();
    var sk_style = document.createElement("style");
    sk_style.innerHTML = '@import url("{0}");'.format(chrome.runtime.getURL("pages/shadow.css"));
    uiHost.shadowRoot.appendChild(sk_style);
    ifr.appendTo(uiHost.shadowRoot);

    function initPort() {
        this.contentWindow.postMessage({
            action: 'initPort',
            from: 'top'
        }, frontEndURL, [this.channel.port2]);
        self.contentWindow = this.contentWindow;
        $(document).trigger("surfingkeys:frontendReady");
    }

    self.setFrontFrame = function(response) {
        ifr.css('height', response.frameHeight);
        if (response.pointerEvents) {
            ifr.css('pointer-events', response.pointerEvents);
        }
        if (response.pointerEvents === "none") {
            uiHost.blur();
        }
    };
    self.create = function() {
        ifr[0].channel = new MessageChannel();
        ifr[0].channel.port1.onmessage = function(message) {
            var _message = message.data;
            if (_message.action && self.hasOwnProperty(_message.action)) {
                var ret = self[_message.action](_message);
                if (ret) {
                    _message.data = ret;
                    self.contentWindow.postMessage(_message, frontEndURL);
                }
            }
        };
        ifr[0].removeEventListener("load", initPort, false);
        ifr[0].addEventListener("load", initPort, false);

        document.body.appendChild(uiHost);
    };

    return self;
})();

document.addEventListener('DOMContentLoaded', function(e) {

    runtime.command({
        action: 'tabURLAccessed',
        title: document.title,
        url: window.location.href
    });

    var fakeBody = $('body[createdBySurfingkeys=1]');
    if (fakeBody.length) {
        fakeBody.remove();
        frontendFrame.contentWindow = null;
    }
    setTimeout(function() {
        // to avoid conflict with pdf extension: chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/
        createFrontEnd();
        for (var p in AutoCommands) {
            var c = AutoCommands[p];
            if (c.regex.test(window.location.href)) {
                c.code();
            }
        }
    }, 0);
});
function createFrontEnd() {
    if (!frontendFrame) {
        return;
    }
    var frontendReady = frontendFrame.contentWindow && frontendFrame.contentWindow.top === top;
    if (!frontendReady) {
        if (!document.body) {
            var dom = document.implementation.createDocument('http://www.w3.org/1999/xhtml', 'html', null);
            var body = dom.createElement("body");
            $(body).attr('createdBySurfingkeys', 1);
            document.documentElement.appendChild(body);
        }
        frontendFrame.create();
        frontendReady = true;
    }
    return frontendReady;
}

function _setScrollPos(x, y) {
    $(document).ready(function() {
        document.body.scrollLeft = x;
        document.body.scrollTop = y;
    });
}
