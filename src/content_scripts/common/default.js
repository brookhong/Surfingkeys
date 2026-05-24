import { RUNTIME, dispatchSKEvent, runtime } from './runtime.js';
import KeyboardUtils from './keyboardUtils';
import {
    actionWithSelectionPreserved,
    getBrowserName,
    getCssSelectorsOfEditable,
    getLargeElements,
    getRealEdit,
    getTextNodePos,
    getWordUnderCursor,
    htmlEncode,
    setSanitizedContent,
    showBanner,
    showPopup,
    tabOpenLink,
    toggleQuote,
} from './utils.js';

export default function(api, clipboard, insert, normal, hints, visual, front, browser) {
    const {
        cmap,
        map,
        mapkey,
        imapkey,
        readText,
        vmapkey,
    } = api;

    mapkey('[[', '#1Click on the previous link on current page', hints.previousPage);
    mapkey(']]', '#1Click on the next link on current page', hints.nextPage);
    mapkey('T', '#3Choose a tab', function() {
        front.chooseTab();
    });
    mapkey(';G', '#3Group this tab', function() {
        front.groupTab();
    });
    mapkey('?', '#0Show usage', function() {
        front.showUsage();
    });

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

    mapkey('w', '#2Switch frames', function() {
        // ensure frontend ready so that ui related actions can be available in iframes.
        dispatchSKEvent('ensureFrontEnd');
        if (window === top) {
            hints.create("iframe", function(element) {
                element.scrollIntoView({
                    behavior: 'auto',
                    block: 'center',
                    inline: 'center'
                });
                normal.highlightElement(element);
                element.contentWindow.focus();
            }).then((hintsTotal) => {
                if (hintsTotal === 0) {
                    normal.rotateFrame();
                }
            });
        } else {
            normal.rotateFrame();
        }
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

    map('g0', ':feedkeys 99E', 0, "#3Go to the first tab");
    map('g$', ':feedkeys 99R', 0, "#3Go to the last tab");
    mapkey('zr', '#3zoom reset', function() {
        RUNTIME('setZoom', {
            zoomFactor: 0
        });
    });
    mapkey('zi', '#3zoom in', function() {
        RUNTIME('setZoom', {
            zoomFactor: 0.1
        });
    });
    mapkey('zo', '#3zoom out', function() {
        RUNTIME('setZoom', {
            zoomFactor: -0.1
        });
    });

    map('u', 'e');
    mapkey('af', '#1Open a link in active new tab', function() {
        hints.create("", hints.dispatchMouseClick, {tabbed: true, active: true});
    });
    mapkey('gf', '#1Open a link in non-active new tab', function() {
        hints.create("", hints.dispatchMouseClick, {tabbed: true, active: false});
    });
    mapkey('cf', '#1Open multiple links in a new tab', function() {
        hints.create("", hints.dispatchMouseClick, {multipleHits: true});
    });
    map('C', 'gf');
    mapkey('<Ctrl-h>', '#1Mouse over elements.', function() {
        hints.create("", (element, event) => {
            if (chrome.surfingkeys) {
                const r = element.getClientRects()[0];
                chrome.surfingkeys.sendMouseEvent(2, Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2), 0);
            } else {
                hints.dispatchMouseClick(element, event);
            }
        }, {mouseEvents: ["mouseover"]});
    });
    mapkey('<Ctrl-j>', '#1Mouse out elements.', function() {
        hints.create("", hints.dispatchMouseClick, {mouseEvents: ["mouseout"]});
    });
    mapkey('ya', '#7Copy a link URL to the clipboard', function() {
        hints.create('*[href]', function(element) {
            clipboard.write(element.href);
        });
    });
    mapkey('yma', '#7Copy multiple link URLs to the clipboard', function() {
        var linksToYank = [];
        hints.create('*[href]', function(element) {
            linksToYank.push(element.href);
            clipboard.write(linksToYank.join('\n'));
        }, {multipleHits: true});
    });

    mapkey('q', '#1Click on an Image or a button', function() {
        hints.create("img, button", hints.dispatchMouseClick);
    });
    mapkey('<Alt-p>', '#3pin/unpin current tab', function() {
        RUNTIME("togglePinTab");
    });
    mapkey('<Alt-m>', '#3mute/unmute current tab', function() {
        RUNTIME("muteTab");
    });
    mapkey('B', '#4Go one tab history back', function() {
        RUNTIME("historyTab", {backward: true});
    }, {repeatIgnore: true});
    mapkey('F', '#4Go one tab history forward', function() {
        RUNTIME("historyTab", {backward: false});
    }, {repeatIgnore: true});
    mapkey('<Ctrl-6>', '#4Go to last used tab', function() {
        RUNTIME("goToLastTab");
    });
    mapkey('gT', '#4Go to first activated tab', function() {
        RUNTIME("historyTab", {index: 0});
    }, {repeatIgnore: true});
    mapkey('gt', '#4Go to last activated tab', function() {
        RUNTIME("historyTab", {index: -1});
    }, {repeatIgnore: true});
    mapkey('gp', '#4Go to the playing tab', function() {
        RUNTIME('getTabs', { queryInfo: {audible: true}}, response => {
            if (response.tabs?.at(0)) {
                const tab = response.tabs[0]
                RUNTIME('focusTab', {
                    windowId: tab.windowId,
                    tabId: tab.id
                });
            }
        })
    }, { repeatIgnore: true });
    mapkey('s', '#4Go back in history', function() {
        history.go(-1);
    }, {repeatIgnore: true});
    mapkey('D', '#4Go forward in history', function() {
        history.go(1);
    }, {repeatIgnore: true});
    mapkey('r', '#4Reload the page', function() {
        RUNTIME("reloadTab", { nocache: false });
    });
    mapkey('oi', '#8Open incognito window', function() {
        RUNTIME('openIncognito', {
            url: window.location.href
        });
    });

    mapkey('H', '#8Open opened URL in current tab', function() {
        front.openOmnibar({type: "TabURLs"});
    });
    mapkey(':', '#8Open commands', function() {
        front.openOmnibar({type: "Commands"});
    });
    mapkey('yi', '#7Yank text of an input', function() {
        hints.create("input, textarea, select", function(element) {
            clipboard.write(element.value);
        });
    });
    mapkey('x', '#3Close current tab', function() {
        RUNTIME("closeTab");
    });
    mapkey(';w', '#2Focus top window', function() {
        top.focus();
    });
    mapkey('yj', "#7Copy current settings", function() {
        RUNTIME('getSettings', {
            key: "RAW"
        }, function(response) {
            clipboard.write(JSON.stringify(response.settings, null, 4));
        });
    });
    mapkey(';pj', "#7Restore settings data from clipboard", function() {
        clipboard.read(function(response) {
            RUNTIME('updateSettings', {
                settings: JSON.parse(response.data.trim())
            });
        });
    });
    mapkey('yt', '#3Duplicate current tab', function() {
        RUNTIME("duplicateTab");
    });
    mapkey('yT', '#3Duplicate current tab in background', function() {
        RUNTIME("duplicateTab", {active: false});
    });
    mapkey('yy', "#7Copy current page's URL", function() {
        if (RUNTIME.repeats > 1) {
            const num = RUNTIME.repeats;
            RUNTIME('getTabs', null, function (response) {
                const start = response.tabs.findIndex((t) => t.active);
                const range = response.tabs.slice(start, start + num);
                clipboard.write(range.map(tab => tab.url).join('\n'));
            });
            RUNTIME.repeats = 1;
        } else {
            var url = window.location.href;
            clipboard.write(url);
        }
    });

    mapkey('gxt', '#3Close tab on left', function() {
        RUNTIME("closeTabLeft");
    });
    mapkey('gxT', '#3Close tab on right', function() {
        RUNTIME("closeTabRight");
    });
    mapkey('gx0', '#3Close all tabs on left', function() {
        RUNTIME("closeTabsToLeft");
    });
    mapkey('gx$', '#3Close all tabs on right', function() {
        RUNTIME("closeTabsToRight");
    });
    mapkey('gxx', '#3Close all tabs except current one', function() {
        RUNTIME("tabOnly");
    });
    mapkey('gxp', '#3Close playing tab', function() {
        RUNTIME("closeAudibleTab");
    });

    const bn = getBrowserName();
    if (bn === "Firefox") {
        mapkey('on', '#3Open newtab', function() {
            tabOpenLink("about:blank");
        });
    } else if (bn === "Chrome") {
        mapkey('on', '#3Open newtab', function() {
            tabOpenLink("chrome://newtab/");
        });
    }

    mapkey('X', '#3Restore closed tab', function() {
        RUNTIME("openLast");
    });

    if (!getBrowserName().startsWith("Safari")) {
        mapkey('W', '#3Move current tab to another window',  function() {
            front.openOmnibar(({type: "Windows"}));
        });
        mapkey('<<', '#3Move current tab to left', function() {
            RUNTIME('moveTab', {
                step: -1
            });
        });
        mapkey('>>', '#3Move current tab to right', function() {
            RUNTIME('moveTab', {
                step: 1
            });
        });
    }
}
