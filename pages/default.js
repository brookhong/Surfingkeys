mapkey('ZQ', 'Quit', function() {
    RUNTIME('quit');
});
mapkey('ZZ', 'Save session and quit', function() {
    RUNTIME('createSession', {
        name: 'LAST'
    });
    RUNTIME('quit');
});
mapkey('ZR', 'Restore last session', function() {
    RUNTIME('openSession', {
        name: 'LAST'
    });
});
mapkey('T', 'Choose a tab', 'Normal.chooseTab()');
mapkey('c-i', 'Show usage', 'Normal.showUsage()');
mapkey('u', 'Show usage', 'Normal.showUsage()');
mapkey('e', 'Scroll a page up', 'Normal.scroll("pageUp")');
mapkey('d', 'Scroll a page down', 'Normal.scroll("pageDown")');
mapkey('j', 'Scroll down', 'Normal.scroll("down")');
mapkey('k', 'Scroll up', 'Normal.scroll("up")');
mapkey('h', 'Scroll left', 'Normal.scroll("left")');
mapkey('l', 'Scroll right', 'Normal.scroll("right")');
mapkey('gg', 'Scroll to the top of the page', 'Normal.scroll("top")');
mapkey('G', 'Scroll to the bottom of the page', 'Normal.scroll("bottom")');
mapkey('cs', 'Change scroll target', 'Normal.changeScrollTarget()');
// define all the css selectors that can be followed
Hints.pointers = "a, button, *:visible:css(cursor=pointer), select:visible, input:visible, textarea:visible";
mapkey('f', 'Open a link', 'Hints.create(Hints.pointers, Hints.dispatchMouseClick)');
mapkey('af', 'Open a link in new tab', 'Hints.create(Hints.pointers, Hints.dispatchMouseClick, {tabbed: true})');
mapkey('gf', 'Open a link in non-active new tab', 'Hints.create(Hints.pointers, Hints.dispatchMouseClick, {tabbed: true, active: false})');
mapkey('a-f', 'Open multiple links in a new tab', 'Hints.create(Hints.pointers, Hints.dispatchMouseClick, {tabbed: true, active: false, multipleHits: true})');
mapkey('i', 'Go to edit box', 'Hints.create("input:visible, textarea:visible", Hints.dispatchMouseClick)');
mapkey('q', 'Click on an Image or a button', 'Hints.create("img, button", Hints.dispatchMouseClick)');
mapkey('E', 'Go one tab left', 'RUNTIME("previousTab")');
mapkey('R', 'Go one tab right', 'RUNTIME("nextTab")');
mapkey('a-p', 'pin/unpin current tab', 'RUNTIME("togglePinTab")');
mapkey('B', 'Go one tab history back', 'RUNTIME("historyTab", {backward: true})');
mapkey('F', 'Go one tab history forward', 'RUNTIME("historyTab", {backward: false})');
mapkey('S', 'Go back in history', 'history.go(-1)');
mapkey('D', 'Go forward in history', 'history.go(1)');
mapkey('r', 'Reload the page', 'RUNTIME("reloadTab", { nocache: false })');
mapkey('t', 'Open an URLs', 'Normal.openOmnibar({type: "URLs"})');
mapkey('b', 'Open a bookmark', 'Normal.openOmnibar(({type: "Bookmarks"}))');
mapkey('oh', 'Open URL from history', 'Normal.openOmnibar({type: "History"})');
mapkey('om', 'Open URL from vim-like marks', 'Normal.openOmnibar({type: "VIMarks"})');
mapkey(':', 'Open commands', 'Normal.openOmnibar({type: "Commands"})');
command('quit', 'quit chrome', function() {
    RUNTIME('quit');
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
mapkey('v', 'Toggle visual mode', 'Visual.toggle()');
mapkey('/', 'Find in current page', 'Normal.openFinder()');
mapkey('*', 'Find selected text in current page', function() {
    Visual.star();
    Visual.toggle();
});
mapkey('x', 'Close current tab', 'RUNTIME("closeTab")');
mapkey('X', 'Restore closed tab', 'RUNTIME("openLast")');
mapkey('m', 'Add current URL to vim-like marks', Normal.addVIMark, 1);
mapkey("'", 'Jump to vim-like mark', Normal.jumpVIMark, 1);
mapkey('n', 'Next found text', 'Visual.next(false)');
mapkey('N', 'Previous found text', 'Visual.next(true)');
mapkey('w', 'Switch frames', 'Normal.rotateFrame()');
mapkey('p', 'Paste html on current page.', function() {
    Normal.getContentFromClipboard(function(response) {
        document.body.innerHTML = response.data;
    });
});
mapkey('cc', 'Open selected link or link from clipboard', function() {
    if (window.getSelection().toString()) {
        tabOpenLink(window.getSelection().toString());
    } else {
        Normal.getContentFromClipboard(function(response) {
            var links = response.data.split('\n');
            links.forEach(function(u) {
                u = u.trim();
                if (u.length > 0) {
                    tabOpenLink(u);
                }
            });
        });
    }
});
mapkey('[[', 'Click on the previous link on current page', function() {
    var prevLinks = $('a').regex(/((<<|prev(ious)?)+)/i);
    if (prevLinks.length) {
        clickOn(prevLinks);
    } else {
        walkPageUrl(-1);
    }
});
mapkey(']]', 'Click on the next link on current page', function() {
    var nextLinks = $('a').regex(/((>>|next)+)/i);
    if (nextLinks.length) {
        clickOn(nextLinks);
    } else {
        walkPageUrl(1);
    }
});
mapkey('ys', "Copy current page's source", function() {
    var aa = document.documentElement.cloneNode(true);
    Normal.writeClipboard(aa.outerHTML);
});
mapkey('yt', 'Duplicate current tab', 'RUNTIME("duplicateTab")');
mapkey('yf', "Copy current page's URL", 'Normal.writeClipboard(window.location.href)');
mapkey('yl', "Copy current page's title", 'Normal.writeClipboard(document.title)');
mapkey('ob', 'Open Search with alias b', 'Normal.openOmnibar({type: "SearchEngine", extra: "b"})');
mapkey('og', 'Open Search with alias g', 'Normal.openOmnibar({type: "SearchEngine", extra: "g"})');
mapkey('ow', 'Open Search with alias w', 'Normal.openOmnibar({type: "SearchEngine", extra: "w"})');
mapkey('on', 'Open Chrome newtab', 'tabOpenLink("chrome://newtab/")');
mapkey('gb', 'Open Chrome Bookmarks', 'tabOpenLink("chrome://bookmarks/")');
mapkey('gj', 'Open Chrome Bookmarks', 'tabOpenLink("chrome://chrome/settings/contentExceptions#javascript")');
mapkey('gc', 'Open Chrome Cache', 'tabOpenLink("chrome://cache/")');
mapkey('gd', 'Open Chrome Downloads', 'tabOpenLink("chrome://downloads/")');
mapkey('gh', 'Open Chrome History', 'tabOpenLink("chrome://history/")');
mapkey('gk', 'Open Chrome Cookies', 'tabOpenLink("chrome://settings/cookies")');
mapkey('ge', 'Open Chrome Extensions', 'tabOpenLink("chrome://extensions/")');
mapkey('gn', 'Open Chrome net-internals', 'tabOpenLink("chrome://net-internals/#proxy")');
mapkey('gs', 'View page source', 'RUNTIME("viewSource", { tab: { tabbed: true }})');
mapkey('gu', 'Go up one path in the URL', function() {
    var url = location.href;
    if (location.pathname.length > 1) {
        url = url.endsWith('/') ? url.substr(0, url.length - 1) : url;
        url = url.substr(0, url.lastIndexOf('/'));
    }
    window.location.href = url;
});

mapkey('gU', 'Go to root of current URL hierarchy', 'window.location.href = window.location.origin');
mapkey('se', 'Edit Settings', 'RUNTIME("editSettings", { tab: { tabbed: true }})');
mapkey('sr', 'Reset Settings', 'Normal.resetSettings()');
mapkey('si', 'Open Chrome Inpect', 'tabOpenLink("chrome://inspect/#devices")');
mapkey(';q', 'Insert jquery library on current page', 'Normal.insertJS("//ajax.aspnetcdn.com/ajax/jQuery/jquery-2.1.4.min.js")');

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
