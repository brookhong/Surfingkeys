// ************************* WARNING *************************
//
// The file contains the default mappings, and it is released un-minified
// for your referrence on creating your own mappings.
//
// But please don't just copy statement from this file to your own settings.
// As the bound functions in this file may rely on some unstable functions/
// variables, which may be changed some day. If you insist on that, please
// compare your settings with this file to find what stops your keystrokes
// from working.
//
// Therefore, the best practice to remap is using map instead of mapkey, for
// example:
//
//      map('F', 'af');
//
// is better than
//
//      mapkey('F', '#1Open a link in new tab', 'Hints.create("", Hints.dispatchMouseClick, {tabbed: true})');
//
// ************************* WARNING *************************

function createDefaultMappings() {

imapkey("<Ctrl-'>", '#15Toggle quotes in an input element', toggleQuote);
imapkey('<Ctrl-i>', '#15Open vim editor for current input', function() {
    var element = getRealEdit();
    element.blur();
    Insert.exit();
    Front.showEditor(element);
});
function toggleProxySite(host) {
    RUNTIME('updateProxy', {
        host: host,
        operation: "toggle"
    });
    return true;
}
mapkey('cp', '#13Toggle proxy for current site', function() {
    var host = window.location.host.replace(/:\d+/,'');
    if (host && host.length) {
        toggleProxySite(host);
    }
});
mapkey(';cp', '#13Copy proxy info', function() {
    RUNTIME('getSettings', {
        key: ['proxyMode', 'proxy', 'autoproxy_hosts']
    }, function(response) {
        Clipboard.write(JSON.stringify(response.settings, null, 4));
    });
});
mapkey(';ap', '#13Apply proxy info from clipboard', function() {
    Clipboard.read(function(response) {
        var proxyConf = JSON.parse(response.data);
        RUNTIME('updateProxy', {
            operation: 'set',
            host: proxyConf.autoproxy_hosts,
            proxy: proxyConf.proxy,
            mode: proxyConf.proxyMode
        });
    });
});
// create shortcuts for the command with different parameters
map(';pa', ':setProxyMode always', 0, '#13set proxy mode `always`');
map(';pb', ':setProxyMode byhost', 0, '#13set proxy mode `byhost`');
map(';pd', ':setProxyMode direct', 0, '#13set proxy mode `direct`');
map(';ps', ':setProxyMode system', 0, '#13set proxy mode `system`');
map(';pc', ':setProxyMode clear', 0, '#13set proxy mode `clear`');
mapkey('gr', '#14Read selected text or text from clipboard', function() {
    Clipboard.read(function(response) {
        readText(window.getSelection().toString() || response.data, {verbose: true});
    });
});
vmapkey('gr', '#9Read selected text', function() {
    readText(window.getSelection().toString(), {verbose: true});
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

map('ZQ', ':quit');
mapkey(".", '#0Repeat last action', Normal.repeatLast, {repeatIgnore: true});
mapkey(";ql", '#0Show last action', function() {
    Front.showPopup(htmlEncode(runtime.conf.lastKeys.map(function(k) {
        return KeyboardUtils.decodeKeystroke(k);
    }).join(' → ')));
}, {repeatIgnore: true});
mapkey('ZZ', '#5Save session and quit', function() {
    RUNTIME('createSession', {
        name: 'LAST',
        quitAfterSaved: true
    });
});
mapkey('ZR', '#5Restore last session', function() {
    RUNTIME('openSession', {
        name: 'LAST'
    });
});
mapkey('T', '#3Choose a tab', function() {
    Front.chooseTab();
});
mapkey('?', '#0Show usage', function() {
    Front.showUsage();
});
map('u', 'e');
mapkey('af', '#1Open a link in active new tab', function() {
    Hints.create("", Hints.dispatchMouseClick, {tabbed: true, active: true});
});
mapkey('gf', '#1Open a link in non-active new tab', function() {
    Hints.create("", Hints.dispatchMouseClick, {tabbed: true, active: false});
});
mapkey('cf', '#1Open multiple links in a new tab', function() {
    Hints.create("", Hints.dispatchMouseClick, {multipleHits: true});
});
map('C', 'gf');
mapkey('<Ctrl-h>', '#1Mouse over elements.', function() {
    Hints.create("", Hints.dispatchMouseClick, {mouseEvents: ["mouseover"]});
});
mapkey('<Ctrl-j>', '#1Mouse out elements.', function() {
    Hints.create("", Hints.dispatchMouseClick, {mouseEvents: ["mouseout"]});
});
mapkey('ya', '#7Copy a link URL to the clipboard', function() {
    Hints.create('*[href]', function(element) {
        Clipboard.write(element.href);
    });
});
mapkey('yma', '#7Copy multiple link URLs to the clipboard', function() {
    var linksToYank = [];
    Hints.create('*[href]', function(element) {
        linksToYank.push(element.href);
        Clipboard.write(linksToYank.join('\n'));
    }, {multipleHits: true});
});
function getTableColumnHeads() {
    var tds = [];
    document.querySelectorAll("table").forEach(function(t) {
        var tr = t.querySelector("tr");
        if (tr) {
            tds.push(...tr.children);
        }
    });
    return tds;
}
mapkey('yc', '#7Copy a column of a table', function() {
    Hints.create(getTableColumnHeads(), function(element) {
        var column = Array.from(element.closest("table").querySelectorAll("tr")).map(function(tr) {
            return tr.children.length > element.cellIndex ? tr.children[element.cellIndex].innerText : "";
        });
        Clipboard.write(column.join("\n"));
    });
});
mapkey('ymc', '#7Copy multiple columns of a table', function() {
    var rows = null;
    Hints.create(getTableColumnHeads(), function(element) {
        var column = Array.from(element.closest("table").querySelectorAll("tr")).map(function(tr) {
            return tr.children.length > element.cellIndex ? tr.children[element.cellIndex].innerText : "";
        });
        if (!rows) {
            rows = column;
        } else {
            column.forEach(function(c, i) {
                rows[i] += "\t" + c;
            });
        }
        Clipboard.write(rows.join("\n"));
    }, {multipleHits: true});
});
mapkey('yq', '#7Copy pre text', function() {
    Hints.create("pre", function(element) {
        Clipboard.write(element.innerText);
    });
});
mapkey('i', '#1Go to edit box', function() {
    Hints.create("input, textarea, *[contenteditable=true], *[role=textbox], select, div.ace_cursor", Hints.dispatchMouseClick);
});
mapkey('gi', '#1Go to the first edit box', function() {
    Hints.createInputLayer();
});
mapkey('I', '#1Go to edit box with vim editor', function() {
    Hints.create("input, textarea, *[contenteditable=true], select", function(element) {
        Front.showEditor(element);
    });
});
mapkey('O', '#1Open detected links from text', function() {
    Hints.create(runtime.conf.clickablePat, function(element) {
        window.location.assign(element[2]);
    }, {statusLine: "Open detected links from text"});
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
                        Front.showBanner("PDF viewer disabled.");
                    });
                } else {
                    chrome.storage.local.remove("noPdfViewer", function() {
                        Front.showBanner("PDF viewer enabled.");
                    });
                }
            });
        }
    }
});
map('<Ctrl-i>', 'I');
cmap('<ArrowDown>', '<Tab>');
cmap('<ArrowUp>', '<Shift-Tab>');
cmap('<Ctrl-n>', '<Tab>');
cmap('<Ctrl-p>', '<Shift-Tab>');
mapkey('q', '#1Click on an Image or a button', function() {
    Hints.create("img, button", Hints.dispatchMouseClick);
});
mapkey('<Alt-i>', '#0enter PassThrough mode to temporarily suppress SurfingKeys', function() {
    Normal.passThrough();
});
mapkey('p', '#0enter ephemeral PassThrough mode to temporarily suppress SurfingKeys', function() {
    Normal.passThrough(1000);
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
mapkey('S', '#4Go back in history', function() {
    history.go(-1);
}, {repeatIgnore: true});
mapkey('D', '#4Go forward in history', function() {
    history.go(1);
}, {repeatIgnore: true});
mapkey('r', '#4Reload the page', function() {
    RUNTIME("reloadTab", { nocache: false });
});
mapkey('t', '#8Open a URL', function() {
    Front.openOmnibar({type: "URLs", extra: "getAllSites"});
});
mapkey('go', '#8Open a URL in current tab', function() {
    Front.openOmnibar({type: "URLs", extra: "getAllSites", tabbed: false});
});
mapkey('oi', '#8Open incognito window', function() {
    RUNTIME('openIncognito', {
        url: window.location.href
    });
});
mapkey('ox', '#8Open recently closed URL', function() {
    Front.openOmnibar({type: "URLs", extra: "getRecentlyClosed"});
});
mapkey('H', '#8Open opened URL in current tab', function() {
    Front.openOmnibar({type: "URLs", extra: "getTabURLs"});
});
mapkey('Q', '#8Open omnibar for word translation', function() {
    Front.openOmniquery({query: Visual.getWordUnderCursor(), style: "opacity: 0.8;"});
});
mapkey('b', '#8Open a bookmark', function() {
    Front.openOmnibar(({type: "Bookmarks"}));
});
mapkey('ab', '#8Bookmark current page to selected folder', function() {
    var page = {
        url: window.location.href,
        title: document.title
    };
    Front.openOmnibar(({type: "AddBookmark", extra: page}));
});
mapkey('oh', '#8Open URL from history', function() {
    Front.openOmnibar({type: "History"});
});
mapkey('om', '#8Open URL from vim-like marks', function() {
    Front.openOmnibar({type: "VIMarks"});
});
mapkey(':', '#8Open commands', function() {
    Front.openOmnibar({type: "Commands"});
});
mapkey('zv', '#9Enter visual mode, and select whole element', function() {
    Visual.toggle("z");
});
mapkey('yv', '#7Yank text of an element', function() {
    Visual.toggle("y");
});
mapkey('ymv', '#7Yank text of multiple elements', function() {
    Visual.toggle("ym");
});
mapkey('yi', '#7Yank text of an input', function() {
    Hints.create("input, textarea, select", function(element) {
        Clipboard.write(element.value);
    });
});
mapkey('V', '#9Restore visual mode', function() {
    Visual.restore();
});
mapkey('*', '#9Find selected text in current page', function() {
    Visual.star();
    Visual.toggle();
});
vmapkey('<Ctrl-u>', '#9Backward 20 lines', function() {
    Visual.feedkeys('20k');
});
vmapkey('<Ctrl-d>', '#9Forward 20 lines', function() {
    Visual.feedkeys('20j');
});
mapkey('x', '#3Close current tab', function() {
    RUNTIME("closeTab");
});
mapkey('X', '#3Restore closed tab', function() {
    RUNTIME("openLast");
});
mapkey('W', '#3New window with current tab',  function() {
    RUNTIME("newWindow");
});
mapkey('m', '#10Add current URL to vim-like marks', Normal.addVIMark);
mapkey("'", '#10Jump to vim-like mark', Normal.jumpVIMark);
mapkey("<Ctrl-'>", '#10Jump to vim-like mark in new tab.', function(mark) {
    Normal.jumpVIMark(mark);
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
mapkey('w', '#2Switch frames', function() {
    Normal.rotateFrame();
});
mapkey(';w', '#2Focus top window', function() {
    top.focus();
});
mapkey('cc', '#7Open selected link or link from clipboard', function() {
    if (window.getSelection().toString()) {
        tabOpenLink(window.getSelection().toString());
    } else {
        Clipboard.read(function(response) {
            tabOpenLink(response.data);
        });
    }
});
mapkey('[[', '#1Click on the previous link on current page', previousPage);
mapkey(']]', '#1Click on the next link on current page', nextPage);
mapkey('ys', "#7Copy current page's source", function() {
    var aa = document.documentElement.cloneNode(true);
    Clipboard.write(aa.outerHTML);
});
mapkey('yj', "#7Copy current settings", function() {
    RUNTIME('getSettings', {
        key: "RAW"
    }, function(response) {
        Clipboard.write(JSON.stringify(response.settings, null, 4));
    });
});
mapkey(';pj', "#7Restore settings data from clipboard", function() {
    Clipboard.read(function(response) {
        RUNTIME('updateSettings', {
            settings: JSON.parse(response.data.trim())
        });
    });
});
mapkey('yd', "#7Copy current downloading URL", function() {
    RUNTIME('getDownloads', {
        query: {state: "in_progress"}
    }, function(response) {
        var items = response.downloads.map(function(o) {
            return o.url;
        });
        Clipboard.write(items.join(','));
    });
});
mapkey('yt', '#3Duplicate current tab', function() {
    RUNTIME("duplicateTab");
});
mapkey('yT', '#3Duplicate current tab in background', function() {
    RUNTIME("duplicateTab", {active: false});
});
mapkey('yy', "#7Copy current page's URL", function() {
    Clipboard.write(window.location.href);
});
mapkey('yh', "#7Copy current page's host", function() {
    var url = new URL(window.location.href);
    Clipboard.write(url.host);
});
mapkey('yl', "#7Copy current page's title", function() {
    Clipboard.write(document.title);
});
mapkey('yQ', '#7Copy all query history of OmniQuery.', function() {
    RUNTIME('getSettings', {
        key: 'OmniQueryHistory'
    }, function(response) {
        Clipboard.write(response.settings.OmniQueryHistory.join("\n"));
    });
});
function generateFormKey(form) {
    return (form.method || "get") + "::" + new URL(form.action).pathname;
}
mapkey('yf', '#7Copy form data in JSON on current page', function() {
    var fd = {};
    document.querySelectorAll('form').forEach(function(form) {
        fd[generateFormKey(form)] = getFormData(form, "json");
    });
    Clipboard.write(JSON.stringify(fd, null, 4));
});
mapkey(';pf', '#7Fill form with data from yf', function() {
    Hints.create('form', function(element, event) {
        var formKey = generateFormKey(element);
        Clipboard.read(function(response) {
            var forms = JSON.parse(response.data.trim());
            if (forms.hasOwnProperty(formKey)) {
                var fd = forms[formKey];
                element.querySelectorAll('input, textarea').forEach(function(ip) {
                    if (fd.hasOwnProperty(ip.name) && ip.type !== "hidden") {
                        if (ip.type === "radio") {
                            var op = element.querySelector(`input[name='${ip.name}'][value='${fd[ip.name]}']`);
                            if (op) {
                                op.checked = true;
                            }
                        } else if (Array.isArray(fd[ip.name])) {
                            element.querySelectorAll(`input[name='${ip.name}']`).forEach(function(ip) {
                                ip.checked = false;
                            });
                            var vals = fd[ip.name];
                            vals.forEach(function(v) {
                                var op = element.querySelector(`input[name='${ip.name}'][value='${v}']`);
                                if (op) {
                                    op.checked = true;
                                }
                            });
                        } else if (typeof(fd[ip.name]) === "string") {
                            ip.value = fd[ip.name];
                        }
                    }
                });
            } else {
                Front.showBanner("No form data found for your selection from clipboard.");
            }
        });
    });
});
mapkey('yg', '#7Capture current page', function() {
    Front.toggleStatus(false);
    setTimeout(function() {
        RUNTIME('captureVisibleTab', null, function(response) {
            Front.toggleStatus(true);
            Front.showPopup("<img src='{0}' />".format(response.dataUrl));
        });
    }, 500);
});
mapkey('yp', '#7Copy form data for POST on current page', function() {
    var aa = [];
    document.querySelectorAll('form').forEach(function(form) {
        var fd = {};
        fd[(form.method || "get") + "::" + form.action] = getFormData(form);
        aa.push(fd);
    });
    Clipboard.write(JSON.stringify(aa, null, 4));
});
mapkey('ob', '#8Open Search with alias b', function() {
    Front.openOmnibar({type: "SearchEngine", extra: "b"});
});
mapkey('og', '#8Open Search with alias g', function() {
    Front.openOmnibar({type: "SearchEngine", extra: "g"});
});
mapkey('od', '#8Open Search with alias d', function() {
    Front.openOmnibar({type: "SearchEngine", extra: "d"});
});
mapkey('ow', '#8Open Search with alias w', function() {
    Front.openOmnibar({type: "SearchEngine", extra: "w"});
});
mapkey('oy', '#8Open Search with alias y', function() {
    Front.openOmnibar({type: "SearchEngine", extra: "y"});
});
if (window.navigator.userAgent.indexOf("Firefox") > 0) {
    mapkey('on', '#3Open newtab', function() {
        tabOpenLink("about:blank");
    });
} else {
    mapkey('on', '#3Open newtab', function() {
        tabOpenLink("chrome://newtab/");
    });
    mapkey('ga', '#12Open Chrome About', function() {
        tabOpenLink("chrome://help/");
    });
    mapkey('gb', '#12Open Chrome Bookmarks', function() {
        tabOpenLink("chrome://bookmarks/");
    });
    mapkey('gc', '#12Open Chrome Cache', function() {
        tabOpenLink("chrome://cache/");
    });
    mapkey('gd', '#12Open Chrome Downloads', function() {
        tabOpenLink("chrome://downloads/");
    });
    mapkey('gh', '#12Open Chrome History', function() {
        tabOpenLink("chrome://history/");
    });
    mapkey('gk', '#12Open Chrome Cookies', function() {
        tabOpenLink("chrome://settings/content/cookies");
    });
    mapkey('ge', '#12Open Chrome Extensions', function() {
        tabOpenLink("chrome://extensions/");
    });
    mapkey('gn', '#12Open Chrome net-internals', function() {
        tabOpenLink("chrome://net-internals/#proxy");
    });
    mapkey(';i', '#12Open Chrome Inspect', function() {
        tabOpenLink("chrome://inspect/#devices");
    });
    mapkey('<Ctrl-Alt-d>', '#11Mermaid diagram generator', function() {
        tabOpenLink("/pages/mermaid.html");
    });
}
mapkey('gs', '#12View page source', function() {
    RUNTIME("viewSource", { tab: { tabbed: true }});
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
mapkey('g?', '#4Reload current page without query string(all parts after question mark)', function() {
    window.location.href = window.location.href.replace(/\?[^\?]*$/, '');
});
mapkey('g#', '#4Reload current page without hash fragment', function() {
    window.location.href = window.location.href.replace(/\#[^\#]*$/, '');
});
mapkey('gU', '#4Go to root of current URL hierarchy', function() {
    window.location.href = window.location.origin;
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
mapkey(';e', '#11Edit Settings', function() {
    tabOpenLink("/pages/options.html");
});
mapkey(';pm', '#11Preview markdown', function() {
    tabOpenLink("/pages/markdown.html");
});
mapkey(';u', '#4Edit current URL with vim editor, and open in new tab', function() {
    Front.showEditor(window.location.href, function(data) {
        tabOpenLink(data);
    }, 'url');
});
mapkey(';U', '#4Edit current URL with vim editor, and reload', function() {
    Front.showEditor(window.location.href, function(data) {
        window.location.href = data;
    }, 'url');
});
mapkey(';m', '#1mouse out last element', function() {
    Hints.mouseoutLastElement();
});
mapkey(';j', '#12Close Downloads Shelf', function() {
    RUNTIME("closeDownloadsShelf", {clearHistory: true});
});
mapkey(';pp', '#7Paste html on current page', function() {
    Clipboard.read(function(response) {
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
mapkey(';dh', '#14Delete history older than 30 days', function() {
    RUNTIME('deleteHistoryOlderThan', {
        days: 30
    });
});
mapkey(';db', '#14Remove bookmark for current page', function() {
    RUNTIME('removeBookmark');
});

addSearchAliasX('g', 'google', 'https://www.google.com/search?q=', 's', 'https://www.google.com/complete/search?client=chrome-omni&gs_ri=chrome-ext&oit=1&cp=1&pgcl=7&q=', function(response) {
    var res = JSON.parse(response.text);
    return res[1];
});
addSearchAliasX('d', 'duckduckgo', 'https://duckduckgo.com/?q=', 's', 'https://duckduckgo.com/ac/?q=', function(response) {
    var res = JSON.parse(response.text);
    return res.map(function(r){
        return r.phrase;
    });
});
addSearchAliasX('b', 'baidu', 'https://www.baidu.com/s?wd=', 's', 'http://suggestion.baidu.com/su?cb=&wd=', function(response) {
    var res = response.text.match(/,s:\[("[^\]]+")]}/);
    return res ? res[1].replace(/"/g, '').split(",") : [];
});
addSearchAliasX('e', 'wikipedia', 'https://en.wikipedia.org/wiki/', 's', 'https://en.wikipedia.org/w/api.php?action=opensearch&format=json&formatversion=2&namespace=0&limit=40&search=', function(response) {
    return JSON.parse(response.text)[1];
});
addSearchAliasX('w', 'bing', 'http://global.bing.com/search?setmkt=en-us&setlang=en-us&q=', 's', 'http://api.bing.com/osjson.aspx?query=', function(response) {
    var res = JSON.parse(response.text);
    return res[1];
});
addSearchAliasX('s', 'stackoverflow', 'http://stackoverflow.com/search?q=');
addSearchAliasX('h', 'github', 'https://github.com/search?q=', 's', 'https://api.github.com/search/repositories?order=desc&q=', function(response) {
    var res = JSON.parse(response.text)['items'];
    return res ? res.map(function(r){
        return {
            title: r.description,
            url: r.html_url
        };
    }) : [];
});
addSearchAliasX('y', 'youtube', 'https://www.youtube.com/results?search_query=', 's',
'https://clients1.google.com/complete/search?client=youtube&ds=yt&callback=cb&q=', function(response) {
    var res = JSON.parse(response.text.substr(9, response.text.length-10));
    return res[1].map(function(d) {
        return d[0];
    });
});

}
