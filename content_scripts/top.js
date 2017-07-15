var frontendFrame = (function() {
    var self = {};
    var uiHost = document.createElement("div");
    uiHost.style.display = "block";
    uiHost.style.opacity = 1;
    var frontEndURL = chrome.runtime.getURL('pages/frontend.html');
    var ifr = $('<iframe allowtransparency=true frameborder=0 scrolling=no class=sk_ui src="{0}" />'.format(frontEndURL));
    uiHost.createShadowRoot();
    var sk_style = document.createElement("style");
    sk_style.innerHTML = '@import url("{0}");'.format(chrome.runtime.getURL("pages/shadow.css"));
    uiHost.shadowRoot.appendChild(sk_style);
    ifr.appendTo(uiHost.shadowRoot);

    ifr[0].addEventListener("load", function() {
        this.contentWindow.postMessage({
            action: 'initFrontend',
            ack: true,
            origin: getDocumentOrigin()
        }, frontEndURL);
    }, false);

    document.documentElement.appendChild(uiHost);

    var lastStateOfPointerEvents = "none", _origOverflow;
    var _actions = {}, activeContent = null;
    _actions['initFrontendAck'] = function(response) {
        $(document).trigger("surfingkeys:frontendReady");
    };
    _actions['setFrontFrame'] = function(response) {
        ifr.css('height', response.frameHeight);
        if (response.pointerEvents) {
            ifr.css('pointer-events', response.pointerEvents);
        }
        if (response.pointerEvents === "none") {
            uiHost.blur();
            // test with https://docs.google.com/ and https://web.whatsapp.com/
            if (lastStateOfPointerEvents !== response.pointerEvents) {
                activeContent.window.postMessage({
                    action: 'getBackFocus',
                    commandToContent: true
                }, activeContent.origin);
            }
            if (document.body) {
                document.body.style.animationFillMode = "";
                document.body.style.overflow = _origOverflow;
            }
        } else {
            if (document.body) {
                document.body.style.animationFillMode = "none";
                _origOverflow = document.body.style.overflow;
                document.body.style.overflow = 'visible';
            }
        }
        lastStateOfPointerEvents = response.pointerEvents;
    };

    window.addEventListener('message', function(event) {
        var _message = event.data;
        if (_message.commandToFrontend || _message.responseToFrontend) {
            // forward message to frontend
            ifr[0].contentWindow.postMessage(_message, frontEndURL);
            if (_message.commandToFrontend) {
                if (_message.origin && !_message.automatic) {
                    // if the message is auto triggered rather than by user
                    // we won't change activeContent here.
                    if (!activeContent || activeContent.window !== event.source) {

                        if (activeContent) {
                            activeContent.window.postMessage({
                                action: 'deactivated',
                                direct: true,
                                reason: `${_message.action}@${event.timeStamp}`,
                                commandToContent: true
                            }, activeContent.origin);
                        }

                        activeContent = {
                            window: event.source,
                            origin: _message.origin
                        };
                        // update usage for user defined mappings.
                        activeContent.window.postMessage({
                            action: 'activated',
                            direct: true,
                            reason: `${_message.action}@${event.timeStamp}`,
                            commandToContent: true
                        }, activeContent.origin);
                    }
                }
            }
        } else if (_message.commandToContent || _message.responseToContent) {
            // forward message to content
            if (activeContent && !_message.direct && activeContent.window !== top) {
                activeContent.window.postMessage(_message, activeContent.origin);
            }
        } else if (_message.action && _actions.hasOwnProperty(_message.action)) {
            _actions[_message.action](_message);
        } else {
            console.log(_message);
        }
    }, true);

    return self;
})();

document.addEventListener('DOMContentLoaded', function(e) {

    runtime.command({
        action: 'tabURLAccessed',
        title: document.title,
        url: window.location.href
    });

    setTimeout(function() {
        // to avoid conflict with pdf extension: chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/
        for (var p in AutoCommands) {
            var c = AutoCommands[p];
            if (c.regex.test(window.location.href)) {
                c.code();
            }
        }
    }, 0);
});

function _setScrollPos(x, y) {
    $(document).ready(function() {
        document.body.scrollLeft = x;
        document.body.scrollTop = y;
    });
}
