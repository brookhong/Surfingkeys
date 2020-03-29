var defaultMappingsEditor = ace.edit("defaultMappings");
defaultMappingsEditor.setTheme("ace/theme/chrome");
defaultMappingsEditor.setKeyboardHandler('ace/keyboard/vim');
defaultMappingsEditor.getSession().setMode("ace/mode/javascript");
defaultMappingsEditor.container.hide();
defaultMappingsEditor.setReadOnly(true);
defaultMappingsEditor.container.style.background="#f1f1f1";
defaultMappingsEditor.$blockScrolling = Infinity;

var mappingsEditor = null;
function createMappingEditor(elmId) {
    var _ace = ace.edit(elmId);
    _ace.mode = "normal";

    var self = new Mode("mappingsEditor");

    self.container = _ace.container;
    self.setValue = function(v, cursorPos) {
        _ace.setValue(v, cursorPos);
    };
    self.getValue = function() {
        return _ace.getValue();
    };

    self.addEventListener('keydown', function(event) {
        event.sk_suppressed = true;
        if (Mode.isSpecialKeyOf("<Esc>", event.sk_keyName)
            && _ace.mode === 'normal' // vim in normal mode
            && (_ace.state.cm.state.vim.status === null || _ace.state.cm.state.vim.status === "") // and no pending normal operation
        ) {
            document.activeElement.blur();
            self.exit();
        }
    });
    document.querySelector('#mappings textarea').onfocus = function() {
        setTimeout(function() {
            Hints.exit();
            Insert.exit();
            self.enter(0, true);
        }, 10);
    };

    _ace.setTheme("ace/theme/chrome");
    ace.config.loadModule('ace/ext/language_tools', function (mod) {
        ace.config.loadModule('ace/autocomplete', function (mod) {
            mod.Autocomplete.startCommand.bindKey = "Tab";
            mod.Autocomplete.prototype.commands['Space'] = mod.Autocomplete.prototype.commands['Tab'];
            mod.Autocomplete.prototype.commands['Tab'] = mod.Autocomplete.prototype.commands['Down'];
            mod.Autocomplete.prototype.commands['Shift-Tab'] = mod.Autocomplete.prototype.commands['Up'];
        });
        _ace.setOptions({
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: false,
            enableSnippets: false
        });
    });
    _ace.setKeyboardHandler('ace/keyboard/vim', function() {
        var cm = _ace.state.cm;
        cm.on('vim-mode-change', function(data) {
            _ace.mode = data.mode;
        });
        cm.constructor.Vim.defineEx("write", "w", function(cm, input) {
            saveSettings();
        });
        cm.constructor.Vim.defineEx("quit", "q", function(cm, input) {
            window.close();
        });
    });
    _ace.getSession().setMode("ace/mode/javascript");
    _ace.$blockScrolling = Infinity;

    return self;
}

var proxyModeSelect = document.querySelector("#proxyMode>select");
var proxyGroup = document.getElementById("proxyMode").parentElement;
var addProxyPair = document.getElementById('addProxyPair');
addProxyPair.onclick = function () {
    _updateProxy({
        number: document.querySelectorAll('div.proxyPair').length,
        proxy: "SOCKS5 127.0.0.1:1080"
    });
};

function renderAutoproxyHosts(rs, divProxyPair, number) {
    var desc = "For below hosts, above proxy will be used, click ❌ to remove one.";
    if (rs.proxyMode === "bypass") {
        desc = "For below hosts, <b>NO</b> proxy will be used, click ❌ to remove one.";
    }
    setInnerHTML(divProxyPair.querySelector('.autoproxy_hosts>h3'), desc);

    var autoproxyHostsInput = divProxyPair.querySelector(".autoproxy_hosts>input");

    var ih = autoproxyHostsInput.value;
    autoproxyHostsInput.value = "";
    var autoproxy_hosts = rs.autoproxy_hosts[number].sort().map(function(h) {
        return `<aphost><span class='remove'>❌</span><span class="${h === ih ? 'highlight' : ''}">${h}</span></aphost>`;
    }).join("");
    setInnerHTML(divProxyPair.querySelector('.autoproxy_hosts>div'), autoproxy_hosts);

    var autoproxyHostsDiv = divProxyPair.querySelector(".autoproxy_hosts");
    autoproxyHostsDiv.querySelectorAll('aphost>span.remove').forEach(function(ph) {
        ph.onclick = function() {
            var elm = this.closest('aphost');
            RUNTIME('updateProxy', {
                number: number,
                host: elm.querySelector("span:nth-child(2)").innerText,
                operation: 'remove'
            }, function() {
                elm.remove();
            });
        };
    });

    function addAutoProxyHost() {
        _updateProxy({
            number: number,
            host: autoproxyHostsInput.value,
            operation: 'add'
        });
    }

    autoproxyHostsInput.onkeyup = function(e) {
        if (e.keyCode === 13) {
            addAutoProxyHost();
        }
    };

    divProxyPair.querySelector('.autoproxy_hosts>button').onclick = addAutoProxyHost;

    divProxyPair.querySelector('.deleteProxyPair').onclick = function() {
        _updateProxy({
            number: number,
            operation: "deleteProxyPair"
        });
    };
}

function renderProxyPair(proxy, number) {
    var divProxyPair = document.querySelector(`div.proxyPair[number='${number}']`);
    if (divProxyPair === null) {
        divProxyPair = createElement(document.getElementById("templateProxyPair").textContent.trim());
        divProxyPair.setAttribute("number", number);
        proxyGroup.insertBefore(divProxyPair, addProxyPair);
    }

    var proxySelect = divProxyPair.querySelector(".proxy>select");
    var proxyInput = divProxyPair.querySelector(".proxy>input");

    function __updateProxy(data) {
        _updateProxy({
            number: number,
            proxy: proxySelect.value + " " + proxyInput.value
        });
    }

    proxySelect.onchange = __updateProxy;
    proxyInput.onblur = __updateProxy;

    var p = proxy.split(/\s+/);
    if (p.length > 0) {
        proxySelect.value = p[0];
        proxyInput.value = p[1];
    } else {
        proxySelect.value = "PROXY";
    }
    return divProxyPair;
}

function renderProxySettings(rs) {
    proxyModeSelect.value = rs.proxyMode;
    proxyModeSelect.onchange = function() {
        _updateProxy({
            mode: this.value
        });
    };
    document.querySelectorAll('#proxyMode span[mode]').forEach(function(span) {
        span.hide();
    });
    document.querySelector(`#proxyMode span[mode=${rs.proxyMode}]`).show();
    if (rs.proxyMode === "always" || rs.proxyMode === "byhost" || rs.proxyMode === "bypass") {

        document.querySelectorAll('div.proxyPair').remove();
        if (rs.proxyMode === "always") {
            var pp = renderProxyPair(rs.proxy[0], 0);
            pp.querySelector('.autoproxy_hosts').hide();
            addProxyPair.hide();
        } else {
            rs.proxy.forEach(function(proxy, number) {
                var pp = renderProxyPair(proxy, number);
                pp.querySelector('.autoproxy_hosts').show();
                renderAutoproxyHosts(rs, pp, number);
            });
            addProxyPair.show();
        }
        var deleteProxyPairs = document.querySelectorAll('div.deleteProxyPair');
        if (deleteProxyPairs.length > 1) {
            deleteProxyPairs.show();
        } else {
            deleteProxyPairs.hide();
        }
    }
}

function _updateProxy(data) {
    RUNTIME('updateProxy', data, function(res) {
        renderProxySettings(res);
    });
}

var basicMappingsDiv = document.getElementById("basicMappings");
var advancedSettingDiv = document.getElementById("advancedSetting");
var advancedTogglerDiv = document.getElementById("advancedToggler");
function showAdvanced(flag) {
    if (flag) {
        basicMappingsDiv.hide();
        advancedSettingDiv.show();
        advancedTogglerDiv.setAttribute('checked', 'checked');
    } else {
        basicMappingsDiv.show();
        advancedSettingDiv.hide();
        advancedTogglerDiv.removeAttribute('checked');
    }
}

var localPathSaved = "";
var localPathInput = document.getElementById("localPath");
var sample = document.getElementById("sample").innerHTML;
function renderSettings(rs) {
    showAdvanced(rs.showAdvanced);
    if (rs.localPath) {
        localPathInput.value = rs.localPath;
        localPathSaved = rs.localPath;
    }
    var h = window.innerHeight / 2;
    mappingsEditor.container.style.height = h + "px";
    defaultMappingsEditor.container.style.height = h + "px";
    if (rs.snippets && rs.snippets.length) {
        mappingsEditor.setValue(rs.snippets, -1);
    } else {
        mappingsEditor.setValue(sample, -1);
    }

    renderProxySettings(rs);
}

RUNTIME('getSettings', null, function(response) {
    mappingsEditor = createMappingEditor('mappings');
    renderSettings(response.settings);
    if ('error' in response.settings) {
        Front.showBanner(response.settings.error, 5000);
    }
});

advancedTogglerDiv.onclick = function() {
    var newFlag = this.checked;
    showAdvanced(newFlag);
    RUNTIME('updateSettings', {
        settings: {
            showAdvanced: newFlag
        }
    });
};
document.getElementById('resetSettings').onclick = function() {
    if (this.innerText === "Reset") {
        this.innerText = "WARNING! This will clear all your settings. Click this again to continue.";
    } else {
        RUNTIME("resetSettings", null, function(response) {
            renderSettings(response.settings);
            renderKeyMappings(response.settings);
            Front.showBanner('Settings reset', 300);
        });
    }
};

document.querySelector('.infoPointer').onclick = function() {
    var f = document.getElementById(this.getAttribute("for"));
    if (f.style.display === "none") {
        f.style.display = "";
    } else {
        f.style.display = "none";
    }
};

document.getElementById('showDefaultSettings').onclick = function() {
    if (defaultMappingsEditor.container.style.display !== "none") {
        defaultMappingsEditor.container.hide();
        mappingsEditor.container.style.width = "100%";
    } else {
        httpRequest({
            url: chrome.extension.getURL('/pages/default.js'),
        }, function(res) {
            defaultMappingsEditor.container.style.display = "inline-block";
            defaultMappingsEditor.setValue(res.text, -1);
            defaultMappingsEditor.container.style.width = "50%";
        });
        mappingsEditor.container.style.width = "50%";
    }
};

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
    var localPath = getURIPath(localPathInput.value.trim());
    if (localPath.length && localPath !== localPathSaved) {
        RUNTIME('loadSettingsFromUrl', {
            url: localPath
        }, function(res) {
            Front.showBanner(res.status + ' to load settings from ' + localPath, 300);
            renderKeyMappings(res);
            if (res.snippets && res.snippets.length) {
                localPathSaved = localPath;
                mappingsEditor.setValue(res.snippets, -1);
            } else {
                mappingsEditor.setValue(sample, -1);
            }
        });
    } else {
        RUNTIME('updateSettings', {
            settings: {
                snippets: settingsCode,
                localPath: getURIPath(localPathInput.value)
            }
        });

        Front.showBanner('Settings saved', 300);
    }
}
document.getElementById('save_button').onclick = saveSettings;

var basicMappings = ['d', 'R', 'f', 'E', 'e', 'x', 'gg', 'j', '/', 'n', 'r', 'k', 'S', 'C', 'on', 'G', 'v', 'i', 'se', 'og', 'g0', 't', '<Ctrl-6>', 'yy', 'g$', 'D', 'ob', 'X', 'sm', 'sg', 'cf', 'yv', 'yt', 'N', 'l', 'cc', '$', 'yf', 'w', '0', 'yg', 'ow', 'cs', 'b', 'om', 'ya', 'h', 'gU', 'W', 'B', 'F', ';j'];

basicMappings = basicMappings.map(function(w, i) {
    return {
        origin: w,
        annotation: Normal.mappings.find(KeyboardUtils.encodeKeystroke(w)).meta.annotation
    };
});

var _sanboxCallback = {};
function evalInSandbox(code, cb) {
    var id = generateQuickGuid();
    document.getElementById("sandbox").contentWindow.postMessage({
        id: id,
        action: "evalInSandbox",
        code: code
    }, '*');
    if (cb) {
        _sanboxCallback[id] = cb;
    }
}
window.addEventListener('message', function(event) {
    var command = event.data.action;
    switch(command) {
        case 'resultInSandbox':
            if (_sanboxCallback.hasOwnProperty(event.data.id)) {
                _sanboxCallback[event.data.id](event.data.result);
                delete _sanboxCallback[event.data.id];
            }
            break;
        default:
            break;
    }
});

function renderKeyMappings(rs) {
    evalInSandbox(rs.snippets, function(delta) {

        initL10n(function (locale) {
            var customization = basicMappings.map(function (w, i) {
                var newKey = w.origin;
                if (delta.settings.map.hasOwnProperty(w.origin)) {
                    newKey = delta.settings.map[w.origin];
                }
                return `<div>
    <span class=annotation>${locale(w.annotation)}</span>
    <span class=kbd-span><kbd origin="${w.origin}" new="${newKey}">${newKey ? htmlEncode(newKey) : "🚫"}</kbd></span>
    </div>`;
            });

            setInnerHTML(basicMappingsDiv, customization.join(""));
            basicMappingsDiv.querySelectorAll("kbd").forEach(function(d) {
                d.onclick = function () {
                    KeyPicker.enter(this);
                };
            });
        });
    });
}

document.addEventListener("surfingkeys:userSettingsLoaded", function(evt) {
    renderKeyMappings(evt.detail);
});

var KeyPicker = (function() {
    var self = new Mode("KeyPicker");

    function showKey() {
        var s = htmlEncode(_key);
        if (!s) {
            s = "&nbsp;";
        }
        setInnerHTML(document.getElementById("inputKey"), s);
    }

    var _key = "";
    var keyPickerDiv = document.getElementById("keyPicker");
    self.addEventListener('keydown', function(event) {
        if (event.keyCode === 27) {
            keyPickerDiv.hide();
            self.exit();
        } else if (event.keyCode === 8) {
            var ek = KeyboardUtils.encodeKeystroke(_key);
            ek = ek.substr(0, ek.length - 1);
            _key = KeyboardUtils.decodeKeystroke(ek);
            showKey();
        } else if (event.keyCode === 13) {
            keyPickerDiv.hide();
            self.exit();
            setInnerHTML(_elm, (_key !== "") ? htmlEncode(_key) : "🚫");
            _elm.setAttribute('new', _key);
            var kbds = Array.from(basicMappingsDiv.querySelectorAll("kbd"));
            var originalKeys = kbds.map(function(m) {
                return m.getAttribute('origin');
            }, {} );
            var realDefMap = [];
            var kbdMap = kbds.map(function(m, i) {
                var n = m.getAttribute('new'), o = m.getAttribute('origin');
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
                reportIssue(`Unrecognized key event: ${event.sk_keyName}`, keyStr);
            } else {
                _key += KeyboardUtils.decodeKeystroke(event.sk_keyName);
                showKey();
            }
        }
        event.sk_stopPropagation = true;
    });

    var _elm;
    var _enter = self.enter;
    self.enter = function(elm) {
        _enter.call(self);
        _key = elm.getAttribute("new");
        showKey();
        keyPickerDiv.show();
        _elm = elm;
    };

    return self;
})();
