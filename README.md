# Surfingkeys - Expand your browser with javascript and keyboard.

Surfingkeys is another Chrome extension that provides keyboard-based navigation and control of the web in the spirit of the VIM editor. But it's not for VIM users only, it's for anyone who just needs some more shortcuts to his own functions.

Surfingkeys is created with all settings described in Javascript, so it's easy for anyone to map any keystrokes to his own defined Javascript function. For example,

    mapkey('<Ctrl-y>', 'Show me the money', function() {
        Front.showPopup('a well-known phrase uttered by characters in the 1996 film Jerry Maguire (Escape to close).');
    });

[Reference for editing your own settings](#edit-your-own-settings).

### TABLE OF CONTENTS

* [Feature list](#feature-list)
* [Quick start](#quick-start)
* [Follow links](#follow-links)
* [Surfingkeys modes](#surfingkeys-modes)
* [Omnibar](#omnibar)
* [Search selected with](#search-selected-with)
* [Vim-like marks](#vim-like-marks)
* [Switch tabs](#switch-tabs)
* [Commands](#commands)
* [Smooth scroll](#smooth-scroll)
* [Session management](#session-management)
* [Repeats action by pressing number before mapkey](#repeats-action-by-pressing-number-before-mapkey)
* [Hotkey to toggle Surfingkeys](#hotkey-to-toggle-surfingkeys)
* [Proxy settings](#proxy-settings)
* [VIM editor](#vim-editor)
* [Dot to repeat previous action](#dot-to-repeat-previous-action)
* [Markdown preview](#markdown-preview)
* [Edit your own settings](#edit-your-own-settings)
* [Build](#build)
* [License](#license)

## Feature list
* All settings are set up within a javascript file, which makes it easy to create mapping to user customized function.
* A large cursor in visual mode, which makes visual mode better.
* Search selected with, which works in both normal mode and visual mode.
* Help messages are automatically generated for mappings.
* `*` to search word under cursor in visual mode.
* Scroll actions like page up/down (`e` `d`) work for not only top window but also scrollable DIV.
* `w` to switch frames if there is.
* Session management
* A versatile bookmark/url finder
* Count prefixes to repeat actions
* Use vim editor to edit input on page
* Dot to repeat previous action
* `sm` to preview markdown

## Quick start

After you install the extension from [Chrome Web Store](https://chrome.google.com/webstore/detail/surfingkeys/gfbliohnnapiefjpjlpjnehglfpaknnc), open a site you'd like. Then press `?` or `u` to take a quick look on the default mappings first. Press `Esc` to hide the usage popover.

Try some mappings described in the usage popover. For example, press `e` to scroll a page up, `d` to scroll a page down, `se` to open settings page.

* `?` to show help
![help](https://cloud.githubusercontent.com/assets/288207/16181995/1417ca44-36d4-11e6-96c9-9e84b33f0916.png)
* `t` to search bookmarks/history
![urls](https://cloud.githubusercontent.com/assets/288207/16182031/58e15ec4-36d4-11e6-9cc5-ff35970df25f.png)
* `/` to find in current page
![find](https://cloud.githubusercontent.com/assets/288207/16182044/65f4713c-36d4-11e6-9e21-6b61a858f080.png)
* `f` to follow links
![follow](https://cloud.githubusercontent.com/assets/288207/16182118/18d27678-36d5-11e6-9759-d8b5ff49930c.png)
* `v` to toggle visual mode
![visual](https://cloud.githubusercontent.com/assets/288207/16182120/1cc536da-36d5-11e6-9e08-293cdb8fbcd2.png)
* `T` to switch tabs
![tabs](https://cloud.githubusercontent.com/assets/288207/10328839/f0143ffe-6ceb-11e5-8eee-962db94b2c22.png)

## Follow links

Default hint characters for links are `asdfgqwertzxcvb`, it quits when a non-hint key is pressed. Add below line to your settings to make it right hand:

    Hints.characters = 'yuiophjklnm'; // for right hand

When hints are overlapped, press `Shift` to flip them. Hold `space` to hold hints temporarily, release `space` to restore hints.

Hints are placed in center of target links, you could add below line in your settings to let them aligned left.

    settings.hintAlign = "left";

## Surfingkeys modes

There are three modes in Surfingkeys: normal, visual and insert.

### Normal mode, the default mode.

When you open a page, it enters normal mode automatically. All mappings added with `mapkey` work in this mode.

### Visual mode, the mode for text selection, and actions on the selected text.

Press `v` to toggle visual mode. You'll see an indicator at bottom of current page - `Caret` or `Range`, and a large cursor on page. The cursor is made large for visibility, as sometimes it's not easy for human to locate a normal cursor on a web page.

`Caret` indicates that cursor is moved when you press jkhl, `Range` indicates that you'll select text when moving cursor.

Now here is a small practice,

1. press `v` you'll see `Caret`
1. use the VIM key bindings to move cursor to some where.
1. press `v` again, you'll see `Range`.
1. use the VIM key bindings to select some text.
1. press `sg` to see what will happen.
1. press `v` again to back to normal mode.

All mappings added with `vmapkey` work in this mode, with some built-in mappings like those in VIM - `j` `k` `h` `l` `b` `w``0` `$` etc.

![search_selected](https://cloud.githubusercontent.com/assets/288207/17644215/759f1e70-61b3-11e6-8bf8-0bdff7d0c933.gif)

* `zz` make cursor at center of window.
* `f` forward to next char.
* `F` backward to next char.
* `;` repeat latest f, F.
* `,` repeat latest f, F in opposite direction.

### Insert mode

When focus is switched into any editable element by whatever means(`i` hints or `f` hints or mouse click), Insert mode is on.

All mappings added with `imapkey` work in this mode.

* `Ctrl - i` to open vim editor to edit.
* `Ctrl - '` to toggle quotes in an input element, this is useful for search engines like google.
* `Ctrl-e` move the cursor to the end of the line.
* `Ctrl-f` move the cursor to the beginning of the line.
* `Ctrl-u` delete all entered characters before the cursor.
* `Alt-b` move the cursor Backward 1 word.
* `Alt-f` move the cursor Forward 1 word.
* `Alt-w` delete a word backwards.
* `Alt-d` delete a word forwards.

`imap` and `iunmap` for insert mode.

    imap(',,', "<Esc>");        // press comma twice to leave current input box.
    imap(';;', "<Ctrl-'>");     // press semicolon twice to toggle quote.

### Find

`Find` is not actually a mode, it just another way to enter visual mode. Press `/` to open find bar, which sits at almost the same position with Mode indicator, type something there. All occurrences of your input will be highlighted. Press `Enter` to finish the finding, and you're in `Caret` visual mode now, press `n` to find next, `N` to find previous.

## Omnibar

The omnibar provides kinds of functions that need user input, for example,

* Open url(from both bookmarks and history) with `t`
* Open bookmarks with `b`
* Open search engines with `og` / `ow` ...
* Open commands with `:`

### key bindings in Omnibar
* `Enter` to open selected item and close omnibar.
* `Ctrl-Enter` to open selected item, but keep omnibar open for more items to be opened.
* `Shift-Enter` to open selected item in current tab and close omnibar. If you'd like to open in current tab by default, please use `go`.
* `Tab` to forward cycle through the candidates.
* `Shift-Tab` to backward cycle through the candidates.

In omnibar opened with `t`:

`Ctrl - d` to delete from bookmark or history

In omnibar opened with `b`:

`Ctrl - Shift - <any letter>` to create vim-like global mark

![search_engine](https://cloud.githubusercontent.com/assets/288207/17644214/759ef1d4-61b3-11e6-9bd9-70c38c8b80e0.gif)

## Search selected with

My favorite feature from when I was using Firefox. For both Firefox and Chrome, the extensions make it through context menu. Surfingkeys makes it through key mappings. By default, when you press `sg` in normal mode, it will search selected text with google, if there is none selected, it will search text from system clipboard with google. In visual mode, it will search selected text with google.

The `g` in `sg` is a search alias for google, there are some other built-in search aliases -- like `w` for bing. So press `sw` to search selected with bing. Refer to [Add search alias to omnibar](#add-search-alias-to-omnibar) to add your own search alias, especially those search engines for company inside.

Besides that, there is a `sog`, to search selected text only in this site with google. For `sog`, `s` is the search_leader_key, `o` is the only_this_site_key, `g` is the search alias.

The search_leader_key `s` plus captial alias `G` will search selected with google interactively, all other search aliases and those you added through API `addSearchAliasX` work in same way.

## Vim-like marks

You can create vim-like marks by pressing `m`, followed by a word character(a-z for local marks, others like 0-9 / A-Z for global marks), used as mark name. For example, if you press `ma` on this page, you'll create a mark named `a` which points to this page. Then pressing `'a` anywhere, you'll jump to this page.

In this way, the created mark always points to current URL. You can also create vim-like marks from the bookmarks. Try following steps:

1. press `b` to open bookmarks.
1. type something to locate the URL you'd like to create vim-like mark for.
1. press Ctrl, plus a mark name, such as `f`.

Then afterwards `'F` will open that URL directly.

This is very useful for those pages you access very frequently. `om` to check out all the vim-like marks you have created.

## Switch tabs

By default, pressing `T` will show all opened tabs in an overlay, then pressing the hint char, will switch to the related tab.

![tabs_overlay](https://cloud.githubusercontent.com/assets/288207/10544636/245447f6-7457-11e5-8372-62b8f6337158.png)

There is `settings.tabsThreshold` here. When total of opened tabs exceeds `settings.tabsThreshold`(default as 9), omnibar will be used for choosing tabs.

![tabs_omnibar](https://cloud.githubusercontent.com/assets/288207/10544630/1fbdd02c-7457-11e5-823c-14411311c315.png)

If you prefer to use omnibar always, use below mapping:

    mapkey(' ', 'Choose a tab with omnibar', 'Front.openOmnibar(OpenTabs)');

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

    command('setProxyMode', 'setProxyMode <always|direct|byhost>', function(args) {
        // args is an array of arguments
        RUNTIME('updateProxy', {
            mode: args[0]
        });
        // return true to close Omnibar for Commands, false to keep Omnibar on
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

`j`/`k` scrolls in one step with size as 70, you could change it as below:

    settings.scrollStepSize = 140;

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

By default, `Alt-s` will toggle Surfingkeys for current site. When Surfingkeys is turned off, all mappings stop working except the hotkey. To change hotkey, use settings below:

    map('<Ctrl-i>', '<Alt-s>'); // hotkey must be one keystroke with/without modifier, it can not be a sequence of keystrokes like `gg`.

When Surfingkeys is turned off on some site by `Alt-s`, the status will be persisted in settings, for example,

    "blacklist": {
        "https://github.com": 1
    },

`Alt-s` once more will remove it from settings.blacklist. The data settings are not always presented in snippets, you could use `yj` to dump all settings into clipboard, then paste it in your text editor to check out.

Another way to disable Surfingkeys is to use `settings.blacklistPattern`, please refer to [regex for disabling](https://github.com/brookhong/Surfingkeys/issues/63).

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

## VIM editor

Thanks ACE for the vim editor, Surfingkeys integrates ACE for the vim editor. The vim editor is used:

* to edit any input on html page
* to edit URL to open in new tab
* to edit settings

### Edit any input on html page

In normal mode, press capital `I`, then use a hint letter to pick up a input box. A vim editor is opened for you to edit text. The vim editor is opened in slightly different way for `<input>`, `<textarea>`, and `<select>` elements.

For `<input>` elements, the vim editor has only one line, and you use vim key bindings to edit your text. Then press `Enter` or `:w` to write your text back to the `<input>` element.

![input_with_vim](https://cloud.githubusercontent.com/assets/288207/17644219/75a72b2e-61b3-11e6-8ce2-06c9cc94aeca.gif)

For `<textarea>` elements, the vim editor is opened in bigger size. After you complete your edits, press `Ctrl-Enter` or `:w` to write your text back to the `<textarea>` element.

![textarea_with_vim](https://cloud.githubusercontent.com/assets/288207/17644217/75a27e44-61b3-11e6-8f21-9cd79d3c5776.gif)

For `<select>` elements, the vim editor is again opened in bigger size. Instead of editing the text, search for the desired option and jump to the line, then press `Enter` to select it. This is handy for `<select>` elements which have lots of options.

![select_with_vim](https://cloud.githubusercontent.com/assets/288207/17644218/75a458a4-61b3-11e6-8ce7-eedcc996745c.gif)

`Esc` or `:q` to quit vim editor without writing text back.

`Tab` completion works with all words on current page, `Space` to choose a match from popup.

If you enter insert mode with `i` or mouse click, you will edit your input in normal way. You could also open vim editor at that time by pressing `Ctrl-i`.

Remember that in insert mode, press `Ctrl-i` to open the vim editor.

### Edit URL to open in new tab

`su` to open vim editor to edit current URL, then `Enter` or `:w` to open the input URL, which works just like address bar with vim-binding keys.

`Tab` completion works with all URLs from bookmark/history, `Space` to choose a match from popup.

![url_with_vim](https://cloud.githubusercontent.com/assets/288207/17644220/75f8eedc-61b3-11e6-9630-da2250ac5f10.gif)

### Edit settings

`se` to open settings editor, `:w` to save settings.

## Dot to repeat previous action

[Repeating previous actions](https://github.com/brookhong/Surfingkeys/issues/67)

All keystrokes in normal mode are repeatable by dot, except those keystrokes mapped with `repeatIgnore` as `true`, for example,

    mapkey('e', '#2Scroll a page up', 'Normal.scroll("pageUp")', {repeatIgnore: true});

Then `.` will not repeat action to page up, even `e` is just pressed.

## Markdown preview

1. copy your markdown source into clipboard.
1. `sm` to open markdown preview, which will preview markdown from clipboard.
1. Then on the preview page, another `sm` will open vim editor to edit markdown source.
1. `:wp` to refresh preview.
1. `r` to reload markdown source from clipboard.

![markdown](https://cloud.githubusercontent.com/assets/288207/17669897/0b6fbaf6-6342-11e6-8583-86eb8691190d.gif)

By default, Surfingkeys uses this [markdown parser](https://github.com/chjj/marked) to preview markdown, if you'd like to use [github markdown API](https://developer.github.com/v3/markdown/) to parse your markdown, please add below line to your settings:

    settings.useLocalMarkdownAPI = false;

## Edit your own settings

### Map a keystroke to some action

    mapkey(keystroke, help_string, action_code, [options])

| parameter  | explanation |
|:---------------| :-----|
|**keystroke**                   | string, any keystroke to trigger the action|
|**help_string**                 | string, a help message to describe the action, which will displayed in help opened by `u`.|
|**action_code**                 | string or function, action code can be a snippet of Javascript code or a Javascript function. If the function needs an argument, next pressed key will be fed to the function.|
|**options**                     | object, properties listed below|
|**domain**                      | regex[optional], a Javascript regex pattern to identify the domains that this mapping works, for example, `/github\.com/i` says that this mapping works only for github.com.|
|**repeatIgnore**                | boolean[optional], whether this keystroke will be repeat by dot command.|

Just an example to map one keystroke to different functions on different sites,

    mapkey('zz', 'Choose a tab', 'Front.chooseTab()', {domain: /github\.com/i});
    mapkey('zz', 'Show usage', 'Front.showUsage()', {domain: /google\.com/i});

mapkey in visual mode

    vmapkey(keystroke, help_string, action_code, [options])

### map a keystroke to another

    map(new_keystroke, old_keystroke, [domain_pattern], [new_annotation])

    imap(new_keystroke, old_keystroke, [domain_pattern], [new_annotation])

| parameter  | explanation |
|:---------------| :-----|
|**new_keystroke**               | string, the new keystroke that will be used.|
|**old_keystroke**               | string, the existing keystroke that will be replaced, which means pressing it will not trigger any action.|
|**domain_pattern**              | regex[optional], a Javascript regex pattern to identify the domains that this mapping works.|
|**new_annotation**              | string[optional], use it instead of the annotation from old_keystroke if provided.|

### remove a keystroke mapping

    unmap(keystroke, [domain_pattern])

    iunmap(keystroke, [domain_pattern])

| parameter  | explanation |
|:---------------| :-----|
|**keystroke**                   | string, the existing keystroke that will be removed.|
|**domain_pattern**              | regex[optional], a Javascript regex pattern to identify the domains that this settings works.|

### remove all keystroke mappings

    unmapAllExcept(keystrokes, [domain_pattern])

| parameter  | explanation |
|:---------------| :-----|
|**keystrokes**                  | array of string, the existing keystrokes that will be removed.|
|**domain_pattern**              | regex[optional], a Javascript regex pattern to identify the domains that this settings works.|

Example,

    unmapAllExcept(['f', '/', '?']);

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

### Styling

Change the style of the link hints:

    Hints.style('border: solid 3px #552a48; color:#efe1eb; background: initial; background-color: #552a48;');

Change the style of the search marks and cursor:

    Visual.style('marks', 'background-color: #89a1e2;');
    Visual.style('cursor', 'background-color: #9065b7;');

## Build

    npm install
    npm run build

## Credits

* [jQuery](https://github.com/jquery/jquery), for clean coding.
* [TRIE](https://github.com/mikedeboer/trie), finally replaced by my own simple implementation for less memory usage and better performance.
* [ACE vim editor](https://github.com/ajaxorg/ace), for vim editor.
* [markdown parser](https://github.com/chjj/marked), for markdown parser.
* [vimium](https://github.com/philc/vimium), for the days without this extension.
* [cVim](https://github.com/1995eaton/chromium-vim), for the days without this extension.

## License

MIT License
