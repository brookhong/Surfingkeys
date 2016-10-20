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

imapkey("<Ctrl-'>", '', function() {
    var val = document.activeElement.value;
    if (val[0] === '"') {
        document.activeElement.value = val.substr(1, val.length - 2);
    } else {
        document.activeElement.value = '"' + val + '"';
    }
});
imapkey('<Ctrl-i>', '#15Open vim editor for current input', function() {
    var element = document.activeElement;
    Front.showEditor(element, function(data) {
        $(element).val(data);
    }, element.localName);
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
    console.log(proxy);
    RUNTIME('updateProxy', {
        proxy: proxy
    });
    return true;
});
command('setProxyMode', 'setProxyMode <always|direct|byhost|system|clear>', function(args) {
    RUNTIME('updateProxy', {
        mode: args[0]
    });
    // return true to close Omnibar for Commands, false to keep Omnibar on
    return true;
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
            infos.push({name: 'hosts', value: Object.keys(response.settings.autoproxy_hosts).join(', ')});
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
    console.log(host);
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
mapkey("<Ctrl-2>", '#0Show last action', function() {
    Front.showPopup(htmlEncode(runtime.conf.lastKeys.join('\n')));
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
mapkey('u', '#0Show usage', 'Front.showUsage()');
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
mapkey('f', '#1Open a link, press SHIFT to flip hints if they are overlapped.', 'Hints.create("", Hints.dispatchMouseClick)');
mapkey('af', '#1Open a link in new tab', 'Hints.create("", Hints.dispatchMouseClick, {tabbed: true})');
mapkey('gf', '#1Open a link in non-active new tab', 'Hints.create("", Hints.dispatchMouseClick, {tabbed: true, active: false})');
mapkey('cf', '#1Open multiple links in a new tab', 'Hints.create("", Hints.dispatchMouseClick, {tabbed: true, active: false, multipleHits: true})');
mapkey('ya', '#7Copy a link URL to the clipboard', function() {
    Hints.create('*[href]', function(element, event) {
        Front.writeClipboard(element.href);
    })
});
mapkey('i', '#1Go to edit box', 'Hints.create("input:visible, textarea:visible, *[contenteditable=true], select:visible", Hints.dispatchMouseClick)');
mapkey('I', '#1Go to edit box with vim editor', function() {
    Hints.create("input:visible, textarea:visible, *[contenteditable=true], select:visible", function(element, event) {
        Front.showEditor(element, function(data) {
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
mapkey('B', '#4Go one tab history back', 'RUNTIME("historyTab", {backward: true})', {repeatIgnore: true});
mapkey('F', '#4Go one tab history forward', 'RUNTIME("historyTab", {backward: false})', {repeatIgnore: true});
mapkey('S', '#4Go back in history', 'history.go(-1)', {repeatIgnore: true});
mapkey('D', '#4Go forward in history', 'history.go(1)', {repeatIgnore: true});
mapkey('r', '#4Reload the page', 'RUNTIME("reloadTab", { nocache: false })');
mapkey('t', '#8Open a URL', 'Front.openOmnibar({type: "URLs", extra: "getAllSites"})');
mapkey('go', '#8Open a URL in current tab', 'Front.openOmnibar({type: "URLs", extra: "getAllSites", tabbed: false})');
mapkey('ox', '#8Open recently closed URL', 'Front.openOmnibar({type: "URLs", extra: "getRecentlyClosed"})');
mapkey('H', '#8Open opened URL in current tab', 'Front.openOmnibar({type: "URLs", extra: "getTabURLs"})');
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
            var res = eval("a=" + res.text);
            return [res.data.definition || res.msg];
        }
    });
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
        action: 'getSessions'
    }, function(response) {
        Omnibar.listResults(Object.keys(response.sessions), function(s) {
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
mapkey('v', '#9Toggle visual mode', 'Visual.toggle()');
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
mapkey('<Ctrl-1>', '#0show pressed key', function(key) {
    Front.showPopup(htmlEncode(key));
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
        Front.getContentFromClipboard(function(response) {
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
    Front.writeClipboard(aa.outerHTML);
});
mapkey('yj', "#7Copy current settings", function() {
    runtime.command({
        action: 'getSettings'
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
mapkey('yf', '#7Copy form data on current page', function() {
    var aa = [];
    $('form').each(function() {
        aa.push(getFormData(this));
    });
    Front.writeClipboard(JSON.stringify(aa, null, 4));
});
mapkey('ob', '#8Open Search with alias b', 'Front.openOmnibar({type: "SearchEngine", extra: "b"})');
mapkey('og', '#8Open Search with alias g', 'Front.openOmnibar({type: "SearchEngine", extra: "g"})');
mapkey('ow', '#8Open Search with alias w', 'Front.openOmnibar({type: "SearchEngine", extra: "w"})');
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
mapkey('se', '#11Edit Settings', 'tabOpenLink("/pages/options.html")');
mapkey('sr', '#11Reset Settings', 'Normal.resetSettings()');
mapkey('si', '#12Open Chrome Inpect', 'tabOpenLink("chrome://inspect/#devices")');
mapkey('sm', '#11Preview markdown', 'tabOpenLink("/pages/github-markdown.html")');
mapkey('su', '#4Edit current URL with vim editor', function() {
    Front.showEditor(window.location.href, function(data) {
        tabOpenLink(data);
    }, 'url');
});
mapkey(';m', '#1mouse out last element', 'Hints.mouseoutLastElement()');
mapkey(';j', '#12Close Downloads Shelf', 'RUNTIME("closeDownloadsShelf")');
mapkey(';p', '#7Paste html on current page', function() {
    Front.getContentFromClipboard(function(response) {
        document.body.innerHTML = response.data;
    });
});
mapkey(';q', '#14Insert jquery library on current page', 'Normal.insertJS("//ajax.aspnetcdn.com/ajax/jQuery/jquery-2.1.4.min.js")');
mapkey('gt', 'Translate selected text with google', function() {
    searchSelectedWith('https://translate.google.com/?hl=en#auto/en/', false, false, '');
});

addSearchAliasX('g', 'google', 'https://www.google.com/search?q=', 's', 'https://www.google.com/complete/search?client=chrome-omni&gs_ri=chrome-ext&oit=1&cp=1&pgcl=7&q=', function(response) {
    var res = eval(response.text);
    Omnibar.listWords(res[1]);
});
addSearchAliasX('d', 'duckduckgo', 'https://duckduckgo.com/?q=', 's', 'https://duckduckgo.com/ac/?q=', function(response) {
    var res = eval(response.text);
    res = res.map(function(r){
        return r.phrase;
    });
    Omnibar.listWords(res);
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
