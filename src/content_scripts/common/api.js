import { RUNTIME, dispatchSKEvent } from './runtime.js';
import Trie from './trie';
import Mode from './mode';
import KeyboardUtils from './keyboardUtils';
import {
    LOG,
} from '../../common/utils.js';
import {
    getBrowserName,
    getClickableElements,
    initSKFunctionListener,
    isElementPartiallyInViewport,
    isInUIFrame,
    mapInMode,
    parseAnnotation,
    showBanner,
    showPopup,
    tabOpenLink,
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
                if (!mapInMode(normal, new_keystroke, old_keystroke, new_annotation) && old_keystroke in Mode.specialKeys) {
                    Mode.specialKeys[old_keystroke].push(new_keystroke);
                    dispatchSKEvent("front", ['addMapkey', "Mode", new_keystroke, old_keystroke]);
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
            mapInMode(insert, new_keystroke, old_keystroke, new_annotation);
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
            dispatchSKEvent("front", ['addMapkey', "Omnibar", new_keystroke, old_keystroke]);
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
            mapInMode(visual, new_keystroke, old_keystroke, new_annotation);
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





    initSKFunctionListener("api", {
        imap,
        map,
        lmap,
        vmap,
        unmap,
        unmapAllExcept,
        iunmap,
        vunmap,
        "clipboard:write": clipboard.write,
        "clipboard:read": () => {
            clipboard.read((resp) => {
                dispatchSKEvent('user', ["onClipboardRead", resp]);
            });
        },
        "hints:click": hints.click,
        "hints:create": hints.create,
        "hints:setCharacters": hints.setCharacters,
        "hints:setNumeric": hints.setNumeric,
        "hints:style": hints.style,
        "front:registerInlineQuery": front.registerInlineQuery,
        "front:openOmnibar": front.openOmnibar,
        "normal:feedkeys": normal.feedkeys,
        "normal:passThrough": normal.passThrough,
        "normal:scroll": normal.scroll,
        "visual:style": visual.style,
        mapkey: (keys, annotation, options) => {
            if (options.codeHasParameter) {
                mapkey(keys, annotation, (key) => {
                    dispatchSKEvent('user', ["callUserFunction", `normal:${keys}`, key]);
                }, options);
            } else {
                mapkey(keys, annotation, () => {
                    dispatchSKEvent('user', ["callUserFunction", `normal:${keys}`]);
                }, options);
            }
        },
        imapkey: (keys, annotation, options) => {
            imapkey(keys, annotation, () => {
                dispatchSKEvent('user', ["callUserFunction", `insert:${keys}`]);
            }, options);
        },
        vmapkey: (keys, annotation, options) => {
            vmapkey(keys, annotation, () => {
                dispatchSKEvent('user', ["callUserFunction", `visual:${keys}`]);
            }, options);
        },
        readText: browser.readText,
    });
    return {
        RUNTIME,
        cmap,
        imap,
        imapkey,
        isElementPartiallyInViewport,
        getBrowserName,
        getClickableElements,
        lmap,
        map,
        unmap,
        unmapAllExcept,
        iunmap,
        vunmap,
        mapkey,
        readText: browser.readText,
        tabOpenLink,
        vmap,
        vmapkey,
        Clipboard: clipboard,
        Normal: {
            feedkeys: normal.feedkeys,
            passThrough: normal.passThrough,
            scroll: normal.scroll,
        },
        Hints: {
            click: hints.click,
            create: hints.create,
            dispatchMouseClick: hints.dispatchMouseClick,
            style: hints.style,
            setNumeric: hints.setNumeric,
            setCharacters: function(chars) {
                hints.setCharacters(chars);
                if (front.setHintsCharacters) {
                    front.setHintsCharacters(chars);
                }
            },
        },
        Visual: {
            style: visual.style,
        },
        Front: {
            openOmnibar: front.openOmnibar,
            registerInlineQuery: front.registerInlineQuery,
            showBanner,
            showPopup,
        },
    };
}

export default createAPI;
