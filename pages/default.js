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

imapkey('<Ctrl-i>', '#15Open vim editor for current input', function() {
    var element = document.activeElement;
    Normal.showEditor(element, function(data) {
        $(element).val(data);
    }, element.localName);
});
function toggleProxySite(host) {
    var operation = (settings.autoproxy_hosts.hasOwnProperty(host)) ? 'remove' : 'add';
    RUNTIME('updateProxy', {
        host: host,
        operation: operation
    });
    return true;
}
mapkey('cp', '#13Toggle proxy for current site', function() {
    var host = window.location.host.replace(/:\d+/,'');
    if (host && host.length) {
        toggleProxySite(host);
    }
});
command('setProxy', 'setProxy <proxy_host>:<proxy_port> [proxy_type|PROXY]', function(endpoint, type) {
    var proxy = (type || "PROXY") + " " + endpoint;
    RUNTIME('updateProxy', {
        proxy: proxy
    });
    return true;
});
command('setProxyMode', 'setProxyMode <always|direct|byhost|system|clear>', function(mode) {
    RUNTIME('updateProxy', {
        mode: mode
    });
    return true;
});
// create shortcuts for the command with different parameters
map('spa', ':setProxyMode always', 0, '#13set proxy mode `always`');
map('spb', ':setProxyMode byhost', 0, '#13set proxy mode `byhost`');
map('spd', ':setProxyMode direct', 0, '#13set proxy mode `direct`');
map('sps', ':setProxyMode system', 0, '#13set proxy mode `system`');
command('proxyInfo', '#13show proxy info', function() {
    var infos = [ {name: 'mode', value: runtime.settings.proxyMode} ];
    if (runtime.settings.proxyMode === "byhost") {
        infos.push({name: 'proxy', value: runtime.settings.proxy});
        infos.push({name: 'hosts', value: Object.keys(runtime.settings.autoproxy_hosts).join(', ')});
    } else if (runtime.settings.proxyMode === "always") {
        infos.push({name: 'proxy', value: runtime.settings.proxy});
    }
    infos = infos.map(function(s) {
        return "<tr><td>{0}</td><td>{1}</td></tr>".format(s.name, s.value);
    });
    Normal.showPopup("<table style='width:100%'>{0}</table>".format(infos.join('')));
});
map('spi', ':proxyInfo');
command('addProxySite', 'addProxySite <host[,host]>, make hosts accessible through proxy.', function(host) {
    RUNTIME('updateProxy', {
        host: host,
        operation: 'add'
    });
    return true;
});
command('removeProxySite', 'removeProxySite <host[,host]>, make hosts accessible directly.', function(host) {
    RUNTIME('updateProxy', {
        host: host,
        operation: 'remove'
    });
    return true;
});
command('toggleProxySite', 'toggleProxySite <host>, toggle proxy for a site.', toggleProxySite);
mapkey('sfr', '#13show failed web requests of current page', function() {
    runtime.command({
        action: 'getTabErrors'
    }, function(response) {
        if (response.tabError && response.tabError.length) {
            var errors = response.tabError.map(function(e) {
                var url = new URL(e.url);
                return "<tr><td>{0}</td><td>{1}</td><td>{2}</td></tr>".format(e.error, e.type, url.host);
            });
            Normal.showPopup("<table style='width:100%'>{0}</table>".format(errors.join('')));
        } else {
            Normal.showPopup("No errors from webRequest.");
        }
    });
});
command('feedkeys', 'feed mapkeys', function(keys) {
    Normal.feedkeys(keys);
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
mapkey("<Ctrl-2>", '#0Show last action', function() {
    Normal.showPopup(htmlEncode(settings.lastKeys.join('\n')));
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
mapkey('T', '#3Choose a tab', 'Normal.chooseTab()');
mapkey('?', '#0Show usage', 'Normal.showUsage()');
mapkey('u', '#0Show usage', 'Normal.showUsage()');
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
// define all the css selectors that can be followed
mapkey('f', '#1Open a link, press SHIFT to flip hints if they are overlapped.', 'Hints.create("", Hints.dispatchMouseClick)');
mapkey('af', '#1Open a link in new tab', 'Hints.create("", Hints.dispatchMouseClick, {tabbed: true})');
mapkey('gf', '#1Open a link in non-active new tab', 'Hints.create("", Hints.dispatchMouseClick, {tabbed: true, active: false})');
mapkey('cf', '#1Open multiple links in a new tab', 'Hints.create("", Hints.dispatchMouseClick, {tabbed: true, active: false, multipleHits: true})');
mapkey('ya', '#7Copy a link URL to the clipboard', function() {
    Hints.create('*[href]', function(element, event) {
        Normal.writeClipboard(element.href);
    })
});
mapkey('i', '#1Go to edit box', 'Hints.create("input:visible, textarea:visible, *[contenteditable=true], select:visible", Hints.dispatchMouseClick)');
mapkey('I', '#1Go to edit box with vim editor', function() {
    Hints.create("input:visible, textarea:visible, *[contenteditable=true], select:visible", function(element, event) {
        Normal.showEditor(element, function(data) {
            $(element).val(data);
        }, element.localName);
    });
});
map('<Ctrl-i>', 'I');
mapkey('q', '#1Click on an Image or a button', 'Hints.create("img, button", Hints.dispatchMouseClick)');
mapkey('E', '#3Go one tab left', 'RUNTIME("previousTab")');
mapkey('R', '#3Go one tab right', 'RUNTIME("nextTab")');
mapkey('<Alt-p>', '#3pin/unpin current tab', 'RUNTIME("togglePinTab")');
mapkey('<Alt-m>', '#3mute/unmute current tab', 'RUNTIME("muteTab")');
mapkey('B', '#4Go one tab history back', 'RUNTIME("historyTab", {backward: true})');
mapkey('F', '#4Go one tab history forward', 'RUNTIME("historyTab", {backward: false})');
mapkey('S', '#4Go back in history', 'history.go(-1)');
mapkey('D', '#4Go forward in history', 'history.go(1)');
mapkey('r', '#4Reload the page', 'RUNTIME("reloadTab", { nocache: false })');
mapkey('t', '#8Open an URL', 'Normal.openOmnibar({type: "URLs", extra: "getTopSites"})');
mapkey('go', '#8Open an URL in current tab', 'Normal.openOmnibar({type: "URLs", extra: "getTopSites", tabbed: false})');
mapkey('ox', '#8Open recently closed URL', 'Normal.openOmnibar({type: "URLs", extra: "getRecentlyClosed"})');
mapkey('H', '#8Open opened URL in current tab', 'Normal.openOmnibar({type: "URLs", extra: "getTabURLs"})');
mapkey('Q', '#8Open omnibar for word translation', function() {
    Normal.openOmniquery({
        url: "https://api.shanbay.com/bdc/search/?word=",
        parseResult: function(res) {
            var res = eval("a=" + res.text);
            return [res.data.definition || res.msg];
        }
    });
});
mapkey('b', '#8Open a bookmark', 'Normal.openOmnibar(({type: "Bookmarks"}))');
mapkey('ab', '#8Bookmark current page to selected folder', function() {
    var page = {
        url: window.location.href,
        title: document.title
    };
    Normal.openOmnibar(({type: "AddBookmark", extra: page}));
});
mapkey('oh', '#8Open URL from history', 'Normal.openOmnibar({type: "History"})');
mapkey('om', '#8Open URL from vim-like marks', 'Normal.openOmnibar({type: "VIMarks"})');
mapkey(':', '#8Open commands', 'Normal.openOmnibar({type: "Commands"})');
command('clearHistory', 'clearHistory <find|cmd|...>', function(type) {
    runtime.updateHistory(type, []);
});
command('listSession', 'list session', function() {
    runtime.command({
        action: 'getSessions'
    }, function(response) {
        Omnibar.listResults(Object.keys(response.sessions), function(s) {
            return $('<li/>').html(s);
        });
    });
});
command('createSession', 'createSession [name]', function(name) {
    RUNTIME('createSession', {
        name: name
    });
});
command('deleteSession', 'deleteSession [name]', function(name) {
    RUNTIME('deleteSession', {
        name: name
    });
    return true; // to close omnibar after the command executed.
});
command('openSession', 'openSession [name]', function(name) {
    RUNTIME('openSession', {
        name: name
    });
});
mapkey('v', '#9Toggle visual mode', 'Visual.toggle()');
mapkey('/', '#9Find in current page', 'Normal.openFinder()');
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
mapkey('<Ctrl-1>', '#0show pressed key', function(key) {
    Normal.showPopup(htmlEncode(key));
}, {extra_chars: 1});
mapkey('m', '#10Add current URL to vim-like marks', Normal.addVIMark, {extra_chars: 1});
mapkey("'", '#10Jump to vim-like mark', Normal.jumpVIMark, {extra_chars: 1});
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
        Normal.getContentFromClipboard(function(response) {
            tabOpenLink(response.data);
        });
    }
});
mapkey('[[', '#1Click on the previous link on current page', function() {
    var prevLinks = $('a').regex(/((<<|prev(ious)?)+)/i);
    if (prevLinks.length) {
        clickOn(prevLinks);
    } else {
        walkPageUrl(-1);
    }
});
mapkey(']]', '#1Click on the next link on current page', function() {
    var nextLinks = $('a').regex(/((>>|next)+)/i);
    if (nextLinks.length) {
        clickOn(nextLinks);
    } else {
        walkPageUrl(1);
    }
});
mapkey('ys', "#7Copy current page's source", function() {
    var aa = document.documentElement.cloneNode(true);
    Normal.writeClipboard(aa.outerHTML);
});
mapkey('yj', "#7Copy current settings", function() {
    Normal.writeClipboard(JSON.stringify(settings, null, 4));
});
mapkey('yd', "#7Copy current downloading URL", function() {
    runtime.command({
        action: 'getDownloads',
        query: {state: "in_progress"}
    }, function(response) {
        var items = response.downloads.map(function(o) {
            return o.url;
        });
        Normal.writeClipboard(items.join(','));
    });
});
mapkey('yt', '#3Duplicate current tab', 'RUNTIME("duplicateTab")');
mapkey('yy', "#7Copy current page's URL", 'Normal.writeClipboard(window.location.href)');
mapkey('yl', "#7Copy current page's title", 'Normal.writeClipboard(document.title)');
mapkey('yf', '#7Copy form data on current page', function() {
    var aa = [];
    $('form').each(function() {
        aa.push(getFormData(this));
    });
    Normal.writeClipboard(JSON.stringify(aa, null, 4));
});
mapkey('ob', '#8Open Search with alias b', 'Normal.openOmnibar({type: "SearchEngine", extra: "b"})');
mapkey('og', '#8Open Search with alias g', 'Normal.openOmnibar({type: "SearchEngine", extra: "g"})');
mapkey('ow', '#8Open Search with alias w', 'Normal.openOmnibar({type: "SearchEngine", extra: "w"})');
mapkey('on', '#3Open Chrome newtab', 'tabOpenLink("chrome://newtab/")');
mapkey('ga', '#12Open Chrome Bookmarks', 'tabOpenLink("chrome://help/")');
mapkey('gb', '#12Open Chrome Bookmarks', 'tabOpenLink("chrome://bookmarks/")');
mapkey('gc', '#12Open Chrome Cache', 'tabOpenLink("chrome://cache/")');
mapkey('gd', '#12Open Chrome Downloads', 'tabOpenLink("chrome://downloads/")');
mapkey('gh', '#12Open Chrome History', 'tabOpenLink("chrome://history/")');
mapkey('gk', '#12Open Chrome Cookies', 'tabOpenLink("chrome://settings/cookies")');
mapkey('ge', '#12Open Chrome Extensions', 'tabOpenLink("chrome://extensions/")');
mapkey('gn', '#12Open Chrome net-internals', 'tabOpenLink("chrome://net-internals/#proxy")');
mapkey('gs', '#12View page source', 'RUNTIME("viewSource", { tab: { tabbed: true }})');
mapkey('gu', '#4Go up one path in the URL', function() {
    var url = location.href;
    if (location.pathname.length > 1) {
        url = url.endsWith('/') ? url.substr(0, url.length - 1) : url;
        url = url.substr(0, url.lastIndexOf('/'));
    }
    window.location.href = url;
});
mapkey('g?', '#4Reload current page without query string(all parts after question mark)', function() {
    window.location.href = window.location.href.replace(/\?[^\?]*$/, '');
});
mapkey('gU', '#4Go to root of current URL hierarchy', 'window.location.href = window.location.origin');
mapkey('se', '#11Edit Settings', 'tabOpenLink(runtime.extensionURLRoot + "pages/options.html")');
mapkey('sr', '#11Reset Settings', 'Normal.resetSettings()');
mapkey('si', '#12Open Chrome Inpect', 'tabOpenLink("chrome://inspect/#devices")');
mapkey('sm', '#11Preview markdown', 'tabOpenLink(runtime.extensionURLRoot + "pages/github-markdown.html")');
mapkey('su', '#4Edit current URL with vim editor', function() {
    Normal.showEditor(window.location.href, function(data) {
        tabOpenLink(data);
    }, 'url');
});
mapkey(';m', '#1mouse out last element', 'Hints.mouseoutLastElement()');
mapkey(';j', '#12Close Downloads Shelf', 'RUNTIME("closeDownloadsShelf")');
mapkey(';p', '#7Paste html on current page', function() {
    Normal.getContentFromClipboard(function(response) {
        document.body.innerHTML = response.data;
    });
});
mapkey(';q', '#14Insert jquery library on current page', 'Normal.insertJS("//ajax.aspnetcdn.com/ajax/jQuery/jquery-2.1.4.min.js")');

addSearchAliasX('g', 'google', 'https://www.google.com/search?q=', 's', 'https://www.google.com/complete/search?client=chrome-omni&gs_ri=chrome-ext&oit=1&cp=1&pgcl=7&q=', function(response) {
    var res = eval(response.text);
    Omnibar.listWords(res[1]);
});
addSearchAliasX('b', 'baidu', 'https://www.baidu.com/s?wd=', 's', 'http://suggestion.baidu.com/su?cb=eval&wd=', function(response) {
    var res = eval(response.text);
    Omnibar.listWords(res.s);
});
addSearchAliasX('w', 'bing', 'http://global.bing.com/search?setmkt=en-us&setlang=en-us&q=', 's', 'http://api.bing.com/osjson.aspx?query=', function(response) {
    var res = eval(response.text);
    Omnibar.listWords(res[1]);
});
addSearchAliasX('s', 'stackoverflow', 'http://stackoverflow.com/search?q=');
addSearchAliasX('h', 'github', 'https://github.com/search?type=Code&utf8=%E2%9C%93&q=');
