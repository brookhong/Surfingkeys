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
    var cssSelector = "a, button, select, input, textarea, *[onclick], *[contenteditable=true], *.jfk-button, *.goog-flat-menu-button, *[role]";
    if (runtime.conf.clickableSelector.length) {
        cssSelector += ", " + runtime.conf.clickableSelector;
    }

    return e.matches(cssSelector)
        || getComputedStyle(e).cursor === "pointer"
        || getComputedStyle(e).cursor.substr(0, 4) === "url("
        || e.closest("a, *[onclick], *[contenteditable=true], *.jfk-button, *.goog-flat-menu-button") !== null;
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
    return rt;
}

function toggleQuote() {
    var elm = getRealEdit(), val = elm.value;
    if (val[0] === '"') {
        elm.value = val.substr(1, val.length - 2);
    } else {
        elm.value = '"' + val + '"';
    }
}

function isEditable(element) {
    return !element.disabled && (element.localName === 'textarea'
        || element.localName === 'select'
        || element.isContentEditable
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

    Front.showPopup(error);
}

function scrollIntoViewIfNeeded(elm, ignoreSize) {
    if (elm.scrollIntoViewIfNeeded) {
        elm.scrollIntoViewIfNeeded();
    } else if (!isElementPartiallyInViewport(elm, ignoreSize)) {
        elm.scrollIntoView();
    }
}

function isElementPartiallyInViewport(el, ignoreSize) {
    var rect = el.getBoundingClientRect();
    var windowHeight = (window.innerHeight || document.documentElement.clientHeight);
    var windowWidth = (window.innerWidth || document.documentElement.clientWidth);

    return (ignoreSize || (rect.width > 4 && rect.height > 4))
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
            && rect.height < window.innerHeight && rect.height > 0
        ) {
            filter(e, visibleElements);
        }
    }
    return visibleElements;
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
    var tmp = [];
    if (elements.length > 0) {
        // filter out element which has its children covered
        tmp = [elements[elements.length - 1]];
        for (var i = elements.length - 2; i >= 0; i--) {
            if (!elements[i].contains(tmp[0])) {
                tmp.unshift(elements[i]);
            }
        }
    }

    return tmp;
}

function filterOverlapElements(elements) {
    // filter out tiny elements
    elements = elements.filter(function(e) {
        var be = e.getClientRects()[0];
        if (e.disabled || e.readOnly || be.width <= 4) {
            return false;
        } else if (e.matches("input, textarea, select, form") || e.contentEditable === "true") {
            return true;
        } else {
            var el = document.elementFromPoint(be.left + be.width / 2, be.top + 3);
            return !el || el.shadowRoot && el.childElementCount === 0 || el.contains(e) || e.contains(el);
        }
    });

    // if an element has href, all its children will be filtered out.
    var elementWithHref = null;
    elements = elements.filter(function(e) {
        var flag = true;
        if (e.href) {
            elementWithHref = e;
        }
        if (elementWithHref && elementWithHref !== e && elementWithHref.contains(e)) {
            flag = false;
        }
        return flag;
    });

    return filterAncestors(elements);
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

function initL10n(cb) {
    var lang = runtime.conf.language || window.navigator.language;
    if (lang === "en-US") {
        cb(function(str) {
            return str;
        });
    } else {
        fetch(chrome.extension.getURL("pages/l10n.json")).then(function(res) {
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

RegExp.prototype.toJSON = function() {
    return {source: this.source, flags: this.flags};
};

function _parseAnnotation(ag) {
    var annotations = ag.annotation.match(/#(\d+)(.*)/);
    if (annotations !== null) {
        ag.feature_group = parseInt(annotations[1]);
        ag.annotation = annotations[2];
    }
    return ag;
}

function _map(mode, nks, oks) {
    oks = KeyboardUtils.encodeKeystroke(oks);
    var old_map = mode.mappings.find(oks);
    if (old_map) {
        nks = KeyboardUtils.encodeKeystroke(nks);
        mode.mappings.remove(nks);
        // meta.word need to be new
        var meta = Object.assign({}, old_map.meta);
        mode.mappings.add(nks, meta);
    }
    return old_map;
}

function RUNTIME(action, args) {
    var actionsRepeatBackground = ['closeTab', 'nextTab', 'previousTab', 'moveTab', 'reloadTab', 'setZoom', 'closeTabLeft','closeTabRight', 'focusTabByIndex'];
    (args = args || {}).action = action;
    if (actionsRepeatBackground.indexOf(action) !== -1) {
        // if the action can only be repeated in background, pass repeats to background with args,
        // and set RUNTIME.repeats 1, so that it won't be repeated in foreground's _handleMapKey
        args.repeats = RUNTIME.repeats;
        RUNTIME.repeats = 1;
    }
    try {
        chrome.runtime.sendMessage(args);
    } catch (e) {
        Front.showPopup('[runtime exception] ' + e);
    }
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
    } else {
        return se + word;
    }
}

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
    if (urls.length > simultaneousness) {
        RUNTIME("queueURLs", {
            urls: urls.slice(simultaneousness)
        });
    }
}
////////////////////////////////////////////////////////////////////////////////

function getElements(selectorString) {
    return listElements(document.body, NodeFilter.SHOW_ELEMENT, function(n) {
        return n.offsetHeight && n.offsetWidth && n.matches(selectorString);
    });
}

function getClickableElements(selectorString, pattern) {
    var nodes = listElements(document.body, NodeFilter.SHOW_ELEMENT, function(n) {
        return n.offsetHeight && n.offsetWidth
            && (n.matches(selectorString) || getComputedStyle(n).cursor === "pointer")
            && (!pattern || pattern.test(n.textContent));
    });
    return filterOverlapElements(nodes);
}

function filterInvisibleElements(nodes) {
    return nodes.filter(function(n) {
        return n.offsetHeight && n.offsetWidth
            && !n.getAttribute('disabled') && isElementPartiallyInViewport(n);
    });
}

function setInnerHTML(elm, str) {
    elm.innerHTML = str;
}

function createElement(str) {
    var div = document.createElement('div');
    setInnerHTML(div, str);

    return div.firstChild;
}

function hasScroll(el, direction, barSize) {
    var offset = (direction === 'y') ? ['scrollTop', 'height'] : ['scrollLeft', 'width'];
    var result = el[offset[0]];

    if (result < barSize) {
        // set scroll offset to barSize, and verify if we can get scroll offset as barSize
        var originOffset = el[offset[0]];
        el[offset[0]] = el.getBoundingClientRect()[offset[1]];
        result = el[offset[0]];
        el[offset[0]] = originOffset;
    }
    return result >= barSize;
}

function isEmptyObject(obj) {
    for (var name in obj) {
        return false;
    }
    return true;
}

var _divForHtmlEncoder = createElement("<div>");
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
