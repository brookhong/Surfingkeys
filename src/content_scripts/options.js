export default function(
    RUNTIME,
    KeyboardUtils,
    Mode,
    createElementWithContent,
    getBrowserName,
    htmlEncode,
    initL10n,
    reportIssue,
    setSanitizedContent,
    showBanner,
) {
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

    if (getBrowserName() === "Firefox") {
        document.querySelector("#localPathForSettings").style.display = "";
        document.querySelector("#proxySettings").style.display = "none";
    } else if (getBrowserName().startsWith("Safari")) {
        document.querySelector("#localPathHelpForFile").remove();
        document.querySelector("#proxySettings").style.display = "none";
        document.querySelector("#donationDiv").style.display = "none";
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
        setSanitizedContent(divProxyPair.querySelector('.autoproxy_hosts>h3'), desc);

        var autoproxyHostsInput = divProxyPair.querySelector(".autoproxy_hosts>input");

        var ih = autoproxyHostsInput.value;
        autoproxyHostsInput.value = "";
        var autoproxy_hosts = rs.autoproxy_hosts[number].sort().map(function(h) {
            return `<div class='aphost'><span class='remove'>❌</span><span class="${h === ih ? 'highlight' : ''}">${h}</span></div>`;
        }).join("");
        setSanitizedContent(divProxyPair.querySelector('.autoproxy_hosts>div'), autoproxy_hosts);

        var autoproxyHostsDiv = divProxyPair.querySelector(".autoproxy_hosts");
        autoproxyHostsDiv.querySelectorAll('div.aphost>span.remove').forEach(function(ph) {
            ph.onclick = function() {
                var elm = this.closest('div.aphost');
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
            divProxyPair = createElementWithContent('div',
                document.getElementById("templateProxyPair").innerHTML.trim(), {"class": "proxyPair", "number": number});
            proxyGroup.insertBefore(divProxyPair, addProxyPair);
        }

        var proxySelect = divProxyPair.querySelector(".proxy>select");
        var proxyInput = divProxyPair.querySelector(".proxy>input");

        function __updateProxy(data) {
            let v = proxyInput.value.replace(/\W+([0-9]+)$/, ":$1");
            _updateProxy({
                number: number,
                proxy: proxySelect.value + " " + v
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

    const basicSettingsDiv = document.getElementById("basicSettings");
    const basicMappingsDiv = document.getElementById("basicMappings");
    const advancedSettingDiv = document.getElementById("advancedSetting");
    const advancedToggler = document.getElementById("advancedToggler");
    function showAdvanced(flag) {
        if (flag) {
            basicSettingsDiv.hide();
            advancedSettingDiv.show();
            advancedToggler.setAttribute('checked', 'checked');
        } else {
            basicSettingsDiv.show();
            advancedSettingDiv.hide();
            advancedToggler.removeAttribute('checked');
        }
    }

    var localPathSaved = "";
    var localPathInput = document.getElementById("localPath");
    var sample = document.getElementById("sample").innerHTML;
    function renderSettings(rs) {
        if (rs.isMV3) {
            document.getElementById("advancedTip").innerText = "First turn on 'Developer mode' in chrome://extensions/, then turn on 'Allow User Scripts' in Surfingkeys extension details, then toggle the 'Advanced mode' flag here.";
            advancedToggler.disabled = !rs.isUserScriptsAvailable;
            showAdvanced(rs.isUserScriptsAvailable && rs.showAdvanced);
        } else {
            showAdvanced(rs.showAdvanced);
        }
        if (rs.localPath) {
            localPathInput.value = rs.localPath;
            localPathSaved = rs.localPath;
        }
        var h = window.innerHeight / 2;
        mappingsEditor.container.style.height = h + "px";
        if (rs.snippets && rs.snippets.length) {
            mappingsEditor.setValue(rs.snippets, -1);
        } else {
            mappingsEditor.setValue(sample, -1);
        }

        renderProxySettings(rs);
    }


    advancedToggler.onclick = function() {
        var newFlag = this.checked;
        RUNTIME('updateSettings', {
            settings: {
                showAdvanced: newFlag
            }
        }, (resp) => {
            if (resp.error) {
                showBanner(resp.error, 3000);
            } else {
                showAdvanced(newFlag);
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
                showBanner('Settings reset', 1000);
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
                showBanner(res.status + ' to load settings from ' + localPath, 5000);
                renderKeyMappings(res);
                if (res.snippets && res.snippets.length) {
                    localPathSaved = localPath;
                    mappingsEditor.setValue(res.snippets, -1);
                } else if (settingsCode === "") {
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

            showBanner('Settings saved', 1000);
        }
    }
    document.getElementById('save_button').onclick = saveSettings;

    var basicMappings = ['d', 'R', 'f', 'E', 'e', 'x', 'gg', 'j', '/', 'n', 'r', 'k', 'S', 'C', 'on', 'G', 'v', 'i', ';e', 'og', 'g0', 't', '<Ctrl-6>', 'yy', 'g$', 'D', 'ob', 'X', 'sg', 'cf', 'yv', 'yt', 'N', 'l', 'cc', '$', 'yf', 'w', '0', 'yg', 'ow', 'cs', 'b', 'om', 'ya', 'h', 'gU', 'W', 'B', 'F', ';j'];


    document.addEventListener("surfingkeys:defaultSettingsLoaded", function(evt) {
        const { normal } = evt.detail;
        basicMappings = basicMappings.map(function(w, i) {
            const binding = normal.mappings.find(KeyboardUtils.encodeKeystroke(w));
            if (binding) {
                return {
                    origin: w,
                    annotation: binding.meta.annotation
                };
            } else {
                return null;
            }
        }).filter((m) => m !== null);;
    });

    function renderSearchAlias(frontCommand, disabledSearchAliases) {
        new Promise((r, j) => {
            const getSearchAliases = () => {
                frontCommand({
                    action: 'getSearchAliases'
                }, function(response) {
                    if (Object.keys(response.aliases).length > 0) {
                        r(response.aliases);
                    } else {
                        setTimeout(getSearchAliases, 300);
                    }
                });
            };
            getSearchAliases();
        }).then((aliases) => {
            const allAliases = {};
            for (const key in aliases) {
                let prompt = aliases[key].prompt;
                if (!prompt.startsWith("<img src=")) {
                    prompt = prompt.replace(/<span class='separator'>.*/, '');
                }
                allAliases[key] = { prompt, checked: "checked" };
            }
            for (const key in disabledSearchAliases) {
                allAliases[key] = { prompt: disabledSearchAliases[key], checked: "" };
            }
            for (const key in allAliases) {
                const { prompt, checked } = allAliases[key];
                const elm = createElementWithContent("div", `<div class='remove'><input type="checkbox" ${checked} /></div><span class='prompt'>${prompt}</span>`);
                document.querySelector("#searchAliases").appendChild(elm);

                elm.querySelector("input").onchange = () => {
                    if (disabledSearchAliases.hasOwnProperty(key)) {
                        delete disabledSearchAliases[key];
                    } else {
                        disabledSearchAliases[key] = prompt;
                    }

                    RUNTIME('updateSettings', {
                        settings: {
                            disabledSearchAliases
                        }
                    });
                };
            }
        });
    }

    function renderKeyMappings(rs) {
        initL10n(function (locale) {
            var customization = basicMappings.map(function (w, i) {
                var newKey = w.origin;
                if (rs.basicMappings && rs.basicMappings.hasOwnProperty(w.origin)) {
                    newKey = rs.basicMappings[w.origin];
                }
                return `<div>
                    <span class=annotation>${locale(w.annotation)}</span>
                    <span class=kbd-span><kbd data-origin="${w.origin}" data-custom="${newKey}">${newKey ? htmlEncode(newKey) : "🚫"}</kbd></span>
                </div>`;
            });

            setSanitizedContent(basicMappingsDiv, customization.join(""));
            basicMappingsDiv.querySelectorAll("kbd").forEach(function(d) {
                d.onclick = function () {
                    KeyPicker.enter(this);
                };
            });
        });
    }

    document.addEventListener("surfingkeys:userSettingsLoaded", function(evt) {
        const { settings, disabledSearchAliases, frontCommand } = evt.detail;
        mappingsEditor = createMappingEditor('mappings');
        renderSettings(settings);
        if ('error' in settings) {
            showBanner(settings.error, 5000);
        }
        renderSearchAlias(frontCommand, disabledSearchAliases || {});
        renderKeyMappings(settings);
    });

    var KeyPicker = (function() {
        var self = new Mode("KeyPicker");

        function showKey() {
            var s = htmlEncode(_key);
            if (!s) {
                s = "&nbsp;";
            }
            setSanitizedContent(document.getElementById("inputKey"), s);
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
                setSanitizedContent(_elm, (_key !== "") ? htmlEncode(_key) : "🚫");
                _elm.dataset.custom = _key;
                const realDefMap = {};
                Array.from(basicMappingsDiv.querySelectorAll("kbd")).forEach((m) => {
                    var n = m.dataset.custom;
                    if (m.dataset.origin !== n) {
                        realDefMap[m.dataset.origin] = n;
                    }
                });
                RUNTIME('updateSettings', {
                    settings: {
                        basicMappings: realDefMap
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

            _key = elm.innerText;
            if (_key === "🚫") {
                _key = "";
            }

            showKey();
            keyPickerDiv.show();
            _elm = elm;
        };

        return self;
    })();
}
