////////////////////////////////////////////////////////////////////////////////
// dummy functions
function command() {}

function addSearchAlias() {}

////////////////////////////////////////////////////////////////////////////////

RUNTIME = function(action, args) {
    (args = args || {}).action = action;
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

function _mapkey(mode, keys, annotation, jscode, extra_chars, domain) {
    if (!domain || domain.test(window.location.origin)) {
        mode.mappings.remove(keys);
        if (typeof(jscode) === 'string') {
            jscode = new Function(jscode);
        }
        mode.mappings.add(keys, {
            code: jscode,
            annotation: annotation,
            extra_chars: extra_chars
        });
    }
}

function mapkey(keys, annotation, jscode, extra_chars, domain) {
    _mapkey(Normal, keys, annotation, jscode, extra_chars, domain);
}

function vmapkey(keys, annotation, jscode, extra_chars, domain) {
    _mapkey(Visual, keys, annotation, jscode, extra_chars, domain);
}

function map(new_keystroke, old_keystroke, domain) {
    if (!domain || domain.test(window.location.origin)) {
        var old_map = Normal.mappings.find(old_keystroke);
        if (old_map) {
            var meta = old_map.meta[0];
            Normal.mappings.remove(old_keystroke);
            Normal.mappings.add(new_keystroke, {
                code: meta.code,
                annotation: meta.annotation,
                extra_chars: meta.extra_chars
            });
        }
    }
}

function unmap(keystroke, domain) {
    if (!domain || domain.test(window.location.origin)) {
        Normal.mappings.remove(keystroke);
    }
}


function addSearchAliasX(alias, prompt, search_url, search_leader_key, suggestion_url, callback_to_parse_suggestion, only_this_site_key) {
    addSearchAlias(alias, prompt, search_url, suggestion_url, callback_to_parse_suggestion);
    mapkey((search_leader_key || 's') + alias, 'Search selected with ' + prompt, 'searchSelectedWith("{0}")'.format(search_url));
    vmapkey((search_leader_key || 's') + alias, 'Search selected with ' + prompt, 'searchSelectedWith("{0}")'.format(search_url));
    mapkey((search_leader_key || 's') + (only_this_site_key || 'o') + alias, 'Search selected only in this site with ' + prompt, 'searchSelectedWith("{0}", true)'.format(search_url));
    vmapkey((search_leader_key || 's') + (only_this_site_key || 'o') + alias, 'Search selected only in this site with ' + prompt, 'searchSelectedWith("{0}", true)'.format(search_url));
}

function walkPageUrl(step) {
    var numbers = window.location.href.match(/^(.*\/[^\/\d]*)(\d+)$/);
    if (numbers && numbers.length === 3) {
        window.location.href = numbers[1] + (parseInt(numbers[2]) + step);
    }
}

function tabOpenLink(url) {
    url = url.convertLink();
    RUNTIME("openLink", {
        tab: {
            tabbed: true
        },
        position: runtime.settings.newTabPosition,
        url: url,
        repeats: 1
    });
}

function searchSelectedWith(se, onlyThisSite) {
    Normal.getContentFromClipboard(function(response) {
        var query = window.getSelection().toString() || response.data;
        if (onlyThisSite) {
            query += " site:" + window.location.hostname;
        }
        tabOpenLink(se + encodeURI(query));
    });
}

function clickOn(links) {
    var ret = false;
    if (typeof(links) === 'string') {
        links = $(links);
    }
    links.each(function() {
        Hints.dispatchMouseClick(this);
    });
}

function httpRequest(args, onSuccess) {
    args.action = "request";
    args.method = "get";
    runtime.command(args, onSuccess);
}

var settings;
function applySettings() {
    try {
        var theInstructions = runtime.settings.snippets;
        settings = runtime.settings;
        var F = new Function(theInstructions);
        F();
        RUNTIME('updateSettings', {
            noack: true,
            settings: settings
        });
    } catch (e) {
        console.log(e);
        runtime.command({
            action: "resetSettings",
            useDefault: true
        });
    }
    $(document).trigger("surfingkeys:settingsApplied");
}

runtime.actions['settingsUpdated'] = function(response) {
    runtime.settings = response.settings;
    applySettings();
};

runtime.runtime_handlers['focusFrame'] = function(msg, sender, response) {
    if (msg.frameId === window.frameId) {
        window.focus();
        Normal.highlightElement(document.body);
    }
};
$(document).on('surfingkeys:settingsApplied', function(e) {
    Events.resetListeners();
});

if (runtime && runtime.settings) {
    applySettings();
} else {
    $(document).on('surfingkeys:connected', function(e) {
        applySettings();
    });
}
