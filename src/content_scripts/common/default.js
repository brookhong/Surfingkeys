module.exports = function(api) {
    const {
        addSearchAlias,
        cmap,
        getBrowserName,
        getFormData,
        map,
        mapkey,
        readText,
        tabOpenLink,
        vmapkey,
        Clipboard,
        Hints,
        Front,
        RUNTIME
    } = api;

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
        Hints.create("", (element, event) => {
            if (chrome.surfingkeys) {
                const r = element.getClientRects()[0];
                chrome.surfingkeys.sendMouseEvent(2, Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2));
            } else {
                Hints.dispatchMouseClick(element, event);
            }
        }, {mouseEvents: ["mouseover"]});
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

    map('<Ctrl-i>', 'I');
    cmap('<ArrowDown>', '<Tab>');
    cmap('<ArrowUp>', '<Shift-Tab>');
    cmap('<Ctrl-n>', '<Tab>');
    cmap('<Ctrl-p>', '<Shift-Tab>');
    mapkey('q', '#1Click on an Image or a button', function() {
        Hints.create("img, button", Hints.dispatchMouseClick);
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
                tab = response.tabs[0]
                RUNTIME('focusTab', {
                    windowId: tab.windowId,
                    tabId: tab.id
                });
            }
        })
    }, { repeatIgnore: true });
    mapkey('S', '#4Go back in history', function() {
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
        Front.openOmnibar({type: "TabURLs"});
    });
    mapkey('om', '#8Open URL from vim-like marks', function() {
        Front.openOmnibar({type: "VIMarks"});
    });
    mapkey(':', '#8Open commands', function() {
        Front.openOmnibar({type: "Commands"});
    });
    mapkey('yi', '#7Yank text of an input', function() {
        Hints.create("input, textarea, select", function(element) {
            Clipboard.write(element.value);
        });
    });
    mapkey('x', '#3Close current tab', function() {
        RUNTIME("closeTab");
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
    mapkey('yt', '#3Duplicate current tab', function() {
        RUNTIME("duplicateTab");
    });
    mapkey('yT', '#3Duplicate current tab in background', function() {
        RUNTIME("duplicateTab", {active: false});
    });
    mapkey('yy', "#7Copy current page's URL", function() {
        var url = window.location.href;
        if (url.indexOf(chrome.extension.getURL("/pages/pdf_viewer.html")) === 0) {
            url = window.location.search.substr(3);
        }
        Clipboard.write(url);
    });
    mapkey('yY', "#7Copy all tabs's url", function() {
        RUNTIME('getTabs', null, function (response) {
            Clipboard.write([window.location.href].concat(response.tabs.map(tab => tab.url)).join('\n'));
        });
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
    mapkey('yp', '#7Copy form data for POST on current page', function() {
        var aa = [];
        document.querySelectorAll('form').forEach(function(form) {
            var fd = {};
            fd[(form.method || "get") + "::" + form.action] = getFormData(form);
            aa.push(fd);
        });
        Clipboard.write(JSON.stringify(aa, null, 4));
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
    mapkey('gxp', '#3Close playing tab', function() {
        RUNTIME("closeAudibleTab");
    });
    mapkey(';e', '#11Edit Settings', function() {
        tabOpenLink("/pages/options.html");
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

    addSearchAlias('g', 'google', 'https://www.google.com/search?q=', 's', 'https://www.google.com/complete/search?client=chrome-omni&gs_ri=chrome-ext&oit=1&cp=1&pgcl=7&q=', function(response) {
        var res = JSON.parse(response.text);
        return res[1];
    });
    addSearchAlias('d', 'duckduckgo', 'https://duckduckgo.com/?q=', 's', 'https://duckduckgo.com/ac/?q=', function(response) {
        var res = JSON.parse(response.text);
        return res.map(function(r){
            return r.phrase;
        });
    });
    addSearchAlias('b', 'baidu', 'https://www.baidu.com/s?wd=', 's', 'https://suggestion.baidu.com/su?cb=&wd=', function(response) {
        var res = response.text.match(/,s:\[("[^\]]+")]}/);
        return res ? res[1].replace(/"/g, '').split(",") : [];
    });
    addSearchAlias('e', 'wikipedia', 'https://en.wikipedia.org/wiki/', 's', 'https://en.wikipedia.org/w/api.php?action=opensearch&format=json&formatversion=2&namespace=0&limit=40&search=', function(response) {
        return JSON.parse(response.text)[1];
    });
    addSearchAlias('w', 'bing', 'https://www.bing.com/search?setmkt=en-us&setlang=en-us&q=', 's', 'https://api.bing.com/osjson.aspx?query=', function(response) {
        var res = JSON.parse(response.text);
        return res[1];
    });
    addSearchAlias('s', 'stackoverflow', 'https://stackoverflow.com/search?q=');
    addSearchAlias('h', 'github', 'https://github.com/search?q=', 's', 'https://api.github.com/search/repositories?order=desc&q=', function(response) {
        var res = JSON.parse(response.text)['items'];
        return res ? res.map(function(r){
            return {
                title: r.description,
                url: r.html_url
            };
        }) : [];
    });
    addSearchAlias('y', 'youtube', 'https://www.youtube.com/results?search_query=', 's',
    'https://clients1.google.com/complete/search?client=youtube&ds=yt&callback=cb&q=', function(response) {
        var res = JSON.parse(response.text.substr(9, response.text.length-10));
        return res[1].map(function(d) {
            return d[0];
        });
    });

    const browser = getBrowserName();
    if (browser === "Firefox") {
        mapkey('on', '#3Open newtab', function() {
            tabOpenLink("about:blank");
        });
    } else if (browser === "Chrome") {
        mapkey('cp', '#13Toggle proxy for current site', function() {
            var host = window.location.host.replace(/:\d+/,'');
            if (host && host.length) {
                RUNTIME('updateProxy', {
                    host: host,
                    operation: "toggle"
                });
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
            tabOpenLink("chrome://settings/cookies");
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
        mapkey(';v', '#11Open neovim', function() {
            tabOpenLink("/pages/neovim.html");
        });
        mapkey('<Ctrl-Alt-i>', '#1Go to edit box with neo vim editor', function() {
            Hints.create("input, textarea, *[contenteditable=true], select", function(element) {
                Front.showEditor(element, null, null, true);
            });
        });
    }

    if (!getBrowserName().startsWith("Safari")) {
        mapkey('t', '#8Open a URL', function() {
            Front.openOmnibar({type: "URLs"});
        });
        mapkey('go', '#8Open a URL in current tab', function() {
            Front.openOmnibar({type: "URLs", tabbed: false});
        });
        mapkey('ox', '#8Open recently closed URL', function() {
            Front.openOmnibar({type: "RecentlyClosed"});
        });
        mapkey('X', '#3Restore closed tab', function() {
            RUNTIME("openLast");
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
        mapkey('W', '#3Move current tab to another window',  function() {
            Front.openOmnibar(({type: "Windows"}));
        });
        mapkey(';gt', '#3Gather filtered tabs into current window', function() {
            Front.openOmnibar({type: "Tabs", extra: {
                action: "gather"
            }});
        });
        mapkey(';gw', '#3Gather all tabs into current window',  function() {
            RUNTIME("gatherWindows");
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
        mapkey('gs', '#12View page source', function() {
            RUNTIME("viewSource", { tab: { tabbed: true }});
        });
        mapkey(';pm', '#11Preview markdown', function() {
            tabOpenLink("/pages/markdown.html");
        });
        mapkey(';di', '#1Download image', function() {
            Hints.create('img', function(element) {
                RUNTIME('download', {
                    url: element.src
                });
            });
        });
        mapkey(';j', '#12Close Downloads Shelf', function() {
            RUNTIME("closeDownloadsShelf", {clearHistory: true});
        });
        mapkey(';dh', '#14Delete history older than 30 days', function() {
            RUNTIME('deleteHistoryOlderThan', {
                days: 30
            });
        });
        mapkey(';yh', '#14Yank histories', function() {
            RUNTIME('getHistory', {}, function(response) {
                Clipboard.write(response.history.map(h => h.url).join("\n"));
            });
        });
        mapkey(';ph', '#14Put histories from clipboard', function() {
            Clipboard.read(function(response) {
                RUNTIME('addHistories', {history: response.data.split("\n")});
            });
        });
        mapkey(';db', '#14Remove bookmark for current page', function() {
            RUNTIME('removeBookmark');
        });
    }
}
