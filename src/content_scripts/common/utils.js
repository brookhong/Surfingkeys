import DOMPurify from "dompurify";
import KeyboardUtils from './keyboardUtils';
import { RUNTIME, dispatchSKEvent, runtime } from './runtime.js';

const colors = [
    '#4169E1', // Royal Blue
    '#E74C3C', // Bright Red
    '#2ECC71', // Emerald Green
    '#9B59B6', // Amethyst Purple
    '#F39C12', // Orange
    '#16A085', // Teal
    '#E67E22', // Dark Orange
    '#3498DB', // Bright Blue
    '#C0392B', // Dark Red
    '#27AE60', // Forest Green
    '#8E44AD', // Wisteria Purple
    '#D35400', // Pumpkin Orange
    '#2980B9', // Ocean Blue
    '#FF5733', // Coral Red
    '#1ABC9C', // Turquoise
    '#8B008B', // Dark Magenta
    '#F1C40F', // Yellow
    '#008080', // Dark Teal
    '#FF8C00', // Dark Orange
    '#4682B4', // Steel Blue
    '#8B0000', // Dark Red
    '#32CD32', // Lime Green
    '#9932CC', // Dark Orchid
    '#FF4500', // Orange Red
    '#1E90FF', // Dodger Blue
    '#DC143C', // Crimson
    '#20B2AA', // Light Sea Green
    '#BA55D3', // Medium Orchid
    '#DAA520', // Goldenrod
    '#008B8B', // Dark Cyan
    '#CD853F', // Peru
    '#6495ED', // Cornflower Blue
    '#B22222', // Fire Brick
    '#3CB371', // Medium Sea Green
    '#9370DB', // Medium Purple
    '#A0522D', // Sienna
    '#87CEEB', // Sky Blue
    '#CD5C5C', // Indian Red
    '#48D1CC', // Medium Turquoise
    '#DDA0DD', // Plum
    '#FFD700', // Gold
    '#5F9EA0', // Cadet Blue
    '#FFA07A', // Light Salmon
    '#00BFFF', // Deep Sky Blue
    '#8B4513', // Saddle Brown
    '#90EE90', // Light Green
    '#FF69B4', // Hot Pink
    '#D2691E', // Chocolate
    '#B0C4DE', // Light Steel Blue
    '#FA8072', // Salmon
    '#66CDAA', // Medium Aquamarine
    '#DB7093', // Pale Violet Red
    '#FF8C69', // Salmon Pink
    '#556B2F', // Dark Olive Green
    '#FF7F50', // Coral
    '#2E8B57', // Sea Green
    '#9400D3', // Dark Violet
    '#B8860B', // Dark Goldenrod
    '#FF6347', // Tomato
    '#40E0D0', // Turquoise
    '#DA70D6', // Orchid
    '#BDB76B', // Dark Khaki
    '#F4A460', // Sandy Brown
    '#87CEFA', // Light Sky Blue
    '#98FB98', // Pale Green
    '#C71585', // Medium Violet Red
    '#B0E0E6', // Powder Blue
    '#F08080', // Light Coral
    '#7FFFD4', // Aquamarine
    '#FFA500', // Orange
    '#FF6B6B', // Light Red
    '#00CED1', // Dark Turquoise
    '#E9967A', // Dark Salmon
    '#4B0082', // Indigo
    '#7B68EE', // Medium Slate Blue
    '#6A5ACD', // Slate Blue
    '#483D8B', // Dark Slate Blue
    '#5D478B', // Medium Purple 4
    '#8A2BE2', // Blue Violet
    '#7EC0EE', // Sky Blue 2
    '#009ACD', // Deep Sky Blue 3
    '#00868B', // Turquoise 4
    '#00C78C', // Medium Spring Green
    '#00CD66', // Spring Green 3
    '#66CD00', // Chartreuse 3
    '#CDCD00', // Yellow 3
    '#CD9B1D', // Goldenrod 3
    '#CD6600', // Dark Orange 3
    '#CD4F39', // Tomato 3
    '#CD3278', // Violet Red 3
    '#CD3333', // Brown 3
    '#8B4789', // Orchid 4
    '#8B8B00', // Yellow 4
    '#8B7355', // Rosy Brown 4
    '#8B636C', // Pink 4
    '#2F4F4F', // Dark Slate Gray
    '#FF1493', // Deep Pink
    '#800080', // Purple
    '#708090', // Slate Gray
    '#6B8E23'  // Olive Drab
];
function getColor(i) {
    return colors[i];
}

/**
 * Map the key sequence `lhs` to `rhs` for mode `ctx` in ACE editor.
 *
 * @param {string} lhs a key sequence to replace
 * @param {string} rhs a key sequence to be replaced
 * @param {string} ctx a mode such as `insert`, `normal`.
 *
 * @example aceVimMap('J', ':bn', 'normal');
 */
function aceVimMap(lhs, rhs, ctx) {
    dispatchSKEvent("front", ['addVimMap', lhs, rhs, ctx]);
}

/**
 * Add map key in ACE editor.
 *
 * @param {object} objects multiple objects to define key map in ACE, see more from [ace/keyboard/vim.js](https://github.com/ajaxorg/ace/blob/ec450c03b51aba3724cf90bb133708078d1f3de6/lib/ace/keyboard/vim.js#L927-L1099)
 *
 * @example
 * addVimMapKey(
 *     {
 *         keys: 'n',
 *         type: 'motion',
 *         motion: 'moveByCharacters',
 *         motionArgs: {
 *             forward: false
 *         }
 *     },
 *
 *     {
 *         keys: 'e',
 *         type: 'motion',
 *         motion: 'moveByLines',
 *         motionArgs: {
 *             forward: true,
 *             linewise: true
 *         }
 *     }
 * );
 */
function addVimMapKey() {
    dispatchSKEvent("front", ['addVimKeyMap', Array.from(arguments)]);
}

function isEmptyObject(obj) {
    for (var name in obj) {
        return false;
    }
    return true;
}

function applyUserSettings(delta) {
    if (delta.error !== "") {
        if (window === top) {
            showPopup("[SurfingKeys] Error found in settings: " + delta.error);
        } else {
            console.log("[SurfingKeys] Error found in settings({0}): {1}".format(window.location.href, delta.error));
        }
    }
    if (!isEmptyObject(delta.settings)) {
        dispatchSKEvent("front", ['applySettingsFromSnippets', delta.settings]);
    }
}

/**
 * Get current browser name
 * @returns {string} "Chrome" | "Firefox" | "Safari"
 *
 */
function getBrowserName() {
    if (window.navigator.userAgent.indexOf("Chrome") !== -1) {
        return "Chrome";
    } else if (window.navigator.vendor.indexOf("Apple Computer, Inc.") === 0) {
        let isIOS = /iPad|iPhone|iPod/.test(navigator.platform)
            || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        return isIOS ? "Safari-iOS" : "Safari";
    } else if (window.navigator.userAgent.indexOf("Firefox") !== -1) {
        return "Firefox";
    }
    return "Chrome";
}

function isInUIFrame() {
    return window !== top && document.location.href.indexOf(chrome.runtime.getURL("/")) === 0;
}

function timeStampString(t) {
    var dt = new Date();
    dt.setTime(t);
    return dt.toLocaleString();
}

function getDocumentOrigin() {
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
    // Lastly, posting a message to a page at a file: URL currently requires that the targetOrigin argument be "*".
    // file:// cannot be used as a security restriction; this restriction may be modified in the future.
    // Firefox provides window.origin instead of document.origin.
    var origin = window.location.origin ? window.location.origin : "*";
    if (origin === "file://" || origin === "null") {
        origin = "*";
    }
    return origin;
}

function generateQuickGuid() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function listElements(root, whatToShow, filter) {
    const elms = [];
    let currentNode;
    const nodeIterator = document.createNodeIterator(
        root,
        whatToShow,
        null
    );

    while (currentNode = nodeIterator.nextNode()) {
        filter(currentNode) && elms.push(currentNode);

        if (currentNode.shadowRoot) {
            elms.push(...listElements(currentNode.shadowRoot, whatToShow, filter));
        }
    }

    return elms;
}

function isElementVisible(elm) {
    return elm.offsetHeight > 0 && elm.offsetWidth > 0;
}

function isElementClickable(e) {
    var cssSelector = "a, button, select, input, textarea, summary, *[onclick], *[contenteditable=true], *.jfk-button, *.goog-flat-menu-button, *[role=button], *[role=link], *[role=menuitem], *[role=option], *[role=switch], *[role=tab], *[role=checkbox], *[role=combobox], *[role=menuitemcheckbox], *[role=menuitemradio]";
    if (runtime.conf.clickableSelector.length) {
        cssSelector += ", " + runtime.conf.clickableSelector;
    }

    return e.matches(cssSelector)
        || getComputedStyle(e).cursor === "pointer"
        || getComputedStyle(e).cursor.substr(0, 4) === "url("
        || e.closest("a, *[onclick], *[contenteditable=true], *.jfk-button, *.goog-flat-menu-button") !== null;
}

/**
 * Show message in banner.
 *
 * @param {string} msg the message to be displayed in banner.
 * @param {number} [timeout=1600] milliseconds after which the banner will disappear.
 * @name Front.showBanner
 *
 * @example
 * Front.showBanner(window.location.href);
 */
function showBanner(msg, timeout) {
    dispatchSKEvent("front", ['showBanner', msg, timeout])
}

/**
 * Show message in popup.
 *
 * @param {string} msg the message to be displayed in popup.
 * @name Front.showPopup
 *
 * @example
 * Front.showPopup(window.location.href);
 */
function showPopup(msg) {
    dispatchSKEvent("front", ['showPopup', msg])
}

function openOmnibar(args) {
    dispatchSKEvent("front", ['openOmnibar', args])
}

function initSKFunctionListener(name, interfaces, capture) {
    const callbacks = {};

    const opts = capture ? {capture: true} : {};
    document.addEventListener(`surfingkeys:${name}`, function(evt) {
        let args = evt.detail;
        const fk = args.shift();
        if (capture) {
            if (args.length > 0 && args[0].constructor.name === "Array" && args[0][0] === "__EVENT_TARGET__") {
                // restore args from evt.target, see src/content_scripts/common/hints.js:442
                args[0][0] = evt.target;
            } else {
                args.push(evt.target);
            }
        }

        if (callbacks.hasOwnProperty(fk)) {
            callbacks[fk](...args);
            delete callbacks[fk];
        } if (interfaces.hasOwnProperty(fk)) {
            interfaces[fk](...args);
        }
    }, opts);

    return callbacks;
}

function dispatchMouseEvent(element, events, modifiers) {
    events.forEach(function(eventName) {
        const event = new MouseEvent(eventName, {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: window,
            ctrlKey: modifiers.ctrlKey,
            altKey: modifiers.altKey,
            shiftKey: modifiers.shiftKey,
            metaKey: modifiers.metaKey
        });
        element.dispatchEvent(event);
    });
}

function getRealEdit(event) {
    var rt = event ? event.target : document.activeElement;
    // on some pages like chrome://history/, input is in shadowRoot of several other recursive shadowRoots.
    while (rt && rt.shadowRoot) {
        if (rt.shadowRoot.activeElement) {
            rt = rt.shadowRoot.activeElement;
        } else if (rt.shadowRoot.querySelector('input, textarea, select')) {
            rt = rt.shadowRoot.querySelector('input, textarea, select');
            break;
        } else {
            break;
        }
    }
    if (rt === window) {
        rt = document.body;
    }
    return rt;
}

function toggleQuote() {
    var elm = getRealEdit(), val = elm.value;
    if (val.match(/^"|"$/)) {
        elm.value = val.replace(/^"?(.*?)"?$/, '$1');
    } else {
        elm.value = '"' + val + '"';
    }
}

function isEditable(element) {
    return element
        && !element.disabled && (element.localName === 'textarea'
        || element.localName === 'select'
        || element.isContentEditable
        || (element.matches && element.matches(runtime.conf.editableSelector))
        || (element.localName === 'input' && /^(?!button|checkbox|file|hidden|image|radio|reset|submit)/i.test(element.type)));
}

function parseQueryString(query) {
    var params = {};
    if (query.length) {
        var parts = query.split('&');
        for (var i = 0, ii = parts.length; i < ii; ++i) {
            var param = parts[i].split('=');
            var key = param[0].toLowerCase();
            var value = param.length > 1 ? param[1] : null;
            params[decodeURIComponent(key)] = decodeURIComponent(value);
        }
    }
    return params;
}

function reportIssue(title, description) {
    title = encodeURIComponent(title);
    description = "%23%23+Error+details%0A%0A{0}%0A%0ASurfingKeys%3A+{1}%0A%0AChrome%3A+{2}%0A%0AURL%3A+{3}%0A%0A%23%23+Context%0A%0A%2A%2APlease+replace+this+with+a+description+of+how+you+were+using+SurfingKeys.%2A%2A".format(encodeURIComponent(description), chrome.runtime.getManifest().version, encodeURIComponent(navigator.userAgent), encodeURIComponent(window.location.href));
    var error = '<h2>Uh-oh! The SurfingKeys extension encountered a bug.</h2> <p>Please click <a href="https://github.com/brookhong/Surfingkeys/issues/new?title={0}&body={1}" target=_blank>here</a> to start filing a new issue, append a description of how you were using SurfingKeys before this message appeared, then submit it.  Thanks for your help!</p>'.format(title, description);

    showPopup(error);
}

function scrollIntoViewIfNeeded(elm, ignoreSize) {
    if (elm.scrollIntoViewIfNeeded) {
        elm.scrollIntoViewIfNeeded();
    } else if (!isElementPartiallyInViewport(elm, ignoreSize)) {
        elm.scrollIntoView();
    }
}

function isElementDrawn(e, rect) {
    var min = isEditable(e) ? 1 : 4;
    rect = rect || e.getBoundingClientRect();
    return rect.width > min && rect.height > min && (parseFloat(getComputedStyle(e).opacity) > 0.1 || e.tagName == "INPUT" && e.type != "text");
}

/**
 * Check whether an element is in viewport.
 *
 * @param {Element} el the element to be checked.
 * @param {boolean} [ignoreSize=false] whether to ignore size of the element, otherwise the element must be with size 4*4.
 * @returns {boolean}
 *
 */
function isElementPartiallyInViewport(el, ignoreSize) {
    var rect = el.getBoundingClientRect();
    var windowHeight = (window.innerHeight || document.documentElement.clientHeight);
    var windowWidth = (window.innerWidth || document.documentElement.clientWidth);

    return (ignoreSize || isElementDrawn(el, rect))
        && (rect.top < windowHeight) && (rect.bottom > 0)
        && (rect.left < windowWidth) && (rect.right > 0);
}

function getVisibleElements(filter) {
    var all = Array.from(document.documentElement.getElementsByTagName("*"));
    var visibleElements = [];
    for (var i = 0; i < all.length; i++) {
        var e = all[i];
        // include elements in a shadowRoot.
        if (e.shadowRoot) {
            var cc = e.shadowRoot.querySelectorAll('*');
            for (var j = 0; j < cc.length; j++) {
                all.push(cc[j]);
            }
        }
        var rect = e.getBoundingClientRect();
        if ( (rect.top <= window.innerHeight) && (rect.bottom >= 0)
            && (rect.left <= window.innerWidth) && (rect.right >= 0)
            && rect.height > 0
            && getComputedStyle(e).visibility !== 'hidden'
        ) {
            filter(e, visibleElements);
        }
    }
    return visibleElements;
}

/**
 * Get large elements that are currently visible in the viewport.
 * A large element is defined as one that takes up a significant portion of the viewport.
 *
 * @param {number} [minWidth=0.3] Minimum width as a fraction of viewport width (0.0 to 1.0)
 * @param {number} [minHeight=0.3] Minimum height as a fraction of viewport height (0.0 to 1.0)
 * @returns {Array<Element>} Array of large visible elements
 *
 * @example
 * // Get elements that are at least 30% of viewport dimensions
 * var largeElements = getLargeElements();
 *
 * // Get elements that are at least 50% of viewport dimensions
 * var veryLargeElements = getLargeElements(0.5, 0.5);
 */
function getLargeElements(minWidth = 0.3, minHeight = 0.3) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const minWidthPx = viewportWidth * minWidth;
    const minHeightPx = viewportHeight * minHeight;

    let lastRect = new DOMRect(0, 0, 0, 0);
    let elements = getVisibleElements((element, visibleElements) => {
        if (element === document.body) return;
        const rect = element.getBoundingClientRect();
        const tolerance = 16;
        if (Math.abs(rect.x - lastRect.x) < tolerance
            && Math.abs(rect.y - lastRect.y) < tolerance
            && Math.abs(rect.width - lastRect.width) < tolerance
            && Math.abs(rect.height - lastRect.height) < tolerance) {
            return;
        }
        if (Math.abs(viewportWidth - rect.width) < 4
            && Math.abs(viewportHeight - rect.height) < 4) {
            return;
        }
        if (rect.width < minWidthPx && rect.height < minHeightPx) return;
        if ((rect.width / viewportWidth) * (rect.height / viewportHeight) < minWidth * minHeight / 6) return;
        const style = getComputedStyle(element);
        if (style.opacity > 0.1 && style.visibility !== 'hidden' && style.display !== 'none') {
            visibleElements.push(element);
            lastRect = rect;
        }
    });
    return elements;
}

function actionWithSelectionPreserved(cb) {
    var selection = document.getSelection();
    var pos = [selection.type, selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset];

    var dt = document.scrollingElement.scrollTop;

    cb(selection);

    document.scrollingElement.scrollTop = dt;

    if (pos[0] === "None") {
        selection.empty();
    } else if (pos[0] === "Caret") {
        selection.setPosition(pos[3], pos[4]);
    } else if (pos[0] === "Range") {
        selection.setPosition(pos[1], pos[2]);
        selection.extend(pos[3], pos[4]);
    }
}

function filterAncestors(elements) {
    if (elements.length === 0) {
        return elements;
    }

    // filter out element which has its children covered
    var result = [];
    elements.forEach(function(e, i) {
        if (isExplicitlyRequested(e)) {
            result.push(e);
        } else {
            for (var j = 0; j < result.length; j++) {
                if (result[j].contains(e)) {
                    if (result[j].tagName !== 'A' || !result[j].href) {
                        result[j] = e;
                    }
                    return;
                } else if (result[j].shadowRoot && result[j].shadowRoot.contains(e)) {
                    // skip child from shadowRoot of a selected element.
                    return;
                } else if (e.contains(result[j])) {
                    console.log("skip: ", e, result[j]);
                    return;
                }
            }
            result.push(e);
        }
    });

    return result;
}

function getRealRect(elm) {
    if (elm.childElementCount === 0) {
        var r = elm.getClientRects();
        if (r.length === 3) {
            // for a clipped A tag
            return r[1];
        } else if (r.length === 2) {
            // for a wrapped A tag
            return r[0];
        } else {
            return elm.getBoundingClientRect();
        }
    } else if (elm.childElementCount === 1 && elm.firstElementChild.textContent) {
        var r = elm.firstElementChild.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) {
            r = elm.getBoundingClientRect();
        }
        return r;
    } else {
        return elm.getBoundingClientRect();
    }
}

function isExplicitlyRequested(element) {
    return runtime.conf.clickableSelector &&
        element.matches(runtime.conf.clickableSelector);
}

function filterOverlapElements(elements) {
    // filter out tiny elements
    elements = elements.filter(function(e) {
        var be = getRealRect(e);
        if (e.disabled || e.readOnly || !isElementDrawn(e, be)) {
            return false;
        } else if (e.matches("input, textarea, select, form")
            || e.contentEditable === "true" || isExplicitlyRequested(e)) {
            return true;
        } else {
            var el = e.getRootNode().elementFromPoint(be.left + be.width/2, be.top + be.height/2);
            return !el || el.shadowRoot && (el.childElementCount === 0 || el.shadowRoot.contains(e)) || el.contains(e) || e.contains(el);
        }
    });

    return filterAncestors(elements);
}

/**
 * Get all clickable elements. SurfingKeys has its own logic to identify clickable elements, such as a `HTMLAnchorElement` or elements with cursor as pointer. This function provides two parameters to identify those clickable elements that SurfingKeys failed to identify.
 *
 * @param {string} selectorString extra css selector of those clickable elements.
 * @param {regex} pattern a regular expression that matches text of the clickable elements.
 * @returns {array} array of clickable elements.
 *
 * @example
 * var elms = getClickableElements("[rel=link]", /click this/);
 */
function getClickableElements(selectorString, pattern) {
    var nodes = listElements(document.body, NodeFilter.SHOW_ELEMENT, function(n) {
        return n.offsetHeight && n.offsetWidth
            && getComputedStyle(n).cursor === "pointer"
            && (n.matches(selectorString)
                || pattern && (
                    pattern.test(n.textContent)
                    || pattern.test(n.getAttribute('aria-label')))
            );
    });
    return filterOverlapElements(nodes);
}

function getTextNodes(root, pattern, flag) {
    var skip_tags = ['script', 'style', 'noscript', 'surfingkeys_mark'];
    var treeWalker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT, {
            acceptNode: function(node) {
                if (!node.data.trim() || !node.parentNode.offsetParent || skip_tags.indexOf(node.parentNode.localName.toLowerCase()) !== -1 || !pattern.test(node.data)) {
                    // node changed, reset pattern.lastIndex
                    pattern.lastIndex = 0;
                    return NodeFilter.FILTER_REJECT;
                }
                var br = node.parentNode.getBoundingClientRect();
                if (br.width < 4 || br.height < 4) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }, false);

    var nodes = [];
    if (flag === 1) {
        nodes.push(treeWalker.firstChild());
    } else if (flag === -1) {
        nodes.push(treeWalker.lastChild());
    } else if (flag === 0) {
        return treeWalker;
    } else if (flag === 2) {
        while (treeWalker.nextNode()) nodes.push(treeWalker.currentNode.parentNode);
    } else {
        while (treeWalker.nextNode()) nodes.push(treeWalker.currentNode);
    }
    return nodes;
}

function getTextNodePos(node, offset, length) {
    var selection = document.getSelection();
    selection.setBaseAndExtent(node, offset, node, length ? (offset + length) : node.data.length);
    var br = selection.rangeCount > 0 ? selection.getRangeAt(0).getClientRects()[0] : null;
    var pos = {
        left: -1,
        top: -1
    };
    if (br && br.height > 0 && br.width > 0) {
        pos.left = br.left;
        pos.top = br.top;
        pos.width = br.width;
        pos.height = br.height;
    }
    return pos;
}

var _focusedRange = document.createRange();
function getTextRect() {
    let rects = [];
    try {
        let start = arguments[1];
        while (rects.length === 0 && start >= 0) {
            _focusedRange.setStart(arguments[0], start);
            if (arguments.length > 3) {
                _focusedRange.setEnd(arguments[2], arguments[3]);
            } else if (arguments.length > 2) {
                _focusedRange.setEnd(arguments[0], arguments[2]);
            } else {
                _focusedRange.setEnd(arguments[0], arguments[1]);
            }
            rects = _focusedRange.getClientRects();
            start --;
        }
    } catch (e) {
        return [];
    }
    return rects;
}

function locateFocusNode(selection) {
    let se = selection.focusNode.parentElement
    scrollIntoViewIfNeeded(se, true);
    var r = getTextRect(selection.focusNode, selection.focusOffset)[0];
    if (!r) {
        r = selection.focusNode.getBoundingClientRect();
    }
    if (r) {
        r = {
            left: r.left,
            top: r.top,
            width: r.width,
            height: r.height
        };
        if (r.left < 0 || r.left >= window.innerWidth) {
            se.scrollLeft += r.left - window.innerWidth / 2;
            r.left = window.innerWidth / 2;
        }
        if (r.top < 0 || r.top >= window.innerHeight) {
            se.scrollTop += r.top - window.innerHeight / 2;
            r.top = window.innerHeight / 2;
        }
        return r;
    }
    return null;
}

function getNearestWord(text, offset) {
    var ret = [0, text.length];
    var nonWord = /\W/;
    if (offset < 0) {
        offset = 0;
    } else if (offset >= text.length) {
        offset = text.length - 1;
    }
    var found = true;
    if (nonWord.test(text[offset])) {
        var delta = 0;
        found = false;
        while (!found && (offset > delta || (offset + delta) < text.length)) {
            delta++;
            found = ((offset - delta) >= 0 && !nonWord.test(text[offset - delta])) || ((offset + delta) < text.length && !nonWord.test(text[offset + delta]));
        }
        offset = ((offset - delta) >= 0 && !nonWord.test(text[offset - delta])) ? (offset - delta) : (offset + delta);
    }
    if (found) {
        var start = offset,
            end = offset;
        while (start >= 0 && !nonWord.test(text[start])) {
            start--;
        }
        while (end < text.length && !nonWord.test(text[end])) {
            end++;
        }
        ret = [start + 1, end - start - 1];
    }
    return ret;
}

var _clickPos = null;
document.addEventListener('mousedown', event => {
    _clickPos = [event.clientX, event.clientY];
});
function getWordUnderCursor(mouseCursor) {
    var selection = document.getSelection();
    if (selection.focusNode && selection.focusNode.textContent) {
        var range = getNearestWord(selection.focusNode.textContent, selection.focusOffset);
        var selRect = getTextRect(selection.focusNode, range[0], range[0] + range[1])[0];
        var word = selection.focusNode.textContent.substr(range[0], range[1]);
        if (selRect && word) {
            if (!mouseCursor || _clickPos && selRect.has(_clickPos[0], _clickPos[1], 0, 0)) {
                return word.trim();
            }
        }
    }
    return null;
}

DOMRect.prototype.has = function (x, y, ex, ey) {
    // allow some errors of x and y as ex and ey respectively.
    return (y > this.top - ey && y < this.bottom + ey
        && x > this.left - ex && x < this.right + ex);
};

function initL10n(cb) {
    const lang = runtime.conf.language || window.navigator.language;
    if (lang === "en-US") {
        cb(function(str) {
            return str;
        });
    } else {
        fetch(chrome.runtime.getURL("pages/l10n.json")).then(function(res) {
            return res.json();
        }).then(function(l10n) {
            if (typeof(l10n[lang]) === "object") {
                l10n = l10n[lang];
                cb(function(str) {
                    return l10n[str] ? l10n[str] : str;
                });
            } else {
                cb(function(str) {
                    return str;
                });
            }
        });
    }
}

String.prototype.format = function() {
    var formatted = this;
    for (var i = 0; i < arguments.length; i++) {
        var regexp = new RegExp('\\{' + i + '\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
};

String.prototype.reverse = function() {
    return this.split("").reverse().join("");
};

RegExp.prototype.toJSON = function() {
    return {source: this.source, flags: this.flags};
};

if (!Array.prototype.flatMap) {
    Array.prototype.flatMap = function(lambda) {
        return Array.prototype.concat.apply([], this.map(lambda));
    };
}

function parseAnnotation(ag) {
    let an = ag.annotation;
    if (an.constructor.name === "String") {
        // for parameterized annotations such as ["#6Search selected with {0}", "Google"]
        an = [an];
    }
    const annotations = an[0].match(/^#(\d+)(.*)/);
    if (annotations !== null) {
        ag.feature_group = parseInt(annotations[1]);
        an[0] = annotations[2];
    }
    // first element must not be ""
    ag.annotation = an[0].length === 0 ? "" : an;
    return ag;
}

function mapInMode(mode, nks, oks, new_annotation) {
    oks = KeyboardUtils.encodeKeystroke(oks);
    var old_map = mode.mappings.find(oks);
    if (old_map) {
        nks = KeyboardUtils.encodeKeystroke(nks);
        mode.mappings.remove(nks);
        // meta.word need to be new
        var meta = Object.assign({}, old_map.meta);
        if (new_annotation) {
            meta = Object.assign(meta, parseAnnotation({ annotation: new_annotation }));
        }
        mode.mappings.add(nks, meta);
        if (!isInUIFrame()) {
            dispatchSKEvent("front", ['addMapkey', mode.name, nks, oks]);
        }
    }
    return old_map;
}

function getAnnotations(mappings) {
    return mappings.getWords().map(function(w) {
        var meta = mappings.find(w).meta;
        return {
            word: w,
            feature_group: meta.feature_group,
            annotation: meta.annotation
        };
    }).filter(function(m) {
        return m.annotation && m.annotation.length > 0;
    });
}

function constructSearchURL(se, word) {
    if (se.indexOf("{0}") > 0) {
        return se.format(word);
    } else if (se.indexOf("%s") > 0) {
        return se.replace("%s", word)
    } else {
        return se + word;
    }
}

/**
 * Open links in new tabs.
 *
 * @param {string} str links to be opened, the links should be split by `\n` if there are more than one.
 * @param {number} [simultaneousness=5] how many tabs will be opened simultaneously, the rest will be queued and opened later whenever a tab is closed.
 *
 * @example tabOpenLink('https://github.com/brookhong/Surfingkeys')
 */
function tabOpenLink(str, simultaneousness) {
    simultaneousness = simultaneousness || 5;

    var urls;
    if (str.constructor.name === "Array") {
        urls = str;
    } else if (str instanceof NodeList) {
        urls = Array.from(str).map(function(n) {
            return n.href;
        });
    } else {
        urls = str.trim().split('\n');
    }

    urls = urls.map(function(u) {
        return u.trim();
    }).filter(function(u) {
        return u.length > 0;
    });

    if (urls.length > simultaneousness) {
        dispatchSKEvent("front", ['showDialog', `Do you really want to open all these ${urls.length} links?`, () => {
            // open the first batch links immediately
            urls.slice(0, simultaneousness).forEach(function(url) {
                RUNTIME("openLink", {
                    tab: {
                        tabbed: true
                    },
                    url: url
                });
            });
            // queue the left for later opening when there is one tab closed.
            RUNTIME("queueURLs", {
                urls: urls.slice(simultaneousness)
            });
        }]);
    } else {
        urls.forEach(function(url) {
            RUNTIME("openLink", {
                tab: {
                    tabbed: true
                },
                url: url
            });
        });
    }
}
////////////////////////////////////////////////////////////////////////////////

function getElements(selectorString) {
    return listElements(document.body, NodeFilter.SHOW_ELEMENT, function(n) {
        return n.offsetHeight && n.offsetWidth && n.matches(selectorString);
    });
}

function filterInvisibleElements(nodes) {
    return nodes.filter(function(n) {
        return n.offsetHeight && n.offsetWidth
            && !n.getAttribute('disabled') && isElementPartiallyInViewport(n)
            && getComputedStyle(n).visibility !== 'hidden';
    });
}

function setSanitizedContent(elm, str) {
    elm.innerHTML = DOMPurify.sanitize(str);
}

function createElementWithContent(tag, content, attributes) {
    var elm = document.createElement(tag);
    if (content) {
        setSanitizedContent(elm, content);
    }

    if (attributes) {
        for (var attr in attributes) {
            elm.setAttribute(attr, attributes[attr]);
        }
    }

    return elm;
}

var _divForHtmlEncoder = document.createElement("div");
function htmlEncode(str) {
    _divForHtmlEncoder.innerText = str;
    return _divForHtmlEncoder.innerHTML;
}

HTMLElement.prototype.one = function (evt, handler) {
    function _onceHandler() {
        handler.call(this);
        this.removeEventListener(evt, _onceHandler);
    }
    this.addEventListener(evt, _onceHandler);
};

HTMLElement.prototype.show = function () {
    this.style.display = "";
};

HTMLElement.prototype.hide = function () {
    this.style.display = "none";
};

HTMLElement.prototype.removeAttributes = function () {
    while (this.attributes.length > 0) {
        this.removeAttribute(this.attributes[0].name);
    }
};
HTMLElement.prototype.containsWithShadow = function (e) {
    const roots = [this];
    while (roots.length) {
        const root = roots.shift();
        if (root.contains(e)) {
            return true;
        }
        roots.push(...root.children);
        if (root.shadowRoot) {
            if (root.shadowRoot.contains(e)) {
                return true;
            }
            roots.push(...root.shadowRoot.children);
        }
    }
    return false;
};

NodeList.prototype.remove = function() {
    this.forEach(function(node) {
        node.remove();
    });
};
NodeList.prototype.show = function() {
    this.forEach(function(node) {
        node.show();
    });
};
NodeList.prototype.hide = function() {
    this.forEach(function(node) {
        node.hide();
    });
};

function httpRequest(args, onSuccess) {
    args.method = "get";
    RUNTIME("request", args, onSuccess);
}

const flashElem = createElementWithContent('div', '', {style: "position: fixed; box-shadow: 0px 0px 4px 2px #63b2ff; background: transparent; z-index: 2140000000"});
function flashPressedLink(link, cb) {
    var rect = getRealRect(link);
    flashElem.style.left = rect.left + 'px';
    flashElem.style.top = rect.top + 'px';
    flashElem.style.width = rect.width + 'px';
    flashElem.style.height = rect.height + 'px';
    document.body.appendChild(flashElem);

    setTimeout(() => {
        flashElem.remove();
        cb();
    }, 100);
}

function safeDecodeURI(url) {
    try {
        return decodeURI(url);
    } catch (e) {
        return url;
    }
}

function safeDecodeURIComponent(url) {
    try {
        return decodeURIComponent(url);
    } catch (e) {
        return url;
    }
}

function getCssSelectorsOfEditable() {
    return "input:not([type=submit]), textarea, *[contenteditable=true], *[role=textbox], select, div.ace_cursor";
}

function refreshHints(hints, pressedKeys) {
    const result = {candidates: 0};
    if (pressedKeys.length > 0) {
        for (const hint of hints) {
            const label = hint.label;
            if (pressedKeys === label) {
                result.matched = hint.link;
                break;
            } else if (label.indexOf(pressedKeys) === 0) {
                hint.style.opacity = 1;
                setSanitizedContent(hint, `<span style="opacity: 0.2;">${pressedKeys}</span>` + label.substr(pressedKeys.length));
                result.candidates ++;
            } else {
                hint.style.opacity = 0;
            }
        }
    } else {
        if (hints.length === 1) {
            result.matched = hints[0].link;
        } else {
            for (const hint of hints) {
                hint.style.opacity = 1;
                setSanitizedContent(hint, hint.label);
            }
            result.candidates = hints.length;
        }
    }
    return result;
}

function rotateInput(inputs, backward, curr, str) {
    let list = inputs;
    if (str) {
        list = inputs.filter((l) => l.indexOf(str) === 0 && l !== str);
        if (curr > list.length) {
            curr = list.length;
        }
    }
    const delta = backward ? -1 : 1;
    const length = list.length + 1; // +1 for empty input
    curr = (curr + length + delta) % length;
    return [curr < list.length ? list[curr] : str, curr];
}

function attachFaviconToImgSrc(tab, imgEl) {
    const browserName = getBrowserName();
    if (browserName === "Chrome") {
        imgEl.src = chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(tab.url)}`);
    } else if (browserName.startsWith("Safari")) {
        imgEl.src = new URL(tab.url).origin + "/favicon.ico";
    } else {
        imgEl.src = tab.favIconUrl;
    }
}

export {
    aceVimMap,
    actionWithSelectionPreserved,
    addVimMapKey,
    applyUserSettings,
    attachFaviconToImgSrc,
    constructSearchURL,
    createElementWithContent,
    dispatchMouseEvent,
    dispatchSKEvent,
    filterAncestors,
    filterInvisibleElements,
    filterOverlapElements,
    flashPressedLink,
    generateQuickGuid,
    getAnnotations,
    getBrowserName,
    getClickableElements,
    getColor,
    getCssSelectorsOfEditable,
    getDocumentOrigin,
    getElements,
    getLargeElements,
    getRealEdit,
    getRealRect,
    getTextNodePos,
    getTextNodes,
    getTextRect,
    getVisibleElements,
    getWordUnderCursor,
    htmlEncode,
    httpRequest,
    initL10n,
    initSKFunctionListener,
    isEditable,
    isElementClickable,
    isElementDrawn,
    isElementPartiallyInViewport,
    isInUIFrame,
    listElements,
    locateFocusNode,
    mapInMode,
    openOmnibar,
    parseAnnotation,
    refreshHints,
    reportIssue,
    rotateInput,
    safeDecodeURI,
    safeDecodeURIComponent,
    scrollIntoViewIfNeeded,
    setSanitizedContent,
    showBanner,
    showPopup,
    tabOpenLink,
    timeStampString,
    toggleQuote,
};
