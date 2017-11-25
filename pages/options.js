var defaultMappingsEditor = ace.edit("defaultMappings");
defaultMappingsEditor.setTheme("ace/theme/chrome");
defaultMappingsEditor.setKeyboardHandler('ace/keyboard/vim');
defaultMappingsEditor.getSession().setMode("ace/mode/javascript");
$(defaultMappingsEditor.container).hide();
defaultMappingsEditor.setReadOnly(true);
defaultMappingsEditor.container.style.background="#f1f1f1";
defaultMappingsEditor.$blockScrolling = Infinity;

var mappingsEditor = null;
function createMappingEditor(mode, elmId) {
    var self = ace.edit(elmId);
    self = $.extend(self, mode);
    self = $.extend(self, {name: "mappingsEditor", eventListeners: {}, mode: 'normal'});

    self.addEventListener('keydown', function(event) {
        event.sk_suppressed = true;
        if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)
            && self.mode === 'normal' // vim in normal mode
            && (self.state.cm.state.vim.status === null || self.state.cm.state.vim.status === "") // and no pending normal operation
        ) {
            document.activeElement.blur();
            self.exit();
        }
    });
    $('#mappings textarea').on('focus', function() {
        setTimeout(function() {
            Hints.exit();
            Insert.exit();
            self.enter(0, true);
        }, 10);
    });

    self.setTheme("ace/theme/chrome");
    ace.config.loadModule('ace/ext/language_tools', function (mod) {
        ace.config.loadModule('ace/autocomplete', function (mod) {
            mod.Autocomplete.startCommand.bindKey = "Tab";
            mod.Autocomplete.prototype.commands['Space'] = mod.Autocomplete.prototype.commands['Tab'];
            mod.Autocomplete.prototype.commands['Tab'] = mod.Autocomplete.prototype.commands['Down'];
            mod.Autocomplete.prototype.commands['Shift-Tab'] = mod.Autocomplete.prototype.commands['Up'];
        });
        self.setOptions({
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: false,
            enableSnippets: false
        });
    });
    self.setKeyboardHandler('ace/keyboard/vim', function() {
        var cm = self.state.cm;
        cm.on('vim-mode-change', function(data) {
            self.mode = data.mode;
        });
        cm.constructor.Vim.defineEx("write", "w", function(cm, input) {
            saveSettings();
        });
        cm.constructor.Vim.defineEx("quit", "q", function(cm, input) {
            window.close();
        });
    });
    self.getSession().setMode("ace/mode/javascript");
    self.$blockScrolling = Infinity;

    return self;
}

function renderProxy(proxy) {
    var p = proxy.split(/\s+/);
    if (p.length > 0) {
        $("#proxy>select").val(p[0]);
        $("#proxy>input").val(p[1]);
    } else {
        $("#proxy>select").val("PROXY");
    }
}

function renderProxySettings(rs) {
    if (window.navigator.userAgent.indexOf("Firefox") > 0) {
        $('#proxyMode').closest('div.section').hide();
        return;
    }
    $('#proxyMode>select').val(rs.proxyMode);
    $("#proxy").hide();
    $('#autoproxy_hosts').hide();
    $('#proxyMode span[mode]').hide();
    $(`#proxyMode span[mode=${rs.proxyMode}]`).show();
    if (rs.proxyMode === "byhost") {
        $("#proxy").show();
        renderProxy(rs.proxy);

        var autoproxy_hosts = rs.autoproxy_hosts.sort().map(function(h) {
            return `<aphost><i role='remove'>␡</i><span>${h}</span></aphost>`;
        }).join("");
        $('#autoproxy_hosts').show();
        $('#autoproxy_hosts>div').html(autoproxy_hosts);

        $('#autoproxy_hosts').find('aphost>i').click(function() {
            var elm = $(this).closest('aphost');
            runtime.command({
                action: 'updateProxy',
                host: elm.find("span").text(),
                operation: 'remove'
            }, function() {
                elm.remove();
            });
        });
    } else if (rs.proxyMode === "always") {
        $("#proxy").show();
        renderProxy(rs.proxy);
    }
}

function _updateProxy(data) {
    data.action = 'updateProxy';
    runtime.command(data, function(res) {
        renderProxySettings(res);
    });
}

function __updateProxy(data) {
    _updateProxy({
        proxy: $('#proxy>select').val() + " " + $('#proxy>input').val()
    });
}

$('#proxyMode>select').change(function() {
    _updateProxy({
        mode: $(this).val()
    });
});

$('#proxy>select').change(__updateProxy);
$('#proxy>input').blur(__updateProxy);

$('#autoproxy_hosts>button').click(function() {
    _updateProxy({
        host: $('#autoproxy_hosts>input').val(),
        operation: 'add'
    });
});

function showAdvanced(flag) {
    if (flag) {
        $('#basicMappings').hide();
        $('#advancedSetting').show();
        $('#advancedToggler').attr('checked', 'checked');
    } else {
        $('#basicMappings').show();
        $('#advancedSetting').hide();
        $('#advancedToggler').removeAttr('checked');
    }
}

var localPathSaved = "";
function renderSettings(rs) {
    showAdvanced(rs.showAdvanced);
    $('#localPath').val(rs.localPath);
    localPathSaved = rs.localPath;
    var h = $(window).height() / 2;
    $(mappingsEditor.container).css('height', h);
    $(defaultMappingsEditor.container).css('height', h);
    if (rs.snippets && rs.snippets.length) {
        mappingsEditor.setValue(rs.snippets, -1);
    } else {
        mappingsEditor.setValue($('#sample').html(), -1);
    }

    renderProxySettings(rs);
}

runtime.on('settingsUpdated', function(resp) {
    if ('snippets' in resp.settings) {
        renderKeyMappings(resp.settings);
        if (resp.settings.snippets.length) {
            mappingsEditor.setValue(resp.settings.snippets, -1);
        } else {
            mappingsEditor.setValue($('#sample').html(), -1);
        }
    }
});

runtime.command({
    action: 'getSettings'
}, function(response) {
    mappingsEditor = createMappingEditor(Mode, 'mappings');
    renderSettings(response.settings);
    if ('error' in response.settings) {
        Front.showBanner(response.settings.error, 5000);
    }
});

$('#advancedToggler').click(function() {
    var newFlag = ($(this).attr('checked') === undefined);
    showAdvanced(newFlag);
    RUNTIME('updateSettings', {
        settings: {
            showAdvanced: newFlag
        }
    });
});
$('#resetSettings').click(function() {
    runtime.command({
        action: "resetSettings"
    }, function(response) {
        renderSettings(response.settings);
        renderKeyMappings(response.settings);
        Front.showBanner('Settings reset', 300);
    });
});

$('.infoPointer').click(function() {
    $('#' + $(this).attr('for')).toggle();
});

$('#showDefaultSettings').click(function() {
    if ($(defaultMappingsEditor.container).is(':visible')) {
        $(defaultMappingsEditor.container).hide();
        $(mappingsEditor.container).css('width', '100%');
    } else {
        httpRequest({
            url: chrome.extension.getURL('/pages/default.js'),
        }, function(res) {
            $(defaultMappingsEditor.container).css('display', 'inline-block');
            defaultMappingsEditor.setValue(res.text, -1);
            $(defaultMappingsEditor.container).css('width', '50%');
        });
        $(mappingsEditor.container).css('width', '50%');
    }
});

function getURIPath(fn) {
    if (fn.length && !/^\w+:\/\/\w+/i.test(fn) && fn.indexOf('file:///') === -1) {
        fn = fn.replace(/\\/g, '/');
        if (fn[0] === '/') {
            fn = fn.substr(1);
        }
        fn = "file:///" + fn;
    }
    return fn;
}
function saveSettings() {
    var settingsCode = mappingsEditor.getValue();
    var localPath = getURIPath($('#localPath').val().trim());
    if (localPath.length && localPath !== localPathSaved) {
        RUNTIME("loadSettingsFromUrl", {
            url: localPath
        });
        Front.showBanner('Loading settings from ' + localPath, 300);
    } else {
        var delta = runScript(settingsCode);
        if (delta.error === "") {

            RUNTIME('updateSettings', {
                settings: {
                    snippets: settingsCode,
                    localPath: getURIPath($('#localPath').val())
                }
            });

            Front.showBanner('Settings saved', 300);
        } else {
            Front.showBanner(delta.error, 9000);
        }
    }
}
$('#save_button').click(saveSettings);


var basicMappings = ['d', 'R', 'f', 'E', 'e', 'x', 'gg', 'j', '/', 'n', 'r', 'k', 'S', 'C', 'on', 'G', 'v', 'i', 'se', 'og', 'g0', 't', '<Ctrl-6>', 'yy', 'g$', 'D', 'ob', 'X', 'sm', 'sg', 'cf', 'yv', 'yt', 'N', 'l', 'cc', '$', 'yf', 'w', '0', 'yg', 'ow', 'cs', 'b', 'q', 'om', 'ya', 'h', 'gU', 'W', 'B', 'F', ';j'];

$(document).on('surfingkeys:defaultSettingsLoaded', function() {
    basicMappings = basicMappings.map(function(w, i) {
        return {
            origin: w,
            annotation: Normal.mappings.find(encodeKeystroke(w)).meta.annotation
        };
    });
});

function renderKeyMappings(rs) {
    var delta = runScript(`
settings.map = {};
settings.unmapAllExcept = {};
function map(a, b) {
    var f = false;
    for (var k in settings.map) {
        if (settings.map[k] === b) {
            settings.map[k] = a;
            f = true;
        }
    }
    if (!f) {
        settings.map[b] = a;
    }
}
function unmap(a) {
    settings.map[a] = "";
}
function unmapAllExcept(a, b) {
    settings.unmapAllExcept[b] = a;
}
${rs.snippets}`);

    initL10n(function(locale) {
        var customization = basicMappings.map(function(w, i) {
            var newKey = w.origin;
            if (delta.settings.map.hasOwnProperty(w.origin)) {
                newKey = delta.settings.map[w.origin];
            }
            return `<div>
    <span class=annotation>${locale(w.annotation)}</span>
    <span class=kbd-span><kbd origin="${w.origin}" new="${newKey}">${newKey ? htmlEncode(newKey) : "🚫"}</kbd></span>
    </div>`;
        });

        $('#basicMappings').html(customization);
        $('#basicMappings').find("kbd").click(function() {
            KeyPicker.enter(this);
        });
    });
}

$(document).on('surfingkeys:userSettingsLoaded', function(evt, rs) {
    renderKeyMappings(rs);
});

var KeyPicker = (function(mode) {
    var self = $.extend({
        name: "KeyPicker",
        frontendOnly: true,
        eventListeners: {}
    }, mode);

    function showKey() {
        var s = htmlEncode(_key);
        if (!s) {
            s = "&nbsp;";
        }
        $('#keyPicker').find("#inputKey").html(s);
    }

    var _key = "";
    self.addEventListener('keydown', function(event) {
        if (event.keyCode === 27) {
            $('#keyPicker').hide();
            self.exit();
        } else if (event.keyCode === 8) {
            var ek = encodeKeystroke(_key);
            ek = ek.substr(0, ek.length - 1);
            _key = decodeKeystroke(ek);
            showKey();
        } else if (event.keyCode === 13) {
            $('#keyPicker').hide();
            self.exit();
            _elm.innerHTML = (_key !== "") ? htmlEncode(_key) : "🚫";
            $(_elm).attr('new', _key);
            var kbds = $('#basicMappings').find("kbd").toArray();
            var originalKeys = kbds.map(function(m) {
                return $(m).attr('origin');
            }, {} );
            var realDefMap = [];
            var kbdMap = kbds.map(function(m, i) {
                var n = $(m).attr('new'), o = $(m).attr('origin');
                var c = [];
                if (n === "") {
                    c.push(`unmap("${o}");`);
                } else if (n !== o) {
                    var j = originalKeys.indexOf(n);
                    if (j !== -1 && i < j) {
                        // if the new key that user choosed was in default mappings
                        // and has not been modified (i < j)
                        // we need save the default binding first
                        c.push(`map(">_${n}", "${n}");`);
                        realDefMap.push(n);
                    }
                    if (realDefMap.indexOf(o) === -1) {
                        c.push(`map("${n}", "${o}");`);
                    } else {
                        c.push(`map("${n}", ">_${o}");`);
                    }
                }
                return c.join("\n");
            }).filter(function(m) {
                return m != "";
            }).join("\n");
            RUNTIME('updateSettings', {
                settings: {
                    snippets: kbdMap
                }
            });
        } else {
            if (event.sk_keyName.length > 1) {
                var keyStr = JSON.stringify({
                    metaKey: event.metaKey,
                    altKey: event.altKey,
                    ctrlKey: event.ctrlKey,
                    shiftKey: event.shiftKey,
                    keyCode: event.keyCode,
                    code: event.code,
                    composed: event.composed,
                    key: event.key
                }, null, 4);
                reportIssue("Unrecognized key event: {0}".format(event.sk_keyName), keyStr);
            } else {
                _key += decodeKeystroke(event.sk_keyName);
                showKey();
            }
        }
        event.sk_stopPropagation = true;
    });

    var _elm;
    self.enter = function(elm) {
        mode.enter.apply(self, arguments);
        _key = $(elm).attr('new');
        showKey();
        $('#keyPicker').show();
        _elm = elm;
    };

    return self;
})(Mode);
