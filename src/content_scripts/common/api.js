import { RUNTIME, dispatchSKEvent, runtime } from './runtime.js';
import Trie from './trie';
import Mode from './mode';
import KeyboardUtils from './keyboardUtils';
import {
    LOG,
    actionWithSelectionPreserved,
    constructSearchURL,
    getBrowserName,
    getClickableElements,
    getCssSelectorsOfEditable,
    getRealEdit,
    getTextNodePos,
    getWordUnderCursor,
    htmlEncode,
    insertJS,
    isElementPartiallyInViewport,
    mapInMode,
    parseAnnotation,
    setSanitizedContent,
    showBanner,
    showPopup,
    tabOpenLink,
    toggleQuote,
} from './utils.js';

function createAPI(clipboard, insert, normal, hints, visual, front, browser) {

    function createKeyTarget(code, ag, repeatIgnore) {
        var keybound = {
            code: code
        };
        if (repeatIgnore) {
            keybound.repeatIgnore = repeatIgnore;
        }
        if (ag) {
            ag = parseAnnotation(ag);
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
            var old = mode.mappings.remove(keys);
            if (old) {
                var warning;
                if (old.meta) {
                    warning = `${old.meta.word} for [${old.meta.annotation}] is overridden by [${annotation}].`;
                } else {
                    warning = old.getMetas(function() { return true;}).map(function(meta) {
                        return `${meta.word} for [${meta.annotation}] is overridden by [${annotation}].`;
                    });
                }
                LOG("warn", warning);
            } else if (keys.length > 1) {
                var p = keys.substr(0, keys.length - 1);
                while (p.length > 0) {
                    old = mode.mappings.find(p);
                    if (old && old.meta) {
                        LOG("warn", `${old.meta.word} for [${old.meta.annotation}] precedes ${keys}.`);
                        return;
                    }
                    p = p.substr(0, p.length - 1);
                }
            }
            var keybound = createKeyTarget(jscode, {annotation: annotation, feature_group: ((mode === visual) ? 9 :14)}, options.repeatIgnore);
            mode.mappings.add(keys, keybound);
        }
    }

    /**
     * Create a shortcut in normal mode to execute your own action.
     *
     * @param {string} keys the key sequence for the shortcut.
     * @param {string} annotation a help message to describe the action, which will displayed in help opened by `?`.
     * @param {function} jscode a Javascript function to be bound. If the function needs an argument, next pressed key will be fed to the function.
     * @param {object} [options=null] `domain`: regex, a Javascript regex pattern to identify the domains that this mapping works, for example, `/github\.com/i` says that this mapping works only for github.com, `repeatIgnore`: boolean, whether this action can be repeated by dot command.
     *
     * @example
     * mapkey("<Space>", "pause/resume on youtube", function() {
     *     var btn = document.querySelector("button.ytp-ad-overlay-close-button") || document.querySelector("button.ytp-ad-skip-button") || document.querySelector('ytd-watch-flexy button.ytp-play-button');
     *     btn.click();
     * }, {domain: /youtube.com/i});
     */
    function mapkey(keys, annotation, jscode, options) {
        _mapkey(normal, keys, annotation, jscode, options);
    }

    /**
     * Create a shortcut in visual mode to execute your own action.
     *
     * @param {string} keys the key sequence for the shortcut.
     * @param {string} annotation a help message to describe the action, which will displayed in help opened by `?`.
     * @param {function} jscode a Javascript function to be bound. If the function needs an argument, next pressed key will be fed to the function.
     * @param {object} [options=null] `domain`: regex, a Javascript regex pattern to identify the domains that this mapping works, for example, `/github\.com/i` says that this mapping works only for github.com, `repeatIgnore`: boolean, whether this action can be repeated by dot command.
     *
     * @see mapkey
     */
    function vmapkey(keys, annotation, jscode, options) {
        _mapkey(visual, keys, annotation, jscode, options);
    }

    /**
     * Create a shortcut in insert mode to execute your own action.
     *
     * @param {string} keys the key sequence for the shortcut.
     * @param {string} annotation a help message to describe the action, which will displayed in help opened by `?`.
     * @param {function} jscode a Javascript function to be bound. If the function needs an argument, next pressed key will be fed to the function.
     * @param {object} [options=null] `domain`: regex, a Javascript regex pattern to identify the domains that this mapping works, for example, `/github\.com/i` says that this mapping works only for github.com, `repeatIgnore`: boolean, whether this action can be repeated by dot command.
     *
     * @see mapkey
     */
    function imapkey(keys, annotation, jscode, options) {
        _mapkey(insert, keys, annotation, jscode, options);
    }

    /**
     * Map a key sequence to another in normal mode.
     *
     * @param {string} new_keystroke a key sequence to replace
     * @param {string} old_keystroke a key sequence to be replaced
     * @param {regex} [domain=null] a Javascript regex pattern to identify the domains that this mapping works.
     * @param {string} [new_annotation=null] use it instead of the annotation from old_keystroke if provided.
     *
     * @example
     * map(';d', '<Ctrl-Alt-d>');
     */
    function map(new_keystroke, old_keystroke, domain, new_annotation) {
        if (_isDomainApplicable(domain)) {
            if (old_keystroke[0] === ':' && old_keystroke.length > 1) {
                var cmdline = old_keystroke.substr(1);
                var keybound = createKeyTarget(function () {
                    front.executeCommand(cmdline);
                }, new_annotation ? parseAnnotation({ annotation: new_annotation }) : null, false);
                normal.mappings.add(KeyboardUtils.encodeKeystroke(new_keystroke), keybound);
            } else {
                if (!mapInMode(normal, new_keystroke, old_keystroke) && old_keystroke in Mode.specialKeys) {
                    Mode.specialKeys[old_keystroke].push(new_keystroke);
                    dispatchSKEvent('addMapkey', ["Mode", new_keystroke, old_keystroke]);
                } else {
                    LOG("warn", `${old_keystroke} not found in normal mode.`);
                }
            }
        }
    }

    /**
     * Unmap a key sequence in normal mode.
     *
     * @param {string} keystroke a key sequence to be removed.
     * @param {regex} [domain=null] a Javascript regex pattern to identify the domains that this mapping will be removed.
     *
     * @example
     * unmap("<<", /youtube.com/);
     */
    function unmap(keystroke, domain) {
        if (_isDomainApplicable(domain)) {
            var old_map = normal.mappings.find(KeyboardUtils.encodeKeystroke(keystroke));
            if (old_map) {
                normal.mappings.remove(KeyboardUtils.encodeKeystroke(keystroke));
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

    /**
     * Unmap all keybindings except those specified.
     *
     * @param {array} keystrokes the keybindings you want to keep.
     * @param {regex} [domain=null] a Javascript regex pattern to identify the domains that this mapping will be removed.
     *
     * @example
     *
     * unmapAllExcept(['E','R','T'], /google.com|twitter.com/);
     */
    function unmapAllExcept(keystrokes, domain) {
        if (_isDomainApplicable(domain)) {
            var modes = [normal, insert];
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

    /**
     * Map a key sequence to another in insert mode.
     *
     * @param {string} new_keystroke a key sequence to replace
     * @param {string} old_keystroke a key sequence to be replaced
     * @param {regex} [domain=null] a Javascript regex pattern to identify the domains that this mapping works.
     * @param {string} [new_annotation=null] use it instead of the annotation from old_keystroke if provided.
     *
     * @see map
     */
    function imap(new_keystroke, old_keystroke, domain, new_annotation) {
        if (_isDomainApplicable(domain)) {
            mapInMode(insert, new_keystroke, old_keystroke);
        }
    }

    /**
     * Unmap a key sequence in insert mode.
     *
     * @param {string} keystroke a key sequence to be removed.
     * @param {regex} [domain=null] a Javascript regex pattern to identify the domains that this mapping will be removed.
     *
     * @see unmap
     */
    function iunmap(keystroke, domain) {
        if (_isDomainApplicable(domain)) {
            insert.mappings.remove(KeyboardUtils.encodeKeystroke(keystroke));
        }
    }

    /**
     * Map a key sequence to another in omnibar.
     *
     * @param {string} new_keystroke a key sequence to replace
     * @param {string} old_keystroke a key sequence to be replaced
     * @param {regex} [domain=null] a Javascript regex pattern to identify the domains that this mapping works.
     * @param {string} [new_annotation=null] use it instead of the annotation from old_keystroke if provided.
     *
     * @see map
     */
    function cmap(new_keystroke, old_keystroke, domain, new_annotation) {
        if (_isDomainApplicable(domain)) {
            dispatchSKEvent('addMapkey', ["Omnibar", new_keystroke, old_keystroke]);
        }
    }

    /**
     * Map a key sequence to another in visual mode.
     *
     * @param {string} new_keystroke a key sequence to replace
     * @param {string} old_keystroke a key sequence to be replaced
     * @param {regex} [domain=null] a Javascript regex pattern to identify the domains that this mapping works.
     * @param {string} [new_annotation=null] use it instead of the annotation from old_keystroke if provided.
     *
     * @see map
     */
    function vmap(new_keystroke, old_keystroke, domain, new_annotation) {
        if (_isDomainApplicable(domain)) {
            mapInMode(visual, new_keystroke, old_keystroke);
        }
    }

    /**
     * Unmap a key sequence in visual mode.
     *
     * @param {string} keystroke a key sequence to be removed.
     * @param {regex} [domain=null] a Javascript regex pattern to identify the domains that this mapping will be removed.
     *
     * @see unmap
     */
    function vunmap(keystroke, domain) {
        if (_isDomainApplicable(domain)) {
            visual.mappings.remove(KeyboardUtils.encodeKeystroke(keystroke));
        }
    }

    /**
     * Map a key sequence to another in lurk mode.
     *
     * @param {string} new_keystroke a key sequence to replace
     * @param {string} old_keystroke a key sequence to be replaced
     * @param {regex} [domain=null] a Javascript regex pattern to identify the domains that this mapping works.
     * @param {string} [new_annotation=null] use it instead of the annotation from old_keystroke if provided.
     *
     * @see map
     */
    function lmap(new_keystroke, old_keystroke, domain, new_annotation) {
        if (_isDomainApplicable(domain)) {
            normal.addLurkMap(new_keystroke, old_keystroke);
        }
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
        dispatchSKEvent('addVimMap', [lhs, rhs, ctx]);
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
        dispatchSKEvent('addVimKeyMap', Array.from(arguments));
    }

    function _addSearchAlias(alias, prompt, url, suggestionURL, listSuggestion, options) {
        front.addSearchAlias(alias, prompt, url, suggestionURL, listSuggestion, options);
    }

    function _removeSearchAlias(alias) {
        front.removeSearchAlias(alias);
    }

    /**
     * Add a search engine alias into Omnibar.
     *
     * @param {string} alias the key to trigger this search engine, one or several chars, used as search alias, when you input the string and press `space` in omnibar, the search engine will be triggered.
     * @param {string} prompt a caption to be placed in front of the omnibar.
     * @param {string} search_url the URL of the search engine, for example, `https://www.s.com/search.html?query=`, if there are extra parameters for the search engine, you can use it as `https://www.s.com/search.html?query={0}&type=cs` or `https://www.s.com/search.html?type=cs&query=`(since order of URL parameters usually does not matter).
     * @param {string} [search_leader_key=s] `<search_leader_key><alias>` in normal mode will search selected text with this search engine directly without opening the omnibar, for example `sd`.
     * @param {string} [suggestion_url=null] the URL to fetch suggestions in omnibar when this search engine is triggered.
     * @param {function} [callback_to_parse_suggestion=null] a function to parse the response from `suggestion_url` and return a list of strings as suggestions. Receives two arguments: `response`, the first argument, is an object containing a property `text` which holds the text of the response; and `request`, the second argument, is an object containing the properties `query` which is the text of the query and `url` which is the formatted URL for the request.
     * @param {string} [only_this_site_key=o] `<search_leader_key><only_this_site_key><alias>` in normal mode will search selected text within current site with this search engine directly without opening the omnibar, for example `sod`.
     * @param {object} [options=null] `favicon_url` URL for favicon for this search engine, `skipMaps` if `true` disable creating key mappings for this search engine
     *
     * @example
     * addSearchAlias('d', 'duckduckgo', 'https://duckduckgo.com/?q=', 's', 'https://duckduckgo.com/ac/?q=', function(response) {
     *     var res = JSON.parse(response.text);
     *     return res.map(function(r){
     *         return r.phrase;
     *     });
     * });
     */
    function addSearchAlias(alias, prompt, search_url, search_leader_key, suggestion_url, callback_to_parse_suggestion, only_this_site_key, options) {
        _addSearchAlias(alias, prompt, search_url, suggestion_url, callback_to_parse_suggestion, options);
        const skipMaps = options?.skipMaps ?? false
        if (skipMaps) {
          return
        }
        function ssw() {
            searchSelectedWith(search_url);
        }
        mapkey((search_leader_key || 's') + alias, '#6Search selected with ' + prompt, ssw);
        mapkey('o' + alias, '#8Open Search with alias ' + alias, () => {
            front.openOmnibar({type: "SearchEngine", extra: alias});
        });
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

    /**
     * Remove a search engine alias from Omnibar.
     *
     * @param {string} alias the alias of the search engine to be removed.
     * @param {string} [search_leader_key=s] `<search_leader_key><alias>` in normal mode will search selected text with this search engine directly without opening the omnibar, for example `sd`.
     * @param {string} [only_this_site_key=o] `<search_leader_key><only_this_site_key><alias>` in normal mode will search selected text within current site with this search engine directly without opening the omnibar, for example `sod`.
     *
     * @example
     * removeSearchAlias('d');
     */
    function removeSearchAlias(alias, search_leader_key, only_this_site_key) {
        _removeSearchAlias(alias);
        unmap((search_leader_key || 's') + alias);
        unmap('o' + alias);
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


    /**
     * Search selected with.
     *
     * @param {string} se a search engine's search URL
     * @param {boolean} [onlyThisSite=false] whether to search only within current site, need support from the provided search engine.
     * @param {boolean} [interactive=false] whether to search in interactive mode, in case that you need some small modification on the selected content.
     * @param {string} [alias=""] only used with interactive mode, in such case the url from `se` is ignored, SurfingKeys will construct search URL from the alias registered by `addSearchAlias`.
     *
     * @example
     * searchSelectedWith('https://translate.google.com/?hl=en#auto/en/');
     */
    function searchSelectedWith(se, onlyThisSite, interactive, alias) {
        clipboard.read(function(response) {
            var query = window.getSelection().toString() || response.data;
            if (onlyThisSite) {
                query = "site:" + window.location.hostname + " " + query;
            }
            if (interactive) {
                front.openOmnibar({type: "SearchEngine", extra: alias, pref: query});
            } else {
                tabOpenLink(constructSearchURL(se, encodeURIComponent(query)));
            }
        });
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

    mapkey('[[', '#1Click on the previous link on current page', hints.previousPage);
    mapkey(']]', '#1Click on the next link on current page', hints.nextPage);
    mapkey('T', '#3Choose a tab', function() {
        front.chooseTab();
    });
    mapkey('?', '#0Show usage', function() {
        front.showUsage();
    });
    mapkey('Q', '#8Open omnibar for word translation', function() {
        front.openOmniquery({query: getWordUnderCursor(), style: "opacity: 0.8;"});
    });
    imapkey("<Ctrl-'>", '#15Toggle quotes in an input element', toggleQuote);
    function openVim(useNeovim) {
        var element = getRealEdit();
        element.blur();
        insert.exit();
        front.showEditor(element, null, null, useNeovim);
    }
    imapkey('<Ctrl-i>', '#15Open vim editor for current input', function() {
        openVim(false);
    });
    const browserName = getBrowserName();
    if (browserName === "Chrome") {
        imapkey('<Ctrl-Alt-i>', '#15Open neovim for current input', function() {
            openVim(true);
        });
        mapkey(';s', 'Toggle PDF viewer from SurfingKeys', function() {
            var pdfUrl = window.location.href;
            if (pdfUrl.indexOf(chrome.extension.getURL("/pages/pdf_viewer.html")) === 0) {
                pdfUrl = window.location.search.substr(3);
                chrome.storage.local.set({"noPdfViewer": 1}, function() {
                    window.location.replace(pdfUrl);
                });
            } else {
                if (document.querySelector("EMBED") && document.querySelector("EMBED").getAttribute("type") === "application/pdf") {
                    chrome.storage.local.remove("noPdfViewer", function() {
                        window.location.replace(pdfUrl);
                    });
                } else {
                    chrome.storage.local.get("noPdfViewer", function(resp) {
                        if(!resp.noPdfViewer) {
                            chrome.storage.local.set({"noPdfViewer": 1}, function() {
                                showBanner("PDF viewer disabled.");
                            });
                        } else {
                            chrome.storage.local.remove("noPdfViewer", function() {
                                showBanner("PDF viewer enabled.");
                            });
                        }
                    });
                }
            }
        });
    }

    mapkey(";ql", '#0Show last action', function() {
        showPopup(htmlEncode(runtime.conf.lastKeys.map(function(k) {
            return KeyboardUtils.decodeKeystroke(k);
        }).join(' → ')));
    }, {repeatIgnore: true});

    mapkey('gi', '#1Go to the first edit box', function() {
        hints.createInputLayer();
    });
    mapkey('i', '#1Go to edit box', function() {
        hints.create(getCssSelectorsOfEditable(), hints.dispatchMouseClick);
    });
    mapkey('I', '#1Go to edit box with vim editor', function() {
        hints.create(getCssSelectorsOfEditable(), function(element) {
            front.showEditor(element);
        });
    });

    mapkey('zv', '#9Enter visual mode, and select whole element', function() {
        visual.toggle("z");
    });
    mapkey('yv', '#7Yank text of an element', function() {
        hints.create(runtime.conf.textAnchorPat, function (element) {
            clipboard.write(element[1] === 0 ? element[0].data.trim() : element[2].trim());
        });
    });
    mapkey('ymv', '#7Yank text of multiple elements', function() {
        var textToYank = [];
        hints.create(runtime.conf.textAnchorPat, function (element) {
            textToYank.push(element[1] === 0 ? element[0].data.trim() : element[2].trim());
            clipboard.write(textToYank.join('\n'));
        }, { multipleHits: true });
    });

    mapkey('V', '#9Restore visual mode', function() {
        visual.restore();
    });
    mapkey('*', '#9Find selected text in current page', function() {
        visual.star();
        visual.toggle();
    });

    vmapkey('<Ctrl-u>', '#9Backward 20 lines', function() {
        visual.feedkeys('20k');
    });
    vmapkey('<Ctrl-d>', '#9Forward 20 lines', function() {
        visual.feedkeys('20j');
    });

    mapkey('m', '#10Add current URL to vim-like marks', normal.addVIMark);
    mapkey("'", '#10Jump to vim-like mark', normal.jumpVIMark);
    mapkey("<Ctrl-'>", '#10Jump to vim-like mark in new tab.', function(mark) {
        normal.jumpVIMark(mark);
    });

    mapkey('w', '#2Switch frames', function() {
        // ensure frontend ready so that ui related actions can be available in iframes.
        dispatchSKEvent('ensureFrontEnd');
        if (window !== top || !hints.create("iframe", function(element) {
            element.scrollIntoView({
                behavior: 'auto',
                block: 'center',
                inline: 'center'
            });
            normal.highlightElement(element);
            element.contentWindow.focus();
        })) {
            normal.rotateFrame();
        }
    });

    mapkey('yg', '#7Capture current page', function() {
        front.toggleStatus(false);
        setTimeout(function() {
            RUNTIME('captureVisibleTab', null, function(response) {
                front.toggleStatus(true);
                showPopup("<img src='{0}' />".format(response.dataUrl));
            });
        }, 500);
    });

    mapkey('gu', '#4Go up one path in the URL', function() {
        var pathname = location.pathname;
        if (pathname.length > 1) {
            pathname = pathname.endsWith('/') ? pathname.substr(0, pathname.length - 1) : pathname;
            var last = pathname.lastIndexOf('/'), repeats = RUNTIME.repeats;
            RUNTIME.repeats = 1;
            while (repeats-- > 1) {
                var p = pathname.lastIndexOf('/', last - 1);
                if (p === -1) {
                    break;
                } else {
                    last = p;
                }
            }
            pathname = pathname.substr(0, last);
        }
        window.location.href = location.origin + pathname;
    });

    mapkey(';m', '#1mouse out last element', function() {
        hints.mouseoutLastElement();
    });

    mapkey(';pp', '#7Paste html on current page', function() {
        clipboard.read(function(response) {
            document.documentElement.removeAttributes();
            document.body.removeAttributes();
            setSanitizedContent(document.head, "<title>" + new Date() +" updated by Surfingkeys</title>");
            setSanitizedContent(document.body, response.data);
        });
    });

    function openGoogleTranslate() {
        if (window.getSelection().toString()) {
            searchSelectedWith('https://translate.google.com/?hl=en#auto/en/', false, false, '');
        } else {
            tabOpenLink("https://translate.google.com/translate?js=n&sl=auto&tl=zh-CN&u=" + window.location.href);
        }
    }
    mapkey(';t', 'Translate selected text with google', openGoogleTranslate);
    vmapkey('t', '#9Translate selected text with google', openGoogleTranslate);

    mapkey('O', '#1Open detected links from text', function() {
        hints.create(runtime.conf.clickablePat, function(element) {
            window.location.assign(element[2]);
        }, {statusLine: "Open detected links from text"});
    });

    mapkey(".", '#0Repeat last action', function() {
        // lastKeys in format: <keys in normal mode>[,(<mode name>\t<keys in this mode>)*], examples
        // ['se']
        // ['f', 'Hints\tBA']
        const lastKeys = runtime.conf.lastKeys;
        normal.feedkeys(lastKeys[0]);
        var modeKeys = lastKeys.slice(1);
        for (var i = 0; i < modeKeys.length; i++) {
            var modeKey = modeKeys[i].split('\t');
            if (modeKey[0] === 'Hints') {
                function closureWrapper() {
                    var hintKeys = modeKey[1];
                    return function() {
                        hints.feedkeys(hintKeys);
                    };
                }
                setTimeout(closureWrapper(), 120 + i*100);
            }
        }
    }, {repeatIgnore: true});

    mapkey("f", '#1Open a link, press SHIFT to flip overlapped hints, hold SPACE to hide hints', function() {
        hints.create("", hints.dispatchMouseClick);
    }, {repeatIgnore: true});

    mapkey("v", '#9Toggle visual mode', function() {
        visual.toggle();
    }, {repeatIgnore: true});

    mapkey("n", '#9Next found text', function() {
        visual.next(false);
    }, {repeatIgnore: true});

    mapkey("N", '#9Previous found text', function() {
        visual.next(true);
    }, {repeatIgnore: true});

    mapkey(";fs", '#1Display hints to focus scrollable elements', function() {
        hints.create(normal.refreshScrollableElements(), hints.dispatchMouseClick);
    });

    vmapkey("q", '#9Translate word under cursor', function() {
        var w = getWordUnderCursor();
        browser.readText(w);
        var b = visual.getCursorPixelPos();
        front.performInlineQuery(w, {
            top: b.top,
            left: b.left,
            height: b.height,
            width: b.width
        }, function(pos, queryResult) {
            dispatchSKEvent('showBubble', [pos, queryResult, true]);
        });
    });

    function getSentence(textNode, offset) {
        var sentence = "";

        actionWithSelectionPreserved(function(sel) {
            sel.setPosition(textNode, offset);
            sel.modify("extend", "backward", "sentence");
            sel.collapseToStart();
            sel.modify("extend", "forward", "sentence");

            sentence = sel.toString();
        });

        return sentence.replace(/\n/g, '');
    }

    mapkey("cq", '#7Query word with Hints', function() {
        hints.create(runtime.conf.textAnchorPat, function (element) {
            var word = element[2].trim().replace(/[^A-z].*$/, "");
            var b = getTextNodePos(element[0], element[1], element[2].length);
            if (document.dictEnabled !== undefined) {
                if (document.dictEnabled) {
                    window.postMessage({dictorium_data: {
                        type: "OpenDictoriumQuery",
                        word: word,
                        sentence: getSentence(element[0], element[1]),
                        pos: b,
                        source: window.location.href
                    }});
                }
            } else {
                front.performInlineQuery(word, {
                    top: b.top,
                    left: b.left,
                    height: b.height,
                    width: b.width
                }, function (pos, queryResult) {
                    dispatchSKEvent('showBubble', [pos, queryResult, false]);
                });
            }
        });
    });

    return {
        RUNTIME,
        aceVimMap,
        addVimMapKey,
        addSearchAlias,
        cmap,
        imap,
        imapkey,
        insertJS,
        isElementPartiallyInViewport,
        getBrowserName,
        getClickableElements,
        getFormData,
        lmap,
        map,
        unmap,
        unmapAllExcept,
        iunmap,
        vunmap,
        mapkey,
        readText: browser.readText,
        removeSearchAlias,
        searchSelectedWith,
        tabOpenLink,
        vmap,
        vmapkey,
        Clipboard: clipboard,
        Normal: {
            feedkeys: normal.feedkeys,
            jumpVIMark: normal.jumpVIMark,
            passThrough: normal.passThrough,
            scroll: normal.scroll,
        },
        Hints: {
            click: hints.click,
            create: hints.create,
            dispatchMouseClick: hints.dispatchMouseClick,
            style: hints.style,
            setNumeric: hints.setNumeric,
            setCharacters: hints.setCharacters,
        },
        Visual: {
            style: visual.style,
        },
        Front: {
            openOmnibar: front.openOmnibar,
            registerInlineQuery: front.registerInlineQuery,
            showEditor: front.showEditor,
            getUsage: front.getUsage,
            showBanner,
            showPopup,
        },
    };
}

export default createAPI;
