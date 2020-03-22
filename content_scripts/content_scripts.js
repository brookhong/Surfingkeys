function createKeyTarget(code, ag, repeatIgnore) {
    var keybound = {
        code: code
    };
    if (repeatIgnore) {
        keybound.repeatIgnore = repeatIgnore;
    }
    if (ag) {
        ag = _parseAnnotation(ag);
        keybound.feature_group = ag.feature_group;
        keybound.annotation = ag.annotation;
    }

    return keybound;
}

function _isDomainApplicable(domain) {
    return !domain || domain.test(document.location.href) || domain.test(window.origin);
}

function _mapkey(mode, keys, annotation, jscode, options) {
    options = options || {};
    if (_isDomainApplicable(options.domain)) {
        keys = KeyboardUtils.encodeKeystroke(keys);
        mode.mappings.remove(keys);
        var keybound = createKeyTarget(jscode, {annotation: annotation, feature_group: ((mode === Visual) ? 9 :14)}, options.repeatIgnore);
        mode.mappings.add(keys, keybound);
    }
}

function mapkey(keys, annotation, jscode, options) {
    _mapkey(Normal, keys, annotation, jscode, options);
}

function vmapkey(keys, annotation, jscode, options) {
    _mapkey(Visual, keys, annotation, jscode, options);
}

function imapkey(keys, annotation, jscode, options) {
    _mapkey(Insert, keys, annotation, jscode, options);
}

function map(new_keystroke, old_keystroke, domain, new_annotation) {
    if (_isDomainApplicable(domain)) {
        if (old_keystroke[0] === ':') {
            var cmdline = old_keystroke.substr(1);
            var keybound = createKeyTarget(function () {
                Front.executeCommand(cmdline);
            }, new_annotation ? _parseAnnotation({ annotation: new_annotation }) : null, false);
            Normal.mappings.add(KeyboardUtils.encodeKeystroke(new_keystroke), keybound);
        } else {
            if (!_map(Normal, new_keystroke, old_keystroke) && old_keystroke in Mode.specialKeys) {
                Mode.specialKeys[old_keystroke].push(new_keystroke);
                Front.addMapkey("Mode", new_keystroke, old_keystroke);
            }
        }
    }
}

function unmap(keystroke, domain) {
    if (_isDomainApplicable(domain)) {
        var old_map = Normal.mappings.find(KeyboardUtils.encodeKeystroke(keystroke));
        if (old_map) {
            Normal.mappings.remove(KeyboardUtils.encodeKeystroke(keystroke));
        } else {
            for (var k in Mode.specialKeys) {
                var idx = Mode.specialKeys[k].indexOf(keystroke);
                if (idx !== -1) {
                    Mode.specialKeys[k].splice(idx, 1);
                }
            }
        }
    }
}

function unmapAllExcept(keystrokes, domain) {
    if (_isDomainApplicable(domain)) {
        var modes = [Normal, Insert];
        modes.forEach(function(mode) {
            var _mappings = new Trie();
            keystrokes = keystrokes || [];
            for (var i = 0, il = keystrokes.length; i < il; i++) {
                var ks = KeyboardUtils.encodeKeystroke(keystrokes[i]);
                var node = mode.mappings.find(ks);
                if (node) {
                    _mappings.add(ks, node.meta);
                }
            }
            delete mode.mappings;
            mode.mappings = _mappings;
            mode.map_node = _mappings;
        });
    }
}

function imap(new_keystroke, old_keystroke, domain, new_annotation) {
    if (_isDomainApplicable(domain)) {
        _map(Insert, new_keystroke, old_keystroke);
    }
}

function iunmap(keystroke, domain) {
    if (_isDomainApplicable(domain)) {
        Insert.mappings.remove(KeyboardUtils.encodeKeystroke(keystroke));
    }
}

function cmap(new_keystroke, old_keystroke, domain, new_annotation) {
    if (_isDomainApplicable(domain)) {
        Front.addMapkey("Omnibar", new_keystroke, old_keystroke);
    }
}

function vmap(new_keystroke, old_keystroke, domain, new_annotation) {
    if (_isDomainApplicable(domain)) {
        _map(Visual, new_keystroke, old_keystroke);
    }
}

function vunmap(keystroke, domain) {
    if (_isDomainApplicable(domain)) {
        Visual.mappings.remove(KeyboardUtils.encodeKeystroke(keystroke));
    }
}

function aceVimMap(lhs, rhs, ctx) {
    Front.addVimMap(lhs, rhs, ctx);
}

function addVimMapKey() {
    Front.addVimKeyMap(Array.from(arguments));
}

function addSearchAlias(alias, prompt, url, suggestionURL, listSuggestion) {
    Front.addSearchAlias(alias, prompt, url, suggestionURL, listSuggestion);
}

function removeSearchAlias(alias) {
    Front.removeSearchAlias(alias);
}

function addSearchAliasX(alias, prompt, search_url, search_leader_key, suggestion_url, callback_to_parse_suggestion, only_this_site_key) {
    addSearchAlias(alias, prompt, search_url, suggestion_url, callback_to_parse_suggestion);
    function ssw() {
        searchSelectedWith(search_url);
    }
    mapkey((search_leader_key || 's') + alias, '#6Search selected with ' + prompt, ssw);
    vmapkey((search_leader_key || 's') + alias, '', ssw);
    function ssw2() {
        searchSelectedWith(search_url, true);
    }
    mapkey((search_leader_key || 's') + (only_this_site_key || 'o') + alias, '', ssw2);
    vmapkey((search_leader_key || 's') + (only_this_site_key || 'o') + alias, '', ssw2);

    var capitalAlias = alias.toUpperCase();
    if (capitalAlias !== alias) {
        function ssw4() {
            searchSelectedWith(search_url, false, true, alias);
        }
        mapkey((search_leader_key || 's') + capitalAlias, '', ssw4);
        vmapkey((search_leader_key || 's') + capitalAlias, '', ssw4);
        function ssw5() {
            searchSelectedWith(search_url, true, true, alias);
        }
        mapkey((search_leader_key || 's') + (only_this_site_key || 'o') + capitalAlias, '', ssw5);
        vmapkey((search_leader_key || 's') + (only_this_site_key || 'o') + capitalAlias, '', ssw5);
    }
}

function removeSearchAliasX(alias, search_leader_key, only_this_site_key) {
    removeSearchAlias(alias);
    unmap((search_leader_key || 's') + alias);
    vunmap((search_leader_key || 's') + alias);
    unmap((search_leader_key || 's') + (only_this_site_key || 'o') + alias);
    vunmap((search_leader_key || 's') + (only_this_site_key || 'o') + alias);
    var capitalAlias = alias.toUpperCase();
    if (capitalAlias !== alias) {
        unmap((search_leader_key || 's') + capitalAlias);
        vunmap((search_leader_key || 's') + capitalAlias);
        unmap((search_leader_key || 's') + (only_this_site_key || 'o') + capitalAlias);
        vunmap((search_leader_key || 's') + (only_this_site_key || 'o') + capitalAlias);
    }
}

function walkPageUrl(step) {
    for (var i = 0; i < runtime.conf.pageUrlRegex.length; i++) {
        var numbers = window.location.href.match(runtime.conf.pageUrlRegex[i]);
        if (numbers && numbers.length === 4) {
            var cp = parseInt(numbers[2]);
            if (cp < 0xffffffff) {
                window.location.href = numbers[1] + (cp + step) + numbers[3];
                return true;
            }
        }
    }
    return false;
}

function previousPage() {
    var prevLinks = uniqueLinks(getClickableElements("[rel=prev]", runtime.conf.prevLinkRegex));
    if (prevLinks.length) {
        clickOn(prevLinks);
        return true;
    } else {
        return walkPageUrl(-1);
    }
}

function nextPage() {
    var nextLinks = uniqueLinks(getClickableElements("[rel=next]", runtime.conf.nextLinkRegex));
    if (nextLinks.length) {
        clickOn(nextLinks);
        return true;
    } else {
        return walkPageUrl(1);
    }
}

function uniqueLinks(links) {
    let unique = {};
    links.forEach(function(link) {
        let href = link.getAttribute('href');
        if (!unique[href]) {
            unique[href] = link;
        }
    });
    return Object.values(unique);
}

function searchSelectedWith(se, onlyThisSite, interactive, alias) {
    Clipboard.read(function(response) {
        var query = window.getSelection().toString() || response.data;
        if (onlyThisSite) {
            query = "site:" + window.location.hostname + " " + query;
        }
        if (interactive) {
            Front.openOmnibar({type: "SearchEngine", extra: alias, pref: query});
        } else {
            tabOpenLink(constructSearchURL(se, encodeURIComponent(query)));
        }
    });
}

function clickOn(links, force) {
    if (typeof(links) === 'string') {
        links = getClickableElements(links);
    }
    if (links.length > 1) {
        if (force) {
            links.forEach(function(u) {
                Hints.dispatchMouseClick(u);
            });
        } else {
            Hints.create(links, Hints.dispatchMouseClick);
        }
    } else if (links.length === 1) {
        Hints.dispatchMouseClick(links[0]);
    }
}

function getFormData(form, format) {
    var formData = new FormData(form);
    if (format === "json") {
        var obj = {};

        formData.forEach(function (value, key) {
            if (obj.hasOwnProperty(key)) {
                if (value.length) {
                    var p = obj[key];
                    if (p.constructor.name === "Array") {
                        p.push(value);
                    } else {
                        obj[key] = [];
                        if (p.length) {
                            obj[key].push(p);
                        }
                        obj[key].push(value);
                    }
                }
            } else {
                obj[key] = value;
            }
        });

        return obj;
    } else {
        return new URLSearchParams(formData).toString();
    }
}

function httpRequest(args, onSuccess) {
    args.method = "get";
    RUNTIME("request", args, onSuccess);
}

/*
 * run user snippets, and return settings updated in snippets
 */
function runScript(snippets) {
    var result = { settings: {}, error: "" };
    try {
        var F = new Function('settings', snippets);
        F(result.settings);
    } catch (e) {
        result.error = e.toString();
    }
    return result;
}

function applySettings(rs, resolve) {
    for (var k in rs) {
        if (runtime.conf.hasOwnProperty(k)) {
            runtime.conf[k] = rs[k];
        }
    }
    if ('findHistory' in rs) {
        runtime.conf.lastQuery = rs.findHistory.length ? rs.findHistory[0] : "";
    }
    if ('snippets' in rs && rs.snippets && !isInUIFrame()) {
        var delta = runScript(rs.snippets);
        if (delta.error !== "") {
            if (window === top) {
                Front.showPopup("Error found in settings: " + delta.error);
            } else {
                console.log("Error found in settings({0}): {1}".format(window.location.href, delta.error));
            }
        }
        if (!isEmptyObject(delta.settings)) {
            Front.setUserSettings(JSON.parse(JSON.stringify(delta.settings)));
            // overrides local settings from snippets
            for (var k in delta.settings) {
                if (runtime.conf.hasOwnProperty(k)) {
                    runtime.conf[k] = delta.settings[k];
                    delete delta.settings[k];
                }
            }
            if (Object.keys(delta.settings).length > 0 && window === top) {
                // left settings are for background, need not broadcast the update, neither persist into storage
                RUNTIME('updateSettings', {
                    scope: "snippets",
                    settings: delta.settings
                });
            }
        }
    }
    if (runtime.conf.showProxyInStatusBar && 'proxyMode' in rs) {
        if (["byhost", "always"].indexOf(rs.proxyMode) !== -1) {
            Front.showStatus(3, "{0}: {1}".format(rs.proxyMode, rs.proxy));
        } else {
            Front.showStatus(3, rs.proxyMode);
        }
    }

    RUNTIME('getDisabled', {
        blacklistPattern: runtime.conf.blacklistPattern ? runtime.conf.blacklistPattern.toJSON() : ""
    }, function (resp) {
        if (resp.disabled) {
            Normal.disable();
        } else {
            if (document.contentType === "application/pdf" && !resp.noPdfViewer) {
                usePdfViewer();
            } else {
                resolve && resolve(window.location.href);
                Normal.enable();
            }
        }

        if (window === top) {
            RUNTIME('setSurfingkeysIcon', {
                status: resp.disabled
            });
        }
    });

}

function _initModules() {
    window.KeyboardUtils = createKeyboardUtils();
    window.Mode = createMode();
    window.Observer = createObserver();
    window.Normal = createNormal();
    Normal.enter();
    window.PassThrough = createPassThrough();
    window.Insert = createInsert();
    window.Visual = createVisual();
    window.Hints = createHints();
    window.Clipboard = createClipboard();
    window.Front = createFront();
    createDefaultMappings();
    window.pdfGuard = new Promise(function (resolve, reject) {
        RUNTIME('getSettings', null, function(response) {
            var rs = response.settings;
            applySettings(rs, resolve);
            document.dispatchEvent(new CustomEvent('surfingkeys:userSettingsLoaded', { 'detail': rs }));
        });
    });
}


function _onSettingsUpdated(response) {
    var rs = response.settings;
    applySettings(rs);
}

function _initContent() {
    window.frameId = generateQuickGuid();
    runtime.on('settingsUpdated', _onSettingsUpdated);

    if (runtime.conf.stealFocusOnLoad && !isInUIFrame() && document.body.childElementCount > 1) {
        var elm = getRealEdit();
        elm && elm.blur();
    }
}

function getFrameId() {
    if (!window.frameId && window.innerWidth > 16 && window.innerHeight > 16
        && document.body.childElementCount > 0
        && runtime.conf.ignoredFrameHosts.indexOf(window.origin) === -1
        && (!window.frameElement || (parseInt("0" + getComputedStyle(window.frameElement).zIndex) >= 0
            && window.frameElement.offsetWidth > 16 && window.frameElement.offsetWidth > 16))
    ) {
        _initModules();
        _initContent();
    }
    return window.frameId;
}

if (window === top) {
    _initModules();

    document.addEventListener('DOMContentLoaded', function (e) {
        _initContent();
        runtime.on('tabActivated', function() {
            if (!window.uiHost) {
                window.uiHost = createUiHost();
                document.documentElement.appendChild(window.uiHost);
            }
            if (window.uiHostDetaching) {
                clearTimeout(window.uiHostDetaching);
                delete window.uiHostDetaching;
            }
        });
        runtime.on('tabDeactivated', function() {
            if (window.uiHost) {
                window.uiHostDetaching = setTimeout(function() {
                    window.uiHost.detach();
                    delete window.uiHost;
                }, 3000);
            }
        });
        window._setScrollPos = function (x, y) {
            document.scrollingElement.scrollLeft = x;
            document.scrollingElement.scrollTop = y;
        };

        RUNTIME('tabURLAccessed', {
            title: document.title,
            url: window.location.href
        }, function (resp) {
            if (resp.active && !window.uiHost) {
                window.uiHost = createUiHost();
                window.pdfGuard.then(function() {
                    document.documentElement.appendChild(window.uiHost);
                });
            }

            if (resp.index > 0) {
                var showTabIndexInTitle = function () {
                    skipObserver = true;
                    document.title = myTabIndex + " " + originalTitle;
                };

                var myTabIndex = resp.index,
                    skipObserver = false,
                    originalTitle = document.title;

                new MutationObserver(function (mutationsList) {
                    if (skipObserver) {
                        skipObserver = false;
                    } else {
                        originalTitle = document.title;
                        showTabIndexInTitle();
                    }
                }).observe(document.querySelector("title"), { childList: true });;

                showTabIndexInTitle();

                runtime.on('tabIndexChange', function(msg, sender, response) {
                    if (msg.index !== myTabIndex) {
                        myTabIndex = msg.index;
                        showTabIndexInTitle();
                    }
                });
            }
        });

        // There is some site firing DOMContentLoaded twice, such as http://www.423down.com/
    }, {once: true});
} else {
    // activate Modes in the frames on extension pages
    runtime.getTopURL(function(u) {
        if (u.indexOf(chrome.extension.getURL("")) === 0) {
            _initModules();
            _initContent();
        }
    });
    setTimeout(function() {
        document.addEventListener('click', function (e) {
            getFrameId();
        }, { once: true });
    }, 1);
}
