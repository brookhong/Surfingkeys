import {
    getVisibleElements,
} from './utils.js';

import Mode from './mode';

function isElementPositionRelative(elm) {
    while (elm !== document.body) {
        if (getComputedStyle(elm).position === "relative") {
            return true;
        }
        elm = elm.parentElement;
    }
    return false;
}

function startScrollNodeObserver(normal) {
    var getDocumentBody = new Promise(function(resolve, reject) {
        if (document.body) {
            resolve(document.body);
        } else {
            document.addEventListener('DOMContentLoaded', function() {
                resolve(document.body);
            });
        }
    });

    var pendingUpdater = undefined, DOMObserver = new MutationObserver(function (mutations) {
        var addedNodes = [];
        for (var m of mutations) {
            for (var n of m.addedNodes) {
                if (n.nodeType === Node.ELEMENT_NODE && !n.fromSurfingKeys) {
                    n.newlyCreated = true;
                    addedNodes.push(n);
                }
            }
        }

        if (addedNodes.length) {
            if (pendingUpdater) {
                clearTimeout(pendingUpdater);
                pendingUpdater = undefined;
            }
            pendingUpdater = setTimeout(function() {
                var possibleModalElements = getVisibleElements(function(e, v) {
                    var br = e.getBoundingClientRect();
                    if (br.width > 300 && br.height > 300
                        && br.width <= window.innerWidth && br.height <= window.innerHeight
                        && br.top >= 0 && br.left >= 0
                        && Mode.hasScroll(e, 'y', 16)
                        && isElementPositionRelative(e)
                    ) {
                        v.push(e);
                    }
                });

                if (possibleModalElements.length) {
                    normal.addScrollableElement(possibleModalElements[0]);
                }
            }, 200);
        }
    });
    DOMObserver.isConnected = false;

    document.addEventListener("surfingkeys:turnOnDOMObserver", function(evt) {
        if (!DOMObserver.isConnected) {
            getDocumentBody.then(function(body) {
                DOMObserver.observe(body, { childList: true, subtree:true });
                DOMObserver.isConnected = true;
            });
        }
    });

    document.addEventListener("surfingkeys:turnOffDOMObserver", function(evt) {
        if (DOMObserver.isConnected) {
            DOMObserver.disconnect();
            DOMObserver.isConnected = false;
        }
    });
}

export default startScrollNodeObserver;
