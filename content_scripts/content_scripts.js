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
    AutoCommands[dp] = {
        code: jscode,
        regex: po
    };
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

    return keybound;
}

function _mapkey(mode, keys, annotation, jscode, options) {
    options = options || {};
    if (!options.domain || options.domain.test(document.location.href)) {
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
    if (!domain || domain.test(document.location.href)) {
        if (old_keystroke[0] === ':') {
            var cmdline = old_keystroke.substr(1);
            var keybound = createKeyTarget(function () {
                Front.executeCommand(cmdline);
            }, new_annotation ? _parseAnnotation({ annotation: new_annotation }) : null, false);
            Normal.mappings.add(KeyboardUtils.encodeKeystroke(new_keystroke), keybound);
        } else {
            if (!_map(Normal, new_keystroke, old_keystroke) && old_keystroke in Mode.specialKeys) {
                Mode.specialKeys[old_keystroke].push(new_keystroke);
            }
        }
    }
}

function unmap(keystroke, domain) {
    if (!domain || domain.test(document.location.href)) {
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
    if (!domain || domain.test(document.location.href)) {
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
    if (!domain || domain.test(document.location.href)) {
        _map(Insert, new_keystroke, old_keystroke);
    }
}

function iunmap(keystroke, domain) {
    if (!domain || domain.test(document.location.href)) {
        Insert.mappings.remove(KeyboardUtils.encodeKeystroke(keystroke));
    }
}

function cmap(new_keystroke, old_keystroke, domain, new_annotation) {
    if (!domain || domain.test(document.location.href)) {
        Front.addCMap(new_keystroke, old_keystroke);
    }
}

function vmap(new_keystroke, old_keystroke, domain, new_annotation) {
    if (!domain || domain.test(document.location.href)) {
        _map(Visual, new_keystroke, old_keystroke);
    }
}

function vunmap(keystroke, domain) {
    if (!domain || domain.test(document.location.href)) {
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
    var prevLinks = getClickableElements("a, button", runtime.conf.prevLinkRegex);
    prevLinks = filterOverlapElements(prevLinks);
    if (prevLinks.length) {
        clickOn(prevLinks);
        return true;
    } else {
        return walkPageUrl(-1);
    }
}

function nextPage() {
    var nextLinks = getClickableElements("a, button", runtime.conf.nextLinkRegex);
    nextLinks = filterOverlapElements(nextLinks);
    if (nextLinks.length) {
        clickOn(nextLinks);
        return true;
    } else {
        return walkPageUrl(1);
    }
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

        formData.forEach(function(value, key) {
            if (obj.hasOwnProperty(key)) {
                var p = obj[key];
                if (p.constructor.name === "Array") {
                    p.push(value);
                } else {
                    obj[key] = [];
                    obj[key].push(p);
                    obj[key].push(value);
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
    args.action = "request";
    args.method = "get";
    runtime.command(args, onSuccess);
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
    if ('snippets' in rs && rs.snippets && !Front.isProvider()) {
        var delta = runScript(rs.snippets);
        if (delta.error !== "") {
            if (window === top) {
                Front.showPopup("Error found in settings: " + delta.error);
            } else {
                console.log("Error found in settings({0}): {1}".format(window.location.href, delta.error));
            }
        }
        if (!isEmptyObject(delta.settings)) {
            Front.applyUserSettings(JSON.parse(JSON.stringify(delta.settings)));
            // overrides local settings from snippets
            for (var k in delta.settings) {
                if (runtime.conf.hasOwnProperty(k)) {
                    runtime.conf[k] = delta.settings[k];
                    delete delta.settings[k];
                }
            }
            if (Object.keys(delta.settings).length > 0 && window === top) {
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

function _init() {
    runtime.command({
        action: 'getSettings'
    }, function(response) {
        var rs = response.settings;

        applySettings(rs);

        Normal.enter();

        runtime.command({
            action: 'getDisabled',
            blacklistPattern: runtime.conf.blacklistPattern ? runtime.conf.blacklistPattern.toJSON() : ""
        }, function (resp) {
            if (resp.disabled) {
                Disabled.enter(0, true);
            } else {
                usePdfViewer();
            }

            if (window === top) {
                runtime.command({
                    action: 'setSurfingkeysIcon',
                    status: resp.disabled
                });
            }
        });

        document.dispatchEvent(new CustomEvent('surfingkeys:userSettingsLoaded', { 'detail': rs }));
    });
}

document.addEventListener("surfingkeys:defaultSettingsLoaded", function (evt) {
    _init();
});
