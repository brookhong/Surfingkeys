# Surfingkeys - Expand your browser with javascript and keyboard.

Surfingkeys is another Chrome extension that provides keyboard-based navigation and control of the web in the spirit of the VIM editor. But it's not for VIM users only, it's for anyone who just needs some more shortcuts to his own functions.

There are several Chrome extensions that provides similar functionalities. I used [philc/vimium](https://github.com/philc/vimium) for almost one year, then I switched to [1995eaton/chromium-vim](https://github.com/1995eaton/chromium-vim) for half a year.

Both are great extensions. What makes me create another wheel, is that I found so many changes that need to be done when I tried to add some functionalities to meet my own requirements. For example, some functions that I originally used some other extensions for,

* Search selected text with different kinds for search engine
* Double click on a word to get translation

Surfingkeys is created with all settings described in Javascript, so it's easy for anyone to map any keystrokes to his own defined Javascript function. For example,

    mapkey('<Ctrl-y>', 'Show me the money', function() {
        Normal.showPopup('a well-known phrase uttered by characters in the 1996 film Jerry Maguire (Escape to close).');
    });

[Reference for editing your own settings](#edit-your-own-settings).

## Which features make Surfingkeys more usable for me than others?
* All settings are set up within a javascript file, which makes it easy to create mapping to user customized function.
* A large cursor in visual mode, which makes visual mode better.
* My favorite feature -- search selected with, which works in both normal mode and visual mode.
* Help messages are automatically generated for mappings.
* `*` to search word under cursor in visual mode.
* Scroll actions like page up/down (`e` `d`) work for not only top window but also scrollable DIV.
* `w` to switch frames if there is.
* session management

## Quick start

After you install the extension from [Chrome Web Store](https://chrome.google.com/webstore/detail/surfingkeys/gfbliohnnapiefjpjlpjnehglfpaknnc), open a site you'd like. Then press `u` or `Ctrl-i` to take a quick look on the default mappings first. Press `Esc` to hide the usage popover.

Try some mappings described in the usage popover. For example, press `e` to scroll a page up, `d` to scroll a page down, `se` to open settings page.

* `u` to show help
![help](https://cloud.githubusercontent.com/assets/288207/10328829/d3db179a-6ceb-11e5-8faf-73761584eeee.png)
* `b` to browse/search bookmarks
![bookmark](https://cloud.githubusercontent.com/assets/288207/10328828/d3ac1fd0-6ceb-11e5-8e9c-7c0d35a195a1.png)
* `/` to find in current page
![find](https://cloud.githubusercontent.com/assets/288207/10328836/e4fa4960-6ceb-11e5-80bb-4339ef0db0c5.png)
* `f` to follow links
![follow](https://cloud.githubusercontent.com/assets/288207/10328833/e32d85a2-6ceb-11e5-8614-3f8a804cb2f2.png)
* `v` to toggle visual mode
![visual](https://cloud.githubusercontent.com/assets/288207/10328835/e4df6c6c-6ceb-11e5-8ed7-17fd29070207.png)
* `T` to switch tabs
![tabs](https://cloud.githubusercontent.com/assets/288207/10328839/f0143ffe-6ceb-11e5-8eee-962db94b2c22.png)

## Surfingkeys modes

Surfingkeys now have only two modes.

### Normal mode, the default mode.

All mappings added with `mapkey` works in this mode.

### Visual mode, the mode for text selection, and actions on the selected text.

All mappings added with `vmapkey` works in this mode, with some built-in mappings like those in VIM - `j` `k` `h` `l` `b` `w``0` `$` etc.

Press `v` to toggle visual mode. You'll see an indicator at bottom of current page - `Caret` or `Range`, and a large cursor on page. The cursor is made large for visibility, as sometimes it's not easy for human to locate a normal cursor on a web page.

`Caret` indicates that cursor is moved when you press jkhl, `Range` indicates that you'll select text when moving cursor.

Now here is a small practice,

1. press `v` you'll see `Caret`
1. use the VIM key bindings to move cursor to some where.
1. press `v` again, you'll see `Range`.
1. use the VIM key bindings to select some text.
1. press `sg` to see what will happen.
1. press `v` again to back to normal mode.

### Find

`Find` is not actually a mode, it just another way to enter visual mode. Press `/` to open find bar, which sits at almost the same position with Mode indicator, type something there. All occurrences of your input will be highlighted. Press `Enter` to finish the finding, and you're in `Caret` visual mode now, press `n` to find next, `N` to find previous.

## Search selected with

My favorite feature from when I was using Firefox. For both Firefox and Chrome, the extensions make it through context menu. Surfingkeys makes it through key mappings. By default, when you press `sg` in normal mode, it will search selected text with google, if there is none selected, it will search text from system clipboard with google. In visual mode, it will search selected text with google.

The `g` in `sg` is a search alias for google, there are some other built-in search aliases -- like `w` for bing. So press `sw` to search selected with bing. Refer to [Add search alias to omnibar](#add-search-alias-to-omnibar) to add your own search alias, especially those search engines for company inside.

Besides that, there is a `sog`, to search selected text only in this site with google. For `sog`, `s` is the search_leader_key, `o` is the only_this_site_key, `g` is the search alias.

## Vim-like marks

You can create vim-like marks by pressing `m`, followed by a word character(0-9, A-Z, a-z), used as mark name. For example, if you press `ma` on this page, you'll create a mark named `a` which points to this page. Then pressing `'a` anywhere, you'll jump to this page.

In this way, the created mark always points to current URL. You can also create vim-like marks from the bookmarks. Try following steps:

1. press `b` to open bookmarks.
1. type something to locate the URL you'd like to create vim-like mark for.
1. press Ctrl, plus a mark name, such as `f`.

Then afterwards `'f` will open that URL directly.

This is very useful for those pages you access very frequently. `om` to check out all the vim-like marks you have created.

## Switch tabs

By default, pressing `T` will show all opened tabs in an overlay, then pressing the hint char, will switch to the related tab.

![tabs_overlay](https://cloud.githubusercontent.com/assets/288207/10544636/245447f6-7457-11e5-8372-62b8f6337158.png)

There is `settings.tabsThreshold` here. When total of opened tabs exceeds `settings.tabsThreshold`(default as 9), omnibar will be used for choosing tabs.

![tabs_omnibar](https://cloud.githubusercontent.com/assets/288207/10544630/1fbdd02c-7457-11e5-823c-14411311c315.png)

If you prefer to use omnibar always, use below mapping:

    mapkey(' ', 'Choose a tab with omnibar', 'Normal.openOmnibar(OpenTabs)');

which works same as:

    settings.tabsThreshold = 0;

The tabs are displayed in MRU order by default, either in omnibar or overlay. If you want them in natural order, use:

    settings.tabsMRUOrder = false;

## Commands

`:` to open omnibar for commands, then you can execute any pre-defined or customized command there. The result will be displayed below the omnibar. To create your own command as below:

    command('<command_name>', '<help message for this command>', function() {
        // to do
    });

For example,

    command('setProxyMode', 'setProxyMode <always|direct|byhost>', function(mode) {
        RUNTIME('updateProxy', {
            mode: mode
        });
        return true;
    });

    // create shortcuts for the command with different parameters
    map('spa', ':setProxyMode always');
    map('spb', ':setProxyMode byhost');
    map('spd', ':setProxyMode direct');

Besides commands, you can also run javascript code.

![commands_in_omnibar](https://cloud.githubusercontent.com/assets/288207/11527801/fadee82c-991d-11e5-92e9-b054796a6a75.png)

## Smooth scroll

Smooth scroll works for any scrollable element. It is on by defualt, to turn it off as below:

    settings.smoothScroll = false;

## Session management

To create session in Chrome with Surfingkeys will save URLs for all tabs, and to open a session will open all the URLs of the session in different tab, so basically a session is a list of URLs, which has a name.

* `ZZ` will save all current tabs into a session named `LAST` then quit.
* `ZR` will restore the session named `LAST`.
* `ZQ` will just quit.

You can create multiple sessions with different names in command mode. Press `:` to open omnibar for commands, then input:

    createSession works

Surfingkeys will create a session named `works` for you, to open the session with command input as:

    openSession works

To list all your saved sessions:

    listSession

To delete a session:

    deleteSession works

## Repeats action by pressing number before mapkey

If you need repeat some action several times, just press a number before mapkey, such as `3d`, which will scroll down 3 pages. Repeats also works for Tab navigation, for example, you're now on the 1st Tab, and you want to switch to the 4th Tab,

* press `3R` to achieve that
* `3E` will switch back to 1st Tab.

Another example to move one Tab, say, you're on the 12th Tab of 23 tabs.

* `11<<` will move current tab to beginning.
* `10>>` will move current tab to end.

Usually, you need not count the number, you just prefix a large number such as `99<<`, if you want to move a tab to beginning or end.

## Hotkey to toggle Surfingkeys

By default, `alt-s` will toggle Surfingkeys for current page. When Surfingkeys is turned off, all mappings stop working except the hotkey. To change hotkey, use settings below:

    Events.hotKey = 'i'; // hotkey must be one keystroke with/without modifier, it can not be a sequence of keystrokes like `gg`.

## Proxy settings

SwitchySharp is a great extension to switch proxy, but my use case with it is very simple,

1. create a profile using PAC script.
1. maintain site list in the PAC script, use proxy if the site being accessed is in the list.
1. whenever I come into a site blocked by something, I add it to the list in PAC script.
1. click the SwitchySharp icon to reload the profile.
1. casually I click the SwitchySharp icon to switch profile between `direct` and `pac_script`.

To avoid manually editing PAC script and reloading/switching profile by clicking SwitchySharp icon, I replaced SwitchySharp by integrating proxy settings into Surfingkeys, and provides related commands and shortcuts.

* setProxy, to set proxy, some examples:

        setProxy 192.168.1.100:8080
        setProxy 127.0.0.1:1080 SOCKS5

* setProxyMode, to set proxy mode, there are three modes: direct, byhost, always

        direct      Chrome will connect to all sites directly.
        byhost      Chrome will only connect to sites added by `addProxySite` through proxy.
        always      Chrome will connect to all sites through proxy.
        system      Use proxy configuration taken from the operating system.
        clear       Surfingkeys will take on control of proxy settings, this is the default mode.

* addProxySite, removeProxySite, toggleProxySite, to make Chrome connect to site through proxy or not, examples:

        addProxySite google.com,facebook.com,twitter.com

* proxyInfo, to list proxy you set by `setProxy`, proxy mode you set by `setProxyMode` and sites you add/remove by `addProxySite`/`removeProxySite`/`toggleProxySite`.

* `cp`, toggle proxy for current site.

* `spa`, shortcut for `:setProxyMode always`

* `spb`, shortcut for `:setProxyMode byhost`

* `spd`, shortcut for `:setProxyMode direct`

* `spi`, shortcut for `:proxyInfo`

## Edit your own settings

### Map a keystroke to some action

    mapkey(keystroke, help_string, action_code, [expect_char], [domain_pattern])

| parameter  | explanation |
|:---------------| :-----|
|**keystroke**                   | string, any keystroke to trigger the action|
|**help_string**                 | string, a help message to describe the action, which will displayed in help opened by `u`.|
|**action_code**                 | string or function, action code can be a snippet of Javascript code or a Javascript function.|
|**expect_char**                 | boolean[optional], whether the next key input is used as parameter of action_code, please see `m` or `'` for example.|
|**domain_pattern**              | regex[optional], a Javascript regex pattern to identify the domains that this mapping works, for example, `/github\.com/i` says that this mapping works only for github.com.|

Just an example to map one keystroke to different functions on different sites,

    mapkey('zz', 'Choose a tab', 'Normal.chooseTab()', 0, /github\.com/i);
    mapkey('zz', 'Show usage', 'Normal.showUsage()', 0, /google\.com/i);

mapkey in visual mode

    vmapkey(keystroke, help_string, action_code, [expect_char], [domain_pattern])

### map a keystroke to another

    map(new_keystroke, old_keystroke, [domain_pattern], [new_annotation])

| parameter  | explanation |
|:---------------| :-----|
|**new_keystroke**               | string, the new keystroke that will be used.|
|**old_keystroke**               | string, the existing keystroke that will be replaced, which means pressing it will not trigger any action.|
|**domain_pattern**              | regex[optional], a Javascript regex pattern to identify the domains that this mapping works.|
|**new_annotation**              | string[optional], use it instead of the annotation from old_keystroke if provided.|

### remove a keystroke mapping

    unmap(keystroke, [domain_pattern])

| parameter  | explanation |
|:---------------| :-----|
|**keystroke**                   | string, the existing keystroke that will be removed.|
|**domain_pattern**              | regex[optional], a Javascript regex pattern to identify the domains that this settings works.|


### Add search alias to omnibar

    addSearchAlias(alias, prompt, search_url, suggestion_url, callback_to_parse_suggestion);

| parameter  | explanation |
|:---------------| :-----|
|**alias**                                   | one or several chars, used as search alias. When you input the string and press `space` in omnibar, it will switch to the related search engine.|
|**prompt**                                  | a string to tell you which search engine will be used for following search|
|**search_url**                              | the URL for the search engine|
|**suggestion_url[optional]**                | omnibar will list out search suggestions from the engine, if you provide suggestion_url and callback_to_parse_suggestion|
|**callback_to_parse_suggestion[optional]**  | works with suggestion_url to provide search suggestion|

    addSearchAliasX(alias, prompt, search_url, search_leader_key, suggestion_url, callback_to_parse_suggestion, only_this_site_key);

| parameter  | explanation |
|:---------------| :-----|
|**search_leader_key**                                   | one or several chars, used as search leader key, in case of that you would not like to use the default key `s`.|
|**only_this_site_key**                                  | one or several chars, used as only-this-site-key, in case of that you would not like to use the default key `o`.|

This version will create a mapping to search selected text with `search_url` on pressing `search_leader_key` followed by `alias`, except that it adds search alias to omnibar as the normal version. For example, below line

    addSearchAliasX('s', 'stackoverflow', 'http://stackoverflow.com/search?q=', 'o');

works like

    addSearchAlias('s', 'stackoverflow', 'http://stackoverflow.com/search?q=');
    mapkey('os', 'Search Selected with stackoverflow',  'searchSelectedWith("http://stackoverflow.com/search?q=")');
    vmapkey('os', 'Search Selected with stackoverflow',  'searchSelectedWith("http://stackoverflow.com/search?q=")');

### Omnibar helpers

    Omnibar.listWords(<array of words>)
    Omnibar.html(<any html snippets>)

## License

MIT License
