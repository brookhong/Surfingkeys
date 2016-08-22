if (typeof(Commands) === 'undefined') {
    Commands = { items: {} };
}

var command = function(cmd, annotation, jscode) {
    if (typeof(jscode) === 'string') {
        jscode = new Function(jscode);
    }
    var ag = _parseAnnotation({annotation: annotation, feature_group: 14});
    Commands.items[cmd] = {
        code: jscode,
        feature_group: ag.feature_group,
        annotation: annotation
    };
};

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

if (typeof(addSearchAlias) === 'undefined') {
    addSearchAlias = function() {};
}

var actionsRepeatBackground = ['closeTab', 'nextTab', 'previousTab', 'moveTab', 'reloadTab'];
RUNTIME = function(action, args) {
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
        console.log('[runtime exception] ' + e);
        window.location.reload();
    }
}

AutoCommands = {};
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
        ag.feature_group = annotations[1];
        ag.annotation = annotations[2];
    }
    return ag;
}

function _mapkey(mode, keys, annotation, jscode, options) {
    options = options || {};
    if (!options.domain || options.domain.test(window.location.origin)) {
        mode.mappings.remove(keys);
        if (typeof(jscode) === 'string') {
            jscode = new Function(jscode);
        }
        var ag = _parseAnnotation({annotation: annotation, feature_group: 14});
        if (mode === Visual) {
            ag.feature_group = 9;
        }
        mode.mappings.add(keys, {
            code: jscode,
            annotation: ag.annotation,
            feature_group: ag.feature_group,
            repeatIgnore: options.repeatIgnore,
            extra_chars: options.extra_chars
        });
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
    if (!domain || domain.test(window.location.origin)) {
        if (old_keystroke[0] === ':') {
            var cmdline = old_keystroke.substr(1);
            var args = parseCommand(cmdline);
            var cmd = args.shift();
            if (Commands.items.hasOwnProperty(cmd)) {
                var meta = Commands.items[cmd];
                var ag = _parseAnnotation({annotation: new_annotation || meta.annotation, feature_group: meta.feature_group});
                Normal.mappings.add(new_keystroke, {
                    code: function() {
                        meta.code.apply(meta.code, args);
                    },
                    annotation: ag.annotation,
                    feature_group: ag.feature_group,
                    extra_chars: 0
                });
            }
        } else {
            var old_map = Normal.mappings.find(old_keystroke);
            if (old_map) {
                var meta = old_map.meta[0];
                var ag = _parseAnnotation({annotation: new_annotation || meta.annotation, feature_group: meta.feature_group});
                Normal.mappings.remove(new_keystroke);
                Normal.mappings.add(new_keystroke, {
                    code: meta.code,
                    annotation: ag.annotation,
                    feature_group: ag.feature_group,
                    extra_chars: meta.extra_chars
                });
            } else if (old_keystroke in Mode.specialKeys) {
                Mode.specialKeys[old_keystroke] = new_keystroke;
            }
        }
    }
}

function unmap(keystroke, domain) {
    if (!domain || domain.test(window.location.origin)) {
        Normal.mappings.remove(keystroke);
    }
}

function iunmap(keystroke, domain) {
    if (!domain || domain.test(window.location.origin)) {
        Insert.mappings.remove(keystroke);
    }
}

function addSearchAliasX(alias, prompt, search_url, search_leader_key, suggestion_url, callback_to_parse_suggestion, only_this_site_key) {
    addSearchAlias(alias, prompt, search_url, suggestion_url, callback_to_parse_suggestion);
    mapkey((search_leader_key || 's') + alias, '#6Search selected with ' + prompt, 'searchSelectedWith("{0}")'.format(search_url));
    vmapkey((search_leader_key || 's') + alias, '#6Search selected with ' + prompt, 'searchSelectedWith("{0}")'.format(search_url));
    mapkey((search_leader_key || 's') + (only_this_site_key || 'o') + alias, '#6Search selected only in this site with ' + prompt, 'searchSelectedWith("{0}", true)'.format(search_url));
    vmapkey((search_leader_key || 's') + (only_this_site_key || 'o') + alias, '#6Search selected only in this site with ' + prompt, 'searchSelectedWith("{0}", true)'.format(search_url));

    var capitalAlias = alias.toUpperCase();
    if (capitalAlias !== alias) {
        mapkey((search_leader_key || 's') + capitalAlias, '#6Search selected with {0} interactively'.format(prompt), function() {
            searchSelectedWith(search_url, false, true, alias);
        });
        vmapkey((search_leader_key || 's') + capitalAlias, '#6Search selected with {0} interactively'.format(prompt), function() {
            searchSelectedWith(search_url, false, true, alias);
        });
        mapkey((search_leader_key || 's') + (only_this_site_key || 'o') + capitalAlias, '#6Search selected only in this site with {0} interactively'.format(prompt), function() {
            searchSelectedWith(search_url, true, true, alias);
        });
        vmapkey((search_leader_key || 's') + (only_this_site_key || 'o') + capitalAlias, '#6Search selected only in this site with {0} interactively'.format(prompt), function() {
            searchSelectedWith(search_url, true, true, alias);
        });
    }
}

function walkPageUrl(step) {
    var numbers = window.location.href.match(/^(.*\/[^\/\d]*)(\d+)([^\d]*)$/);
    if (numbers && numbers.length === 4) {
        window.location.href = numbers[1] + (parseInt(numbers[2]) + step) + numbers[3];
    }
}

function tabOpenLink(str) {
    var urls = str.trim().split('\n').slice(0, 10).forEach(function(url) {
        url = url.trim();
        if (url.length > 0) {
            if (/^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/\n]+)/im.test(url)) {
                if (/^[\w-]+?:\/\//i.test(url)) {
                    url = url
                } else {
                    url = "http://" + url;
                }
            }
            RUNTIME("openLink", {
                tab: {
                    tabbed: true
                },
                url: url
            });
        }
    });
}

function searchSelectedWith(se, onlyThisSite, interactive, alias) {
    Normal.getContentFromClipboard(function(response) {
        var query = window.getSelection().toString() || response.data;
        if (onlyThisSite) {
            query += " site:" + window.location.hostname;
        }
        if (interactive) {
            Normal.openOmnibar({type: "SearchEngine", extra: alias, pref: query});
        } else {
            tabOpenLink(se + encodeURI(query));
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

function getFormData(form) {
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
}

function httpRequest(args, onSuccess) {
    args.action = "request";
    args.method = "get";
    runtime.command(args, onSuccess);
}

/*
 * run user snippets, and return settings updated in snippets
 */
function runUserScript(snippets) {
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
    if (('snippets' in rs) && rs.snippets) {
        var delta = runUserScript(rs.snippets);
        if (!jQuery.isEmptyObject(delta.settings)) {
            // overrides local settings from snippets
            if ('theme' in delta.settings) {
                $(document).trigger("surfingkeys:themeChanged", [delta.settings.theme]);
                delete delta.settings.theme;
            }
            $.extend(runtime.conf, delta.settings);
        } else if (delta.error !== "" && window === top) {
            Normal.showPopup("Error found in settings: " + delta.error);
        }
        delete rs.snippets;
    }
    // $.extend(runtime.conf, rs);
}

runtime.on('settingsUpdated', function(response) {
    applySettings(response.settings);
    if ('blacklist' in response.settings) {
        if (checkBlackList(response.settings)) {
            Disabled.enter();
        } else {
            Disabled.exit();
        }
    }
});
runtime.on('ace_editor_saved', function(response) {
    Normal.onEditorSaved(response.data);
    if (runtime.conf.focusOnSaved && isEditable(Normal.elementBehindEditor)) {
        Normal.elementBehindEditor.focus();
        Insert.enter();
    }
});
runtime.on('omnibar_query_entered', function(response) {
    runtime.updateHistory('OmniQuery', response.query);
    Normal.onOmniQuery(response.query);
});
runtime.on('getPageText', function(response) {
    return document.body.innerText;
});

runtime.runtime_handlers['focusFrame'] = function(msg, sender, response) {
    if (msg.frameId === window.frameId) {
        window.focus();
        document.body.scrollIntoViewIfNeeded();
        Normal.highlightElement(window.frameElement || document.body, 500);

        if (Mode.stack().length === 0) {
            // if mode stack is empty, enter normal mode automatically
            Normal.enter();
            GetBackFocus.enter();
        }
    }
};

function checkBlackList(sb) {
    return sb.blacklist[window.location.origin] || sb.blacklist['.*']
        || (sb.blacklistPattern && typeof(sb.blacklistPattern.test) === "function" && sb.blacklistPattern.test(window.location.href));
}

runtime.command({
    action: 'getSettings'
}, function(response) {
    var rs = response.settings;
    runtime.conf.hintsThreshold = rs.hintsThreshold;
    runtime.conf.afterYank = rs.afterYank;
    runtime.conf.smoothScroll = rs.smoothScroll;
    runtime.conf.lastKeys = rs.lastKeys;
    runtime.conf.marks = rs.marks;
    runtime.conf.lastQuery = rs.findHistory.length ? rs.findHistory[0] : "";

    applySettings(rs);

    Normal.enter();

    if (checkBlackList(rs)) {
        Disabled.enter();
    } else {
        document.addEventListener('DOMContentLoaded', function(e) {
            GetBackFocus.enter();
        });
    }
});

Normal.insertJS(function() {
    var _wr = function(type) {
        var orig = history[type];
        return function() {
            var rv = orig.apply(this, arguments);
            var e = new Event(type);
            e.arguments = arguments;
            window.dispatchEvent(e);
            return rv;
        };
    };
    history.pushState = _wr('pushState'), history.replaceState = _wr('replaceState');
});
