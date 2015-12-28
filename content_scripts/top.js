var frontendFrame = (function() {
    var self = {
        successById: {},
        actions: {}
    };
    var uiHost = document.createElement("div");
    uiHost.createShadowRoot();
    var sk_style = document.createElement("style");
    sk_style.innerHTML = '@import url("{0}");'.format(chrome.runtime.getURL("pages/shadow.css"));
    uiHost.shadowRoot.appendChild(sk_style);
    var frontEndURL = chrome.runtime.getURL('pages/frontend.html');
    var ifr = $('<iframe allowtransparency=true frameborder=0 scrolling=no class=sk_ui src="{0}" />'.format(frontEndURL));
    ifr.appendTo(uiHost.shadowRoot);

    document.lastElementChild.appendChild(uiHost);

    var channel = new MessageChannel();
    channel.port1.onmessage = function(message) {
        var response = message.data;
        if (self.successById[response.id]) {
            var f = self.successById[response.id];
            delete self.successById[response.id];
            f(response);
        } else if (self.actions[response.action]) {
            self.actions[response.action](response);
        }
        ifr.css('height', response.frameHeight);
        if (response.frameHeight === '0px') {
            uiHost.blur();
        }
    };

    ifr[0].addEventListener("load", function() {
        this.contentWindow.postMessage({
            action: 'initPort',
            from: 'top'
        }, frontEndURL, [channel.port2]);
        self.contentWindow = this.contentWindow;
    }, false);

    return self;
})();

$(document).on('surfingkeys:settingsApplied', function(e) {
    runtime.runtime_handlers['getBlacklist'] = function(msg, sender, response) {
        response({
            "all": runtime.settings.blacklist.hasOwnProperty('.*'),
            "this": runtime.settings.blacklist.hasOwnProperty(window.location.origin),
            "origin": window.location.origin
        });
    };
    runtime.runtime_handlers['toggleBlacklist'] = function(msg, sender, response) {
        if (runtime.settings.blacklist.hasOwnProperty(msg.origin)) {
            delete runtime.settings.blacklist[msg.origin];
        } else {
            runtime.settings.blacklist[msg.origin] = 1;
        }
        RUNTIME('updateSettings', {
            settings: {
                blacklist: runtime.settings.blacklist
            }
        });
        response({
            "all": runtime.settings.blacklist.hasOwnProperty('.*'),
            "this": runtime.settings.blacklist.hasOwnProperty(window.location.origin),
            "origin": window.location.origin
        });
    };

    runtime.command({
        action: 'setSurfingkeysIcon',
        status: Normal.isBlacklisted()
    });
});

document.addEventListener('DOMContentLoaded', function(e) {
    setTimeout(function() {
        for (var p in AutoCommands) {
            var c = AutoCommands[p];
            if (c.regex.test(window.location.href)) {
                c.code();
            }
        }
    }, 0);
});

function prepareFrames() {
    var frames = Array.prototype.slice.call(top.document.querySelectorAll('iframe')).map(function(f) {
        return f.contentWindow;
    });
    frames.unshift(top);
    frames = frames.map(function(f) {
        try {
            f.frameId = f.frameId || generateQuickGuid();
            if (f.innerWidth * f.innerHeight === 0) {
                return null;
            }
        } catch (e) {
            return null;
        }
        return f.frameId;
    });
    return frames.filter(function(f) {
        return f !== null;
    });
};
