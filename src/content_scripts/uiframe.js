import { LOG } from '../common/utils.js';
import { runtime } from './common/runtime.js';
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

    // Messages queued while the UI host is detached from the page.
    var _pendingFrontendMessages = [];

    function _ensureFrontendAttached() {
        // Some pages replace/remove document.documentElement, which orphans
        // our UI host and discards the iframe's browsing context (making
        // ifr.contentWindow null). Re-insert it so the iframe reloads and
        // re-runs the init handshake below.
        if (!uiHost.isConnected) {
            (document.documentElement || document).appendChild(uiHost);
        }
    }

    function _postToFrontend(data) {
        _ensureFrontendAttached();
        if (uiHost.isConnected && ifr.contentWindow) {
            ifr.contentWindow.postMessage(data, frontEndURL);
        } else {
            // Iframe is reloading after a re-attach; deliver once it's ready.
            _pendingFrontendMessages.push(data);
        }
    }

    function _flushPendingToFrontend() {
        while (_pendingFrontendMessages.length && ifr.contentWindow) {
            ifr.contentWindow.postMessage(_pendingFrontendMessages.shift(), frontEndURL);
        }
    }

    function _onWindowMessage(event) {
        var _message = event.data && event.data.surfingkeys_uihost_data;
        if (_message === undefined) {
            return;
        }
        if (_message.toFrontend) {
            // forward message to frontend
            _postToFrontend({surfingkeys_frontend_data: _message});
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

        // addEventListener de-dupes the same handler, so re-running this on
        // an iframe reload (after re-attach) won't double-register.
        window.addEventListener('message', _onWindowMessage, true);

        // Deliver anything queued while the iframe was detached.
        _flushPendingToFrontend();
    });

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

    uiHost.tryDetach = function() {
        if (!ifr.contentWindow) {
            // Page already orphaned the host; nothing to ask, just clean up.
            window.removeEventListener('message', _onWindowMessage, true);
            uiHost.remove();
            return;
        }
        ifr.contentWindow.postMessage({surfingkeys_frontend_data: {
            action: 'destroyFrontend',
            ack: true,
            origin: getDocumentOrigin()
        }}, frontEndURL);
    };
    _actions['destroyFrontendAck'] = function(response) {
        if (response.data === true) {
            runtime.postTopMessage({surfingkeys_content_data: {
                action: 'frontendDestroyed',
            }});
            window.removeEventListener('message', _onWindowMessage, true);
            uiHost.remove();
        } else {
            LOG("warn", "frontend in use");
        }
    };
    document.documentElement.appendChild(uiHost);
}

export default createUiHost;
