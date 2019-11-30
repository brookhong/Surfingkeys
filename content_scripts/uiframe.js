function createUiHost() {
    var uiHost = document.createElement("div");
    uiHost.style.display = "block";
    uiHost.style.opacity = 1;
    var frontEndURL = chrome.runtime.getURL('pages/frontend.html');
    var ifr = createElement(`<iframe allowtransparency="true" frameborder="0" scrolling="no" class="sk_ui" src="${frontEndURL}" title="Surfingkeys" />`);
    uiHost.attachShadow({mode:'open'});
    var sk_style = document.createElement("style");
    setInnerHTML(sk_style, `@import url("${chrome.runtime.getURL("pages/shadow.css")}");`);
    uiHost.shadowRoot.appendChild(sk_style);
    uiHost.shadowRoot.appendChild(ifr);

    function _onWindowMessage(event) {
        var _message = event.data;
        if (_message === undefined) {
            return;
        }
        if (_message.commandToFrontend || _message.responseToFrontend) {
            // forward message to frontend
            ifr.contentWindow.postMessage(_message, frontEndURL);
            if (_message.commandToFrontend && event.source && _message.action === 'showStatus') {
                if (!activeContent || activeContent.window !== event.source) {
                    // reset active Content

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

                    activeContent.window.postMessage({
                        action: 'activated',
                        direct: true,
                        reason: `${_message.action}@${event.timeStamp}`,
                        commandToContent: true
                    }, activeContent.origin);
                }
            }
            if (_message.action === "visualUpdatedForFirefox") {
                document.activeElement.blur();
            }
        } else if (_message.action && _actions.hasOwnProperty(_message.action)) {
            _actions[_message.action](_message);
        } else if (_message.commandToContent || _message.responseToContent) {
            // forward message to content
            if (activeContent && !_message.direct && activeContent.window !== top) {
                activeContent.window.postMessage(_message, activeContent.origin);
            }
        }
    }

    ifr.addEventListener("load", function() {
        this.contentWindow.postMessage({
            action: 'initFrontend',
            ack: true,
            origin: getDocumentOrigin()
        }, frontEndURL);

        window.addEventListener('message', _onWindowMessage, true);

    }, {once: true});

    var lastStateOfPointerEvents = "none", _origOverflowY;
    var _actions = {}, activeContent = null;
    _actions['initFrontendAck'] = function(response) {
        if (Front.resolve) {
            Front.resolve(window.location.href);
            Front.resolve = null;
        }
        Front.applyUserSettings();
    };
    _actions['setFrontFrame'] = function(response) {
        ifr.style.height = response.frameHeight;
        if (response.pointerEvents) {
            ifr.style.pointerEvents = response.pointerEvents;
        }
        if (response.pointerEvents === "none") {
            uiHost.blur();
            ifr.blur();
            // test with https://docs.google.com/ and https://web.whatsapp.com/
            if (lastStateOfPointerEvents !== response.pointerEvents && activeContent) {
                activeContent.window.postMessage({
                    action: 'getBackFocus',
                    commandToContent: true
                }, activeContent.origin);
            }
            if (document.body) {
                document.body.style.animationFillMode = "";
                document.body.style.overflowY = _origOverflowY;
            }
        } else {
            if (document.body) {
                document.body.style.animationFillMode = "none";
                if (_origOverflowY === undefined) {
                    _origOverflowY = document.body.style.overflowY;
                }
                document.body.style.overflowY = 'visible';
            }
        }
        lastStateOfPointerEvents = response.pointerEvents;
    };

    function _onBeforeunload() {
        uiHost.remove();
    }
    window.addEventListener('beforeunload', _onBeforeunload);

    uiHost.detach = function() {
        window.removeEventListener('message', _onWindowMessage, true);
        window.removeEventListener('beforeunload', _onBeforeunload);
    };
    return uiHost;
}
