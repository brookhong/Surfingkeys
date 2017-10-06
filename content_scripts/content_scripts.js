document.addEventListener("DOMNodeInsertedIntoDocument", function(evt) {
    var elm = evt.srcElement;
    if (elm.tagName === "EMBED" && elm.type === "application/pdf") {
        chrome.storage.local.get("noPdfViewer", function(resp) {
            if (!resp.noPdfViewer) {
                setTimeout(function() {
                    // stop before redirect to prevent chrome crash
                    window.stop();
                    window.location.replace(chrome.extension.getURL("/pages/pdf_viewer.html") + "?r=" + elm.src);
                }, 0);
            }
        });
    }
}, true);

function command(cmd, annotation, jscode) {
    if (typeof(jscode) === 'string') {
        jscode = new Function(jscode);
    }
    var cmd_code = {
        code: jscode
    };
    if (Front.isProvider()) {
        // annotations for commands ared used in frontend.html
        var ag = _parseAnnotation({annotation: annotation, feature_group: 14});
        cmd_code.feature_group = ag.feature_group;
        cmd_code.annotation = ag.annotation;
    }
    Commands.items[cmd] = cmd_code;
}

function parseCommand(cmdline) {
    var cmdline = cmdline.trim();
    var tokens = [];
    var pendingToken = false;
    var part = '';
    for (var i = 0; i < cmdline.length; i++) {
        if (cmdline.charAt(i) === ' ' && !pendingToken) {
            tokens.push(part);
            part = '';
        } else {
            if (cmdline.charAt(i) === '\"') {
                pendingToken = !pendingToken;
            } else {
                part += cmdline.charAt(i);
            }
        }
    }
    tokens.push(part);
    return tokens;
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

var AutoCommands = {};
function autocmd(domain, jscode) {
    var dp = "",
        po;
    if (typeof(domain) === 'object' && domain.test !== undefined) {
        dp = domain.toString();
        po = domain;
    } else {
        dp = domain;
        po = new RegExp(domain);
    }
    if (typeof(jscode) === 'string') {
        jscode = new Function(jscode);
    }
    AutoCommands[dp] = {
        code: jscode,
        regex: po
    };
}

function _parseAnnotation(ag) {
    var annotations = ag.annotation.match(/#(\d+)(.*)/);
    if (annotations !== null) {
        ag.feature_group = parseInt(annotations[1]);
        ag.annotation = annotations[2];
    }
    return ag;
}

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

    keybound.isDefault = _defaultMapping;
    return keybound;
}

var _defaultMapping = true;
function _mapkey(mode, keys, annotation, jscode, options) {
    options = options || {};
    if (!options.domain || options.domain.test(document.location.href)) {
        keys = encodeKeystroke(keys);
        mode.mappings.remove(keys);
        if (typeof(jscode) === 'string') {
            jscode = new Function(jscode);
        }
        var keybound;
        if (_defaultMapping) {
            // to save memory, we keep annotations only in frontend.html, where they are used to create usage message.
            if (Front.isProvider()) {
                keybound = createKeyTarget(jscode, {annotation: annotation, feature_group: ((mode === Visual) ? 9 :14)}, options.repeatIgnore);
            } else {
                keybound = createKeyTarget(jscode, null, options.repeatIgnore);
            }
            mode.mappings.add(keys, keybound);
        } else {
            // for user defined mappings, annotations are kept in content.
            keybound = createKeyTarget(jscode, {annotation: annotation, feature_group: ((mode === Visual) ? 9 :14)}, options.repeatIgnore);
            mode.mappings.add(keys, keybound);
        }
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

function cmapkey(keys, annotation, jscode, options) {
    if (typeof(Omnibar) !== 'undefined') {
        _mapkey(Omnibar, keys, annotation, jscode, options);
    }
}

function _map(mode, nks, oks) {
    oks = encodeKeystroke(oks);
    var old_map = mode.mappings.find(oks);
    if (old_map) {
        nks = encodeKeystroke(nks);
        mode.mappings.remove(nks);
        // meta.word need to be new
        var meta = $.extend({}, old_map.meta);
        mode.mappings.add(nks, meta);
    }
    return old_map;
}

function map(new_keystroke, old_keystroke, domain, new_annotation) {
    if (!domain || domain.test(document.location.href)) {
        if (old_keystroke[0] === ':') {
            var cmdline = old_keystroke.substr(1);
            var args = parseCommand(cmdline);
            var cmd = args.shift();
            if (Commands.items.hasOwnProperty(cmd)) {
                var meta = Commands.items[cmd];
                var ag = (!Front.isProvider()) ? null : {annotation: new_annotation || meta.annotation, feature_group: meta.feature_group};
                var keybound = createKeyTarget(function() {
                    meta.code.call(meta.code, args);
                }, ag, meta.repeatIgnore);
                Normal.mappings.add(encodeKeystroke(new_keystroke), keybound);
            }
        } else {
            if (!_map(Normal, new_keystroke, old_keystroke) && old_keystroke in Mode.specialKeys) {
                Mode.specialKeys[old_keystroke].push(new_keystroke);
            }
        }
    }
}

function unmap(keystroke, domain) {
    if (!domain || domain.test(document.location.href)) {
        var old_map = Normal.mappings.find(encodeKeystroke(keystroke));
        if (old_map) {
            Normal.mappings.remove(encodeKeystroke(keystroke));
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
    if (!domain || domain.test(document.location.href)) {
        var modes = [Normal, Insert];
        modes.forEach(function(mode) {
            var _mappings = new Trie();
            keystrokes = keystrokes || [];
            for (var i = 0, il = keystrokes.length; i < il; i++) {
                var ks = encodeKeystroke(keystrokes[i]);
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
    if (!domain || domain.test(document.location.href)) {
        _map(Insert, new_keystroke, old_keystroke);
    }
}

function iunmap(keystroke, domain) {
    if (!domain || domain.test(document.location.href)) {
        Insert.mappings.remove(encodeKeystroke(keystroke));
    }
}

function cmap(new_keystroke, old_keystroke, domain, new_annotation) {
    if (typeof(Omnibar) !== 'undefined') {
        if (!domain || domain.test(document.location.href)) {
            _map(Omnibar, new_keystroke, old_keystroke);
        }
    }
}

function vmap(new_keystroke, old_keystroke, domain, new_annotation) {
    if (!domain || domain.test(document.location.href)) {
        _map(Visual, new_keystroke, old_keystroke);
    }
}

function vunmap(keystroke, domain) {
    if (!domain || domain.test(document.location.href)) {
        Visual.mappings.remove(encodeKeystroke(keystroke));
    }
}

function aceVimMap(lhs, rhs, ctx) {
    if (typeof(Front.vimMappings) !== 'undefined') {
        Front.vimMappings.push(arguments);
    }
}

function onAceVimKeymapInit(fn) {
    if (typeof(Front.vimMappings) !== 'undefined') {
        Front.keymapModifier = fn;
    }
}

function addSearchAlias(alias, prompt, url, suggestionURL, listSuggestion) {
    if (typeof(SearchEngine) !== 'undefined') {
        SearchEngine.aliases[alias] = {
            prompt: `${prompt}${separatorHtml}`,
            url: url,
            suggestionURL: suggestionURL || "",
            listSuggestion: listSuggestion
        };
    }
}

function addSearchAliasX(alias, prompt, search_url, search_leader_key, suggestion_url, callback_to_parse_suggestion, only_this_site_key) {
    addSearchAlias(alias, prompt, search_url, suggestion_url, callback_to_parse_suggestion);
    mapkey((search_leader_key || 's') + alias, '#6Search selected with ' + prompt, 'searchSelectedWith("{0}")'.format(search_url));
    vmapkey((search_leader_key || 's') + alias, '', 'searchSelectedWith("{0}")'.format(search_url));
    mapkey((search_leader_key || 's') + (only_this_site_key || 'o') + alias, '', 'searchSelectedWith("{0}", true)'.format(search_url));
    vmapkey((search_leader_key || 's') + (only_this_site_key || 'o') + alias, '', 'searchSelectedWith("{0}", true)'.format(search_url));

    var capitalAlias = alias.toUpperCase();
    if (capitalAlias !== alias) {
        mapkey((search_leader_key || 's') + capitalAlias, '', function() {
            searchSelectedWith(search_url, false, true, alias);
        });
        vmapkey((search_leader_key || 's') + capitalAlias, '', function() {
            searchSelectedWith(search_url, false, true, alias);
        });
        mapkey((search_leader_key || 's') + (only_this_site_key || 'o') + capitalAlias, '', function() {
            searchSelectedWith(search_url, true, true, alias);
        });
        vmapkey((search_leader_key || 's') + (only_this_site_key || 'o') + capitalAlias, '', function() {
            searchSelectedWith(search_url, true, true, alias);
        });
    }
}

function removeSearchAlias(alias) {
    if (typeof(SearchEngine) !== 'undefined') {
        delete SearchEngine.aliases[alias];
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
    var prevLinks = $('a:visible, button:visible, *:visible:css(cursor=pointer)').regex(runtime.conf.prevLinkRegex);
    if (prevLinks.length) {
        clickOn(prevLinks);
        return true;
    } else {
        return walkPageUrl(-1);
    }
}

function nextPage() {
    var nextLinks = $('a:visible, button:visible, *:visible:css(cursor=pointer)').regex(runtime.conf.nextLinkRegex);
    if (nextLinks.length) {
        clickOn(nextLinks);
        return true;
    } else {
        return walkPageUrl(1);
    }
}

function tabOpenLink(str, simultaneousness) {
    simultaneousness = simultaneousness || 5;

    var urls;
    if (str.constructor.name === "Array") {
        urls = str
    } else if (str.constructor.name === "jQuery") {
        urls = str.map(function() {
            return this.href;
        }).toArray();
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

function constructSearchURL(se, word) {
    if (se.indexOf("{0}") > 0) {
        return se.format(word);
    } else {
        return se + word;
    }
}

function searchSelectedWith(se, onlyThisSite, interactive, alias) {
    Front.getContentFromClipboard(function(response) {
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
    var ret = false;
    if (typeof(links) === 'string') {
        links = $(links);
    }
    var clean = [], pushed = {};
    links.each(function() {
        if (this.href) {
            if (!pushed.hasOwnProperty(this.href)) {
                clean.push(this);
                pushed[this.href] = 1;
            }
        } else {
            clean.push(this);
        }
    });
    if (clean.length > 1) {
        if (force) {
            clean.forEach(function(u) {
                Hints.dispatchMouseClick(u);
            });
        } else {
            Hints.create(clean, Hints.dispatchMouseClick);
        }
    } else if (clean.length === 1) {
        Hints.dispatchMouseClick(clean[0]);
    }
}

function getFormData(form, format) {
    if (format === "json") {
        var unindexed_array = $(form).serializeArray();
        var indexed_array = {};

        $.map(unindexed_array, function(n, i){
            var nn = n['name'];
            var vv = n['value'];
            if (indexed_array.hasOwnProperty(nn)) {
                var p = indexed_array[nn];
                if (p.constructor.name === "Array") {
                    p.push(vv);
                } else {
                    indexed_array[nn] = [];
                    indexed_array[nn].push(p);
                    indexed_array[nn].push(vv);
                }
            } else {
                indexed_array[nn] = vv;
            }
        });
        return indexed_array;
    } else {
        return $(form).serialize();
    }
}

function httpRequest(args, onSuccess) {
    args.action = "request";
    args.method = "get";
    runtime.command(args, onSuccess);
}

function readText(text, options) {
    options = options || {
        enqueue: true,
        voiceName: runtime.conf.defaultVoice
    };
    var verbose = options.verbose;
    var stopPattern = /[\s\u00a0]/g,
        verbose = options.verbose,
        onEnd = options.onEnd;
    delete options.verbose;
    delete options.onEnd;
    runtime.command({
        action: 'read',
        content: text,
        options: options
    }, function(res) {
        if (verbose) {
            if (res.ttsEvent.type === "start") {
                Front.showPopup(text);
            } else if (res.ttsEvent.type === "word") {
                stopPattern.lastIndex = res.ttsEvent.charIndex;
                var updated, end = stopPattern.exec(text);
                if (end) {
                    updated = text.substr(0, res.ttsEvent.charIndex)
                        + "<font style='font-weight: bold; text-decoration: underline'>"
                        + text.substr(res.ttsEvent.charIndex, end.index - res.ttsEvent.charIndex + 1)
                        + "</font>"
                        + text.substr(end.index);
                } else {
                    updated = text.substr(0, res.ttsEvent.charIndex)
                        + "<font style='font-weight: bold; text-decoration: underline'>"
                        + text.substr(res.ttsEvent.charIndex)
                        + "</font>";
                }
                Front.showPopup(updated);
            } else if (res.ttsEvent.type === "end") {
                Front.hidePopup();
            }
        }
        if (onEnd && res.ttsEvent.type === "end") {
            onEnd();
        }
        return res.ttsEvent.type !== "end";
    });
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

function applySettings(rs) {
    for (var k in rs) {
        if (runtime.conf.hasOwnProperty(k)) {
            runtime.conf[k] = rs[k];
        }
    }
    if ('findHistory' in rs) {
        runtime.conf.lastQuery = rs.findHistory.length ? rs.findHistory[0] : "";
    }
    if (('snippets' in rs) && rs.snippets) {
        var delta = runScript(rs.snippets);
        if (delta.error !== "") {
            if (window === top) {
                console.log("Error found in settings: " + delta.error);
            } else {
                console.log("Error found in settings({0}): {1}".format(window.location.href, delta.error));
            }
        }
        if (!jQuery.isEmptyObject(delta.settings)) {
            if ('theme' in delta.settings) {
                $(document).trigger("surfingkeys:themeChanged", [delta.settings.theme]);
                delete delta.settings.theme;
            }
            // overrides local settings from snippets
            for (var k in delta.settings) {
                if (runtime.conf.hasOwnProperty(k)) {
                    runtime.conf[k] = delta.settings[k];
                    delete delta.settings[k];
                }
            }
            if (Object.keys(delta.settings).length > 0) {
                // left settings are for background, need not broadcast the update, neither persist into storage
                runtime.command({
                    action: 'updateSettings',
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
}

runtime.on('settingsUpdated', function(response) {
    var rs = response.settings;
    applySettings(rs);
    if (rs.hasOwnProperty('blacklist') || runtime.conf.blacklistPattern) {

        // only toggle Disabled mode when blacklist is updated
        runtime.command({
            action: 'getDisabled',
            blacklistPattern: (runtime.conf.blacklistPattern ? runtime.conf.blacklistPattern.toJSON() : "")
        }, function(resp) {
            if (resp.disabled) {
                Disabled.enter(0, true);
            } else {
                Disabled.exit();
            }

            if (window === top) {
                runtime.command({
                    action: 'setSurfingkeysIcon',
                    status: resp.disabled
                });
            }
        });
    }
});

function _init(onInit) {
    httpRequest({
        url: chrome.extension.getURL('/pages/default.js'),
    }, function(res) {

        runScript(res.text);

        _defaultMapping = false;
        $(document).trigger("surfingkeys:defaultSettingsLoaded");

        runtime.command({
            action: 'getSettings'
        }, function(response) {
            var rs = response.settings;

            applySettings(rs);

            Normal.enter();

            if (window === top) {
                runtime.command({
                    action: 'getDisabled',
                    blacklistPattern: (runtime.conf.blacklistPattern ? runtime.conf.blacklistPattern.toJSON() : "")
                }, function(resp) {
                    if (resp.disabled) {
                        Disabled.enter(0, true);
                    }

                    runtime.command({
                        action: 'setSurfingkeysIcon',
                        status: resp.disabled
                    });
                    $(document).trigger("surfingkeys:userSettingsLoaded");
                });
            }
        });

    });
}

if (window === top) {
    $(document).on('surfingkeys:frontendReady', function() {
        _init();
    });
} else {
    _init();
}
