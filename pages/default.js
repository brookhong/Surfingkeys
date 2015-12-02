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
Hints.pointers = "a, button, *:visible:css(cursor=pointer), select:visible, input:visible, textarea:visible:not([surfingkeys])";
mapkey('f', 'Open a link', 'Hints.create(Hints.pointers, Hints.dispatchMouseClick)');
mapkey('F', 'Open a link in new tab', 'Hints.create(Hints.pointers, Hints.dispatchMouseClick, {tabbed: true})');
mapkey('gf', 'Open a link in non-active new tab', 'Hints.create(Hints.pointers, Hints.dispatchMouseClick, {tabbed: true, active: false})');
mapkey('i', 'Go to edit box', 'Hints.create("input:visible, textarea:visible:not([surfingkeys])", Hints.dispatchMouseClick)');
mapkey('q', 'Click on an Image or a button', 'Hints.create("img, button", Hints.dispatchMouseClick)');
mapkey('E', 'Go one tab left', 'RUNTIME("previousTab")');
mapkey('R', 'Go one tab right', 'RUNTIME("nextTab")');
mapkey('B', 'Go one tab history back', 'RUNTIME("historyTab", {backward: true})');
mapkey('gF', 'Go one tab history forward', 'RUNTIME("historyTab", {backward: false})');
mapkey('S', 'Go back in history', 'history.go(-1)');
mapkey('D', 'Go forward in history', 'history.go(1)');
mapkey('r', 'Reload the page', 'RUNTIME("reloadTab", { nocache: false })');
mapkey('t', 'Open an URLs', 'Normal.openOmnibar(OpenURLs)');
mapkey('b', 'Open a bookmark', 'Normal.openOmnibar(OpenBookmarks)');
mapkey('oh', 'Open URL from history', 'Normal.openOmnibar(OpenHistory)');
mapkey('om', 'Open URL from vim-like marks', 'Normal.openOmnibar(OpenVIMarks)');
mapkey(':', 'Open commands', 'Normal.openOmnibar(Commands)');
command('quit', 'quit chrome', function() {
    RUNTIME('quit');
});
command('listSession', 'list session', function() {
    portRequest({
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
mapkey('/', 'Find in current page', 'Find.open()');
mapkey('*', 'Find selected text in current page', function() {
    Visual.star();
    Visual.toggle();
});
mapkey('x', 'Close current tab', 'RUNTIME("closeTab")');
mapkey('X', 'Restore closed tab', 'RUNTIME("openLast")');
mapkey('m', 'Add current URL to vim-like marks', Normal.addVIMark, 1);
mapkey("'", 'Jump to vim-like mark', Normal.jumpVIMark, 1);
mapkey('n', 'Next found text', 'Find.next(false)');
mapkey('N', 'Previous found text', 'Find.next(true)');
mapkey('w', 'Switch frames', 'Normal.rotateFrame()');
mapkey('p', 'Open selected link or link from clipboard', 'tabOpenLink(window.getSelection().toString() || Normal.getContentFromClipboard())');
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
    $(aa).find('div.surfingkeys_css_reset').remove();
    Normal.writeClipboard(aa.outerHTML);
});
mapkey('yt', 'Duplicate current tab', 'RUNTIME("duplicateTab")');
mapkey('yf', "Copy current page's URL", 'Normal.writeClipboard(window.location.href)');
mapkey('yl', "Copy current page's title", 'Normal.writeClipboard(document.title)');
mapkey('ob', 'Open Search with alias b', 'Normal.openOmnibar(SearchEngine, "b")');
mapkey('og', 'Open Search with alias g', 'Normal.openOmnibar(SearchEngine, "g")');
mapkey('ow', 'Open Search with alias w', 'Normal.openOmnibar(SearchEngine, "w")');
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
mapkey('gu', 'Go up one path in the URL', 'window.location.href = getParentURL()');
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
