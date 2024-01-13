import {
    getBrowserName,
    getDocumentOrigin
} from './common/utils.js';

function createUiHost(browser, onload) {
    var uiHost = document.createElement("div");
    uiHost.style.display = "block";
    uiHost.style.opacity = 1;
    uiHost.style.colorScheme = "light";
    var frontEndURL = chrome.runtime.getURL('pages/frontend.html');
    var ifr = document.createElement("iframe");
    ifr.setAttribute('allowtransparency', true);
    ifr.setAttribute('frameborder', 0);
    ifr.setAttribute('scrolling', "no");
    ifr.setAttribute('class', "sk_ui");
    ifr.setAttribute('src', frontEndURL);
    ifr.setAttribute('title', "Surfingkeys");
    ifr.style.position = "fixed";
    ifr.style.left = 0;
    ifr.style.bottom = 0;
    ifr.style.width = "100%";
    ifr.style.height = 0;
    ifr.style.zIndex = 2147483647;
    uiHost.attachShadow({ mode: 'open' });
    uiHost.shadowRoot.appendChild(ifr);

    function _onWindowMessage(event) {
        var _message = event.data && event.data.surfingkeys_uihost_data;
        if (_message === undefined) {
            return;
        }
        if (_message.toFrontend) {
            // forward message to frontend
            ifr.contentWindow.postMessage({surfingkeys_frontend_data: _message}, frontEndURL);
            if (_message.toFrontend && event.source
                && ['showStatus', 'showEditor', 'openOmnibar', 'openFinder', 'chooseTab'].indexOf(_message.action) !== -1) {
                if (!activeContent || activeContent.window !== event.source) {
                    // reset active Content

                    if (activeContent) {
                        activeContent.window.postMessage({surfingkeys_content_data: {
                            action: 'deactivated',
                            reason: `${_message.action}@${event.timeStamp}`
                        }}, activeContent.origin);
                    }

                    activeContent = {
                        window: event.source,
                        origin: _message.origin
                    };

                    activeContent.window.postMessage({surfingkeys_content_data: {
                        action: 'activated',
                        reason: `${_message.action}@${event.timeStamp}`
                    }}, activeContent.origin);
                }
            }
        } else if (_message.action && _actions.hasOwnProperty(_message.action)) {
            _actions[_message.action](_message);
        } else if (_message.toContent) {
            // forward message to content
            if (activeContent) {
                activeContent.window.postMessage({surfingkeys_content_data: _message}, activeContent.origin);
            }
        }
        event.stopImmediatePropagation();
    }

    // top -> frontend: origin
    // frontend -> top:
    // top -> top: apply user settings
    ifr.addEventListener("load", function() {
        this.contentWindow.postMessage({surfingkeys_frontend_data: {
            action: 'initFrontend',
            ack: true,
            winSize: [window.innerWidth, window.innerHeight],
            origin: getDocumentOrigin()
        }}, frontEndURL);

        window.addEventListener('message', _onWindowMessage, true);

    }, {once: true});

    var lastStateOfPointerEvents = "none", _origOverflowY;
    var _actions = {}, activeContent = null;
    _actions['initFrontendAck'] = function(response) {
        onload(uiHost);
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
                if (browser.getBackFocusFromFrontend) {
                    browser.getBackFocusFromFrontend();
                } else {
                    activeContent.window.postMessage({surfingkeys_content_data: {
                        action: 'getBackFocus'
                    }}, activeContent.origin);
                }
            }
            if (document.body) {
                document.body.style.animationFillMode = "";
                document.body.style.overflowY = _origOverflowY;
            }
        } else {
            if (browser.focusFrontend) {
                browser.focusFrontend(ifr);
            }
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

    uiHost.detach = function() {
        window.removeEventListener('message', _onWindowMessage, true);
        uiHost.remove();
    };
    document.documentElement.appendChild(uiHost);
}

export default createUiHost;
