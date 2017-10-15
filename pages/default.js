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

function toggleQuote() {
    var elm = Utils.getRealEdit(), val = elm.value;
    if (val[0] === '"') {
        elm.value = val.substr(1, val.length - 2);
    } else {
        elm.value = '"' + val + '"';
    }
}
imapkey("<Ctrl-'>", '#15Toggle quotes in an input element', toggleQuote);
cmapkey("<Ctrl-'>", '#15Toggle quotes in an input element', toggleQuote);
imapkey('<Ctrl-i>', '#15Open vim editor for current input', function() {
    var element = Utils.getRealEdit();
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
command('setProxy', 'setProxy <proxy_host>:<proxy_port> [proxy_type|PROXY]', function(args) {
    // args is an array of arguments
    var proxy = ((args.length > 1) ? args[1] : "PROXY") + " " + args[0];
    RUNTIME('updateProxy', {
        proxy: proxy
    });
    return true;
});
command('setProxyMode', 'setProxyMode <always|direct|byhost|system|clear>', function(args) {
    runtime.command({
        action: "updateProxy",
        mode: args[0]
    }, function(rs) {
        if (["byhost", "always"].indexOf(rs.proxyMode) !== -1) {
            Front.showBanner("{0}: {1}".format(rs.proxyMode, rs.proxy), 3000);
        } else {
            Front.showBanner(rs.proxyMode, 3000);
        }
    });
    // return true to close Omnibar for Commands, false to keep Omnibar on
    return true;
});
mapkey(';cp', '#13Copy proxy info', function() {
    runtime.command({
        action: 'getSettings',
        key: ['proxyMode', 'proxy', 'autoproxy_hosts']
    }, function(response) {
        Front.writeClipboard(JSON.stringify(response.settings, null, 4));
    });
});
mapkey(';ap', '#13Apply proxy info from clipboard', function() {
    Front.getContentFromClipboard(function(response) {
        var proxyConf = JSON.parse(response.data);
        RUNTIME('updateProxy', {
            host: proxyConf.autoproxy_hosts.join(","),
            operation: 'add',
            proxy: proxyConf.proxy,
            mode: proxyConf.proxyMode
        });
    });
});
// create shortcuts for the command with different parameters
map('spa', ':setProxyMode always', 0, '#13set proxy mode `always`');
map('spb', ':setProxyMode byhost', 0, '#13set proxy mode `byhost`');
map('spd', ':setProxyMode direct', 0, '#13set proxy mode `direct`');
map('sps', ':setProxyMode system', 0, '#13set proxy mode `system`');
map('spc', ':setProxyMode clear', 0, '#13set proxy mode `clear`');
command('proxyInfo', '#13show proxy info', function() {
    runtime.command({
        action: 'getSettings',
        key: ['proxyMode', 'proxy', 'autoproxy_hosts']
    }, function(response) {

        var infos = [ {name: 'mode', value: response.settings.proxyMode} ];
        if (response.settings.proxyMode === "byhost") {
            infos.push({name: 'proxy', value: response.settings.proxy});
            infos.push({name: 'hosts', value: response.settings.autoproxy_hosts.join(', ')});
        } else if (response.settings.proxyMode === "always") {
            infos.push({name: 'proxy', value: response.settings.proxy});
        }
        infos = infos.map(function(s) {
            return "<tr><td>{0}</td><td>{1}</td></tr>".format(s.name, s.value);
        });
        Front.showPopup("<table style='width:100%'>{0}</table>".format(infos.join('')));

    });
});
map('spi', ':proxyInfo');
command('addProxySite', 'addProxySite <host[,host]>, make hosts accessible through proxy.', function(args) {
    var host = args.join('');
    RUNTIME('updateProxy', {
        host: host,
        operation: 'add'
    });
    return true;
});
command('removeProxySite', 'removeProxySite <host[,host]>, make hosts accessible directly.', function(args) {
    var host = args.join('');
    RUNTIME('updateProxy', {
        host: host,
        operation: 'remove'
    });
    return true;
});
command('toggleProxySite', 'toggleProxySite <host>, toggle proxy for a site.', function(args) {
    var hosts = args.join('');
    return toggleProxySite(hosts);
});
command('listVoices', 'list tts voices', function() {
    runtime.command({
        action: 'getVoices'
    }, function(response) {

        var voices = response.voices.map(function(s) {
            return `<tr><td>${s.voiceName}</td><td>${s.lang}</td><td>${s.gender}</td><td>${s.remote}</td></tr>`;
        });
        voices.unshift("<tr style='font-weight: bold;'><td>voiceName</td><td>lang</td><td>gender</td><td>remote</td></tr>");
        Front.showPopup("<table style='width:100%'>{0}</table>".format(voices.join('')));

    });
});
command('testVoices', 'testVoices <locale> <text>', function(args) {
    runtime.command({
        action: 'getVoices'
    }, function(response) {

        var voices = response.voices, i = 0;
        if (args.length > 0) {
            voices = voices.filter(function(v) {
                return v.lang.indexOf(args[0]) !== -1;
            });
        }
        var textToRead = "This is to test voice with SurfingKeys";
        if (args.length > 1) {
            textToRead = args[1];
        }
        var text;
        for (i = 0; i < voices.length - 1; i++) {
            text = `${textToRead}, ${voices[i].voiceName} / ${voices[i].lang}.`;
            readText(text, {
                enqueue: true,
                verbose: true,
                voiceName: voices[i].voiceName
            });
        }
        text = `${textToRead}, ${voices[i].voiceName} / ${voices[i].lang}.`;
        readText(text, {
            enqueue: true,
            verbose: true,
            voiceName: voices[i].voiceName,
            onEnd: function() {
                Front.showPopup("All voices test done.");
            }
        });
    });
});
command('stopReading', '#13Stop reading.', function(args) {
    RUNTIME('stopReading');
});
mapkey('gr', '#14Read selected text or text from clipboard', function() {
    Front.getContentFromClipboard(function(response) {
        readText(window.getSelection().toString() || response.data, {verbose: true});
    });
});
vmapkey('gr', '#9Read selected text', function() {
    readText(window.getSelection().toString(), {verbose: true});
});
mapkey('sfr', '#13show failed web requests of current page', function() {
    runtime.command({
        action: 'getTabErrors'
    }, function(response) {
        if (response.tabError && response.tabError.length) {
            var errors = response.tabError.map(function(e) {
                var url = new URL(e.url);
                return "<tr><td>{0}</td><td>{1}</td><td>{2}</td></tr>".format(e.error, e.type, url.host);
            });
            Front.showPopup("<table style='width:100%'>{0}</table>".format(errors.join('')));
        } else {
            Front.showPopup("No errors from webRequest.");
        }
    });
});
command('feedkeys', 'feed mapkeys', function(args) {
    Normal.feedkeys(args[0]);
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

command('quit', '#5quit chrome', function() {
    RUNTIME('quit');
});
map('ZQ', ':quit');
mapkey(".", '#0Repeat last action', Normal.repeatLast, {repeatIgnore: true});
mapkey("sql", '#0Show last action', function() {
    Front.showPopup(Utils.htmlEncode(runtime.conf.lastKeys.map(function(k) {
        return Utils.decodeKeystroke(k);
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
mapkey('T', '#3Choose a tab', 'Front.chooseTab()');
mapkey('?', '#0Show usage', 'Front.showUsage()');
mapkey('e', '#2Scroll a page up', 'Normal.scroll("pageUp")', {repeatIgnore: true});
mapkey('d', '#2Scroll a page down', 'Normal.scroll("pageDown")', {repeatIgnore: true});
mapkey('j', '#2Scroll down', 'Normal.scroll("down")', {repeatIgnore: true});
mapkey('k', '#2Scroll up', 'Normal.scroll("up")', {repeatIgnore: true});
mapkey('h', '#2Scroll left', 'Normal.scroll("left")', {repeatIgnore: true});
mapkey('l', '#2Scroll right', 'Normal.scroll("right")', {repeatIgnore: true});
mapkey('gg', '#2Scroll to the top of the page', 'Normal.scroll("top")', {repeatIgnore: true});
mapkey('G', '#2Scroll to the bottom of the page', 'Normal.scroll("bottom")', {repeatIgnore: true});
mapkey('0', '#2Scroll all the way to the left', 'Normal.scroll("leftmost")', {repeatIgnore: true});
mapkey('$', '#2Scroll all the way to the right', 'Normal.scroll("rightmost")', {repeatIgnore: true});
mapkey('cs', '#2Change scroll target', 'Normal.changeScrollTarget()');
mapkey('cS', '#2Reset scroll target', 'Normal.resetScrollTarget()');
mapkey('f', '#1Open a link, press SHIFT to flip hints if they are overlapped.', 'Hints.create("", Hints.dispatchMouseClick)');
mapkey('af', '#1Open a link in new tab', 'Hints.create("", Hints.dispatchMouseClick, {tabbed: true})');
mapkey('gf', '#1Open a link in non-active new tab', 'Hints.create("", Hints.dispatchMouseClick, {tabbed: true, active: false})');
mapkey('cf', '#1Open multiple links in a new tab', 'Hints.create("", Hints.dispatchMouseClick, {tabbed: true, active: false, multipleHits: true})');
map('C', 'gf');
mapkey('<Ctrl-h>', '#1Mouse over elements.', 'Hints.create("", Hints.dispatchMouseClick, {mouseEvents: ["mouseover"]})');
mapkey('<Ctrl-j>', '#1Mouse out elements.', 'Hints.create("", Hints.dispatchMouseClick, {mouseEvents: ["mouseout"]})');
mapkey('ya', '#7Copy a link URL to the clipboard', function() {
    Hints.create('*[href]', function(element) {
        Front.writeClipboard(element.href);
    });
});
mapkey('yma', '#7Copy multiple link URLs to the clipboard', function() {
    var linksToYank = [];
    Hints.create('*[href]', function(element) {
        linksToYank.push(element.href);
        Front.writeClipboard(linksToYank.join('\n'));
    }, {multipleHits: true});
});
mapkey('i', '#1Go to edit box', 'Hints.create("input:visible, textarea:visible, *[contenteditable=true], select:visible", Hints.dispatchMouseClick)');
mapkey('gi', '#1Go to the first edit box', function() {
    $("input:visible:nth(0)")[0].scrollIntoViewIfNeeded();
    Hints.create("input:visible:nth(0)", Hints.dispatchMouseClick);
});
mapkey('I', '#1Go to edit box with vim editor', function() {
    Hints.create("input:visible, textarea:visible, *[contenteditable=true], select:visible", function(element) {
        Front.showEditor(element);
    });
});
mapkey('O', '#1Open detected links from text', function() {
    Hints.create(runtime.conf.clickablePat, function(element) {
        $(`<a href=${element[2]}>`)[0].click();
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
        if ($("EMBED").attr("type") === "application/pdf") {
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
mapkey('q', '#1Click on an Image or a button', 'Hints.create("img, button", Hints.dispatchMouseClick)');
mapkey('E', '#3Go one tab left', 'RUNTIME("previousTab")');
mapkey('R', '#3Go one tab right', 'RUNTIME("nextTab")');
mapkey('<Alt-p>', '#3pin/unpin current tab', 'RUNTIME("togglePinTab")');
mapkey('<Alt-m>', '#3mute/unmute current tab', 'RUNTIME("muteTab")');
mapkey('B', '#4Go one tab history back', 'RUNTIME("historyTab", {backward: true})', {repeatIgnore: true});
mapkey('F', '#4Go one tab history forward', 'RUNTIME("historyTab", {backward: false})', {repeatIgnore: true});
mapkey('gT', '#4Go to first activated tab', 'RUNTIME("historyTab", {index: 0})', {repeatIgnore: true});
mapkey('gt', '#4Go to last activated tab', 'RUNTIME("historyTab", {index: -1})', {repeatIgnore: true});
mapkey('S', '#4Go back in history', 'history.go(-1)', {repeatIgnore: true});
mapkey('D', '#4Go forward in history', 'history.go(1)', {repeatIgnore: true});
mapkey('r', '#4Reload the page', 'RUNTIME("reloadTab", { nocache: false })');
mapkey('t', '#8Open a URL', 'Front.openOmnibar({type: "URLs", extra: "getAllSites"})');
mapkey('go', '#8Open a URL in current tab', 'Front.openOmnibar({type: "URLs", extra: "getAllSites", tabbed: false})');
mapkey('ox', '#8Open recently closed URL', 'Front.openOmnibar({type: "URLs", extra: "getRecentlyClosed"})');
mapkey('H', '#8Open opened URL in current tab', 'Front.openOmnibar({type: "URLs", extra: "getTabURLs"})');
function renderShanbay(res) {
    var exp = res.msg;
    if (res.data.definition) {
        var tmp = [];
        for (var reg in res.data.pronunciations) {
            tmp.push('[{0}] {1}'.format(reg, res.data.pronunciations[reg]));
            tmp.push('<audio src="{0}" controls></audio>'.format(res.data[reg+'_audio']));
        }
        tmp.push(res.data.definition);
        exp = '<pre>{0}</pre>'.format(tmp.join('\n'));
    }
    return exp;
}
mapkey('Q', '#8Open omnibar for word translation', function() {
    Front.openOmniquery({
        url: "https://api.shanbay.com/bdc/search/?word=",
        /*
         * or
        url: function(q) {
            return "https://api.shanbay.com/bdc/search/?word=" + q
        },
        */
        query: Visual.getWordUnderCursor(),
        style: "opacity: 0.8;",
        parseResult: function(res) {
            var res = JSON.parse(res.text);
            return [ renderShanbay(res) ];
        }
    });
});
Visual.setTranslationService("https://api.shanbay.com/bdc/search/?word=", function(res) {
    var res = JSON.parse(res.text);
    return renderShanbay(res);
});
mapkey('b', '#8Open a bookmark', 'Front.openOmnibar(({type: "Bookmarks"}))');
mapkey('ab', '#8Bookmark current page to selected folder', function() {
    var page = {
        url: window.location.href,
        title: document.title
    };
    Front.openOmnibar(({type: "AddBookmark", extra: page}));
});
mapkey('oh', '#8Open URL from history', 'Front.openOmnibar({type: "History"})');
mapkey('om', '#8Open URL from vim-like marks', 'Front.openOmnibar({type: "VIMarks"})');
mapkey(':', '#8Open commands', 'Front.openOmnibar({type: "Commands"})');
command('clearHistory', 'clearHistory <find|cmd|...>', function(args) {
    runtime.updateHistory(args[0], []);
});
command('listSession', 'list session', function() {
    runtime.command({
        action: 'getSettings',
        key: 'sessions'
    }, function(response) {
        Omnibar.listResults(Object.keys(response.settings.sessions), function(s) {
            return $('<li/>').html(s);
        });
    });
});
command('createSession', 'createSession [name]', function(args) {
    RUNTIME('createSession', {
        name: args[0]
    });
});
command('deleteSession', 'deleteSession [name]', function(args) {
    RUNTIME('deleteSession', {
        name: args[0]
    });
    return true; // to close omnibar after the command executed.
});
command('openSession', 'openSession [name]', function(args) {
    RUNTIME('openSession', {
        name: args[0]
    });
});
command('listQueueURLs', 'list URLs in queue waiting for open', function(args) {
    runtime.command({
        action: 'getQueueURLs'
    }, function(response) {
        Omnibar.listResults(response.queueURLs, function(s) {
            return $('<li/>').html(s);
        });
    });
});
command('timeStamp', 'print time stamp in human readable format', function(args) {
    var dt = new Date(parseInt(args[0]));
    Omnibar.listWords([dt.toString()]);
});
mapkey('v', '#9Toggle visual mode', 'Visual.toggle()');
mapkey('zv', '#9Enter visual mode, and select whole element', 'Visual.toggle("z")');
mapkey('yv', '#9Yank text of an element', 'Visual.toggle("y")');
mapkey('ymv', '#9Yank text of multiple elements', 'Visual.toggle("ym")');
mapkey('V', '#9Restore visual mode', 'Visual.restore()');
mapkey('/', '#9Find in current page', 'Front.openFinder()');
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
mapkey('x', '#3Close current tab', 'RUNTIME("closeTab")');
mapkey('X', '#3Restore closed tab', 'RUNTIME("openLast")');
mapkey('W', '#3New window with current tab',  'RUNTIME("newWindow")');
mapkey('spk', '#0show pressed key', function() {
    Front.showPressed();
});
mapkey('m', '#10Add current URL to vim-like marks', Normal.addVIMark);
mapkey("'", '#10Jump to vim-like mark', Normal.jumpVIMark);
mapkey("<Ctrl-'>", '#10Jump to vim-like mark in new tab.', function(mark) {
    Normal.jumpVIMark(mark, true);
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
mapkey('n', '#9Next found text', 'Visual.next(false)');
mapkey('N', '#9Previous found text', 'Visual.next(true)');
mapkey('w', '#2Switch frames', 'Normal.rotateFrame()');
mapkey('cc', '#7Open selected link or link from clipboard', function() {
    if (window.getSelection().toString()) {
        tabOpenLink(window.getSelection().toString());
    } else {
        Front.getContentFromClipboard(function(response) {
            tabOpenLink(response.data);
        });
    }
});
mapkey('[[', '#1Click on the previous link on current page', previousPage);
mapkey(']]', '#1Click on the next link on current page', nextPage);
mapkey('ys', "#7Copy current page's source", function() {
    var aa = document.documentElement.cloneNode(true);
    Front.writeClipboard(aa.outerHTML);
});
mapkey('yj', "#7Copy current settings", function() {
    runtime.command({
        action: 'getSettings',
        key: "RAW"
    }, function(response) {
        Front.writeClipboard(JSON.stringify(response.settings, null, 4));
    });
});
mapkey('yd', "#7Copy current downloading URL", function() {
    runtime.command({
        action: 'getDownloads',
        query: {state: "in_progress"}
    }, function(response) {
        var items = response.downloads.map(function(o) {
            return o.url;
        });
        Front.writeClipboard(items.join(','));
    });
});
mapkey('yt', '#3Duplicate current tab', 'RUNTIME("duplicateTab")');
mapkey('yy', "#7Copy current page's URL", 'Front.writeClipboard(window.location.href)');
mapkey('yl', "#7Copy current page's title", 'Front.writeClipboard(document.title)');
mapkey('yf', '#7Copy form data in JSON on current page', function() {
    var aa = [];
    $('form').each(function() {
        var fd = {};
        fd[(this.method || "get") + "::" + this.action] = getFormData(this, "json");
        aa.push(fd);
    });
    Front.writeClipboard(JSON.stringify(aa, null, 4));
});
mapkey('yg', '#7Capture current page', function() {
    Front.toggleStatus(false);
    setTimeout(function() {
        runtime.command({
            action: 'captureVisibleTab'
        }, function(response) {
            Front.toggleStatus(true);
            Front.showPopup("<img src='{0}' />".format(response.dataUrl));
        });
    }, 500);
});
mapkey('yG', '#7Capture current full page', function() {
    Normal.captureFullPage();
});
mapkey('yS', '#7Capture scrolling element', function() {
    Normal.captureScrollingElement();
});
mapkey('yp', '#7Copy form data for POST on current page', function() {
    var aa = [];
    $('form').each(function() {
        var fd = {};
        fd[(this.method || "get") + "::" + this.action] = getFormData(this);
        aa.push(fd);
    });
    Front.writeClipboard(JSON.stringify(aa, null, 4));
});
mapkey('ob', '#8Open Search with alias b', 'Front.openOmnibar({type: "SearchEngine", extra: "b"})');
mapkey('og', '#8Open Search with alias g', 'Front.openOmnibar({type: "SearchEngine", extra: "g"})');
mapkey('ow', '#8Open Search with alias w', 'Front.openOmnibar({type: "SearchEngine", extra: "w"})');
mapkey('on', '#3Open Chrome newtab', 'tabOpenLink("chrome://newtab/")');
mapkey('ga', '#12Open Chrome About', 'tabOpenLink("chrome://help/")');
mapkey('gb', '#12Open Chrome Bookmarks', 'tabOpenLink("chrome://bookmarks/")');
mapkey('gc', '#12Open Chrome Cache', 'tabOpenLink("chrome://cache/")');
mapkey('gd', '#12Open Chrome Downloads', 'tabOpenLink("chrome://downloads/")');
mapkey('gh', '#12Open Chrome History', 'tabOpenLink("chrome://history/")');
mapkey('gk', '#12Open Chrome Cookies', 'tabOpenLink("chrome://settings/content/cookies")');
mapkey('ge', '#12Open Chrome Extensions', 'tabOpenLink("chrome://extensions/")');
mapkey('gn', '#12Open Chrome net-internals', 'tabOpenLink("chrome://net-internals/#proxy")');
mapkey('gs', '#12View page source', 'RUNTIME("viewSource", { tab: { tabbed: true }})');
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
mapkey('gU', '#4Go to root of current URL hierarchy', 'window.location.href = window.location.origin');
mapkey('gxt', '#3Close tab on left', 'RUNTIME("closeTabLeft")');
mapkey('gxT', '#3Close tab on right', 'RUNTIME("closeTabRight")');
mapkey('gx0', '#3Close all tabs on left', 'RUNTIME("closeTabsToLeft")');
mapkey('gx$', '#3Close all tabs on right', 'RUNTIME("closeTabsToRight")');
mapkey('se', '#11Edit Settings', 'tabOpenLink("/pages/options.html")');
mapkey('si', '#12Open Chrome Inspect', 'tabOpenLink("chrome://inspect/#devices")');
mapkey('sm', '#11Preview markdown', 'tabOpenLink("/pages/markdown.html")');
mapkey('<Ctrl-Alt-d>', '#11Mermaid diagram generator', 'tabOpenLink("/pages/mermaid.html")');
mapkey('su', '#4Edit current URL with vim editor', function() {
    Front.showEditor(window.location.href, function(data) {
        tabOpenLink(data);
    }, 'url');
});
mapkey(';m', '#1mouse out last element', 'Hints.mouseoutLastElement()');
mapkey(';j', '#12Close Downloads Shelf', 'RUNTIME("closeDownloadsShelf")');
mapkey(';pp', '#7Paste html on current page', function() {
    Front.getContentFromClipboard(function(response) {
        document.body.innerHTML = response.data;
    });
});
mapkey(';q', '#14Insert jquery library on current page', 'Normal.insertJS("//ajax.aspnetcdn.com/ajax/jQuery/jquery-2.1.4.min.js")');
mapkey(';t', 'Translate selected text with google', function() {
    searchSelectedWith('https://translate.google.com/?hl=en#auto/en/', false, false, '');
});
mapkey(';dh', '#14Delete history older than 30 days', function() {
    RUNTIME('deleteHistoryOlderThan', {
        days: 30
    });
});
mapkey(';db', '#14Remove bookmark for current page', function() {
    RUNTIME('removeBookmark');
});

addSearchAliasX('g', 'google', 'https://www.google.com/search?q=', 's', 'https://www.google.com/complete/search?client=chrome-omni&gs_ri=chrome-ext&oit=1&cp=1&pgcl=7&q=', function(response) {
    var res = eval(response.text);
    return res[1];
});
addSearchAliasX('d', 'duckduckgo', 'https://duckduckgo.com/?q=', 's', 'https://duckduckgo.com/ac/?q=', function(response) {
    var res = eval(response.text);
    return res.map(function(r){
        return r.phrase;
    });
});
addSearchAliasX('b', 'baidu', 'https://www.baidu.com/s?wd=', 's', 'http://suggestion.baidu.com/su?cb=eval&wd=', function(response) {
    var res = eval(response.text);
    return res.s;
});
addSearchAliasX('w', 'bing', 'http://global.bing.com/search?setmkt=en-us&setlang=en-us&q=', 's', 'http://api.bing.com/osjson.aspx?query=', function(response) {
    var res = eval(response.text);
    return res[1];
});
addSearchAliasX('s', 'stackoverflow', 'http://stackoverflow.com/search?q=');
addSearchAliasX('h', 'github', 'https://github.com/search?type=Code&utf8=%E2%9C%93&q=');
