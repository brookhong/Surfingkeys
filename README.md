# Surfingkeys - Expand your browser with javascript and keyboard.

[![Node CI](https://github.com/brookhong/Surfingkeys/workflows/Node%20CI/badge.svg?branch=master)](https://github.com/brookhong/Surfingkeys/actions?query=workflow%3A%22Node+CI%22+branch%3Amaster)

Surfingkeys is another web browser(including Google Chrome, Chromium based browsers, Firefox, Safari) extension that provides keyboard-based navigation and control of the web in the spirit of the VIM editor. But it's not for VIM users only, it's for anyone who just needs some more shortcuts to their own functions.

Surfingkeys is created with all settings described in Javascript, so it's easy for anyone to map any keystrokes to their own defined Javascript function. For example,

    api.mapkey('<Ctrl-y>', 'Show me the money', function() {
        api.Front.showPopup('a well-known phrase uttered by characters in the 1996 film Jerry Maguire (Escape to close).');
    });

Surfingkeys is doing its best to make full use of keyboard for web browsing, but there are some limitations from Google Chrome itself, please see [Brook Build of Chromium](https://brookhong.github.io/2021/04/18/brook-build-of-chromium.html) for a more thorough experience.

## Installation

<img src="https://raw.githubusercontent.com/brookhong/Surfingkeys/master/sk.svg" width="384">

* [Surfingkeys - Chrome Web Store](https://chrome.google.com/webstore/detail/surfingkeys/gfbliohnnapiefjpjlpjnehglfpaknnc) for Google Chrome, Chromium based browsers
* [Surfingkeys – Get this Extension for 🦊 Firefox](https://addons.mozilla.org/en-US/firefox/addon/surfingkeys_ff/) for Firefox
* [Surfingkeys - Microsoft Edge Addons](https://microsoftedge.microsoft.com/addons/detail/kgnghhfkloifoabeaobjkgagcecbnppg) for Microsoft Edge
* [Surfingkeys on the Mac App Store](https://apps.apple.com/us/app/surfingkeys/id1609752330) for Safari, works for both macOS and iOS, except that for iOS an external keyboard is required to be connected with your device. There is one exception of the [special feature designed for iOS device](https://youtu.be/xaTf2booQkQ) -- `Search selected with`.

### Feature availability
| Features \ Browsers | Chromium family (above 45) | Firefox (above 57) | Safari (above 15) |
|:---------------|:-----|:-----|:-----|
| Follow links | Y | Y | Y |
| Surfingkeys modes | Y | Y | Y |
| Omnibar | Y | Y | partly |
| Search selected with | Y | Y | Y |
| Vim-like marks | Y | Y | Y |
| Switch tabs | Y | Y | Y |
| Windows management | Y | Y | N |
| Commands | Y | Y | Y |
| Smooth scroll | Y | Y | Y |
| Session management | Y | Y | Y |
| Repeats action by pressing number before mapkey | Y | Y | Y |
| Hotkey to toggle Surfingkeys | Y | Y | Y |
| VIM editor and Emacs editor | Y | Y | Y |
| Dot to repeat previous action | Y | Y | Y |
| Capture page | Y | Y | Y |
| PDF viewer | Y | N | N |
| Sync across devices | Y | N | Y |
| Tab Groups | Y | N | N |
| Proxy | Y | N | N |
| Markdown preview |Y  | Y | N |

### TABLE OF CONTENTS

* [Feature list](#feature-list)
* [Quick start](#quick-start)
* [Follow links](#follow-links)
* [Surfingkeys modes](#surfingkeys-modes)
* [Omnibar](#omnibar)
* [Search selected with](#search-selected-with)
* [Vim-like marks](#vim-like-marks)
* [Switch tabs](#switch-tabs)
* [Windows management](#windows-management)
* [Commands](#commands)
* [Smooth scroll](#smooth-scroll)
* [Session management](#session-management)
* [Repeats action by pressing number before mapkey](#repeats-action-by-pressing-number-before-mapkey)
* [Hotkey to toggle Surfingkeys](#hotkey-to-toggle-surfingkeys)
* [Proxy settings](#proxy-settings)
* [VIM editor and Emacs editor](#vim-editor-and-emacs-editor)
* [Dot to repeat previous action](#dot-to-repeat-previous-action)
* [Markdown preview](#markdown-preview)
* [Capture page](#capture-page)
* [PDF viewer](#pdf-viewer)
* [Edit your own settings](#edit-your-own-settings)
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
* `;pm` to preview markdown
* Emoji completion in Insert mode
* Rich hints for keystroke
* Everything in Surfingkeys works for PDF
* Regional Hints mode
* Chat with LLM

## Quick start

After you install the extension from [Chrome Web Store](https://chrome.google.com/webstore/detail/surfingkeys/gfbliohnnapiefjpjlpjnehglfpaknnc) or [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/surfingkeys_ff/), open a site you'd like. Then press `?` or `u` to take a quick look on the default mappings first. Press `Esc` to hide the usage popover.

Try some mappings described in the usage popover. For example, press `e` to scroll a page up, `d` to scroll a page down, `;e` to open settings page.

* `?` to show help
![help](https://user-images.githubusercontent.com/288207/72702854-0a74a480-3b8f-11ea-9be3-69745c280c3f.png)
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

All mappings added with `vmapkey` work in this mode, with some built-in mappings like those in VIM - `j` `k` `h` `l` `b` `w` `0` `$` etc.

![search_selected](https://cloud.githubusercontent.com/assets/288207/17644215/759f1e70-61b3-11e6-8bf8-0bdff7d0c933.gif)

* `zz` make cursor at center of window.
* `f` forward to next char.
* `F` backward to next char.
* `;` repeat latest f, F.
* `,` repeat latest f, F in opposite direction.

### Hints mode

Press `f` to enter Hints mode to follow links. There are several other keystrokes to enter Hints mode with some different behavior, such as `cf` for continuous following, `af` for active following.

Default hint characters for links are `asdfgqwertzxcvb`, it quits when a non-hint key is pressed. Add below line to your settings to make it right hand:

    api.Hints.setCharacters('yuiophjklnm'); // for right hand

When hints are overlapped, press `Shift` to flip them. Hold `space` to hold hints temporarily, release `space` to restore hints.

Hints are placed in center of target links, you could add below line in your settings to let them aligned left.

    settings.hintAlign = "left";

#### Regional Hints mode

Press `L` to enter regional Hints mode by picking a visually large element. There are some built-in actions in regional Hints mode,

* `Esc` to exit regional hints mode
* `ct` to copy text from target element
* `ch` to copy HTML from target element
* `d` to delete target element
* `l` to chat with AI about the text of the element

[Demo on YouTube](https://www.youtube.com/watch?v=pFPOzAZDO38)

### Insert mode

When focus is switched into any editable element by whatever means(`i` hints or `f` hints or mouse click), Insert mode is on.

All mappings added with `imapkey` work in this mode.

* `Ctrl - i` to open vim editor to edit.
* `Ctrl - '` to toggle quotes in an input element, this is useful for search engines like google.
* `Ctrl-e` move the cursor to the end of the line.
* `Ctrl-a` move the cursor to the beginning of the line, use `Ctrl-f` in Windows to avoid conflict with select all.
* `Ctrl-u` delete all entered characters before the cursor.
* `Alt-b` move the cursor Backward 1 word.
* `Alt-f` move the cursor Forward 1 word.
* `Alt-w` delete a word backwards.
* `Alt-d` delete a word forwards.

`imap` and `iunmap` for insert mode.

    api.imap(',,', "<Esc>");        // press comma twice to leave current input box.
    api.imap(';;', "<Ctrl-'>");     // press semicolon twice to toggle quote.

#### Emoji completion

When user inputs a colon and 2(set by `settings.startToShowEmoji`) characters such as `:gr` in insert mode, Surfingkeys will try to find matched emoji, and list them out if there are some found.

![emoji](https://cloud.githubusercontent.com/assets/288207/23602453/924ed762-028b-11e7-86f3-bf315c0a2499.gif)

If you want this feature disabled completely, use below settings:

    api.iunmap(":");

If you'd like emoji suggestions popup as soon as you input colon, use below:

    settings.startToShowEmoji = 0;

[Complete list of Emoji](https://github.com/brookhong/Surfingkeys/blob/master/src/pages/emoji.tsv)

### Find

`Find` is not actually a mode, it just another way to enter visual mode. Press `/` to open find bar, which sits at almost the same position with Mode indicator, type something there. All occurrences of your input will be highlighted. Press `Enter` to finish the finding, and you're in `Caret` visual mode now, press `n` to find next, `N` to find previous.

Press `Ctrl-Enter` to find exactly the whole word input, like with the input `\bkeyword\b`.

### PassThrough mode

To press `Alt-i` to enter PassThrough mode gives you a chance to temporarily suppress SurfingKeys, which means Surfingkeys will not care any key press until leaving this mode by pressing `Esc`. In this mode, you could use built-in shortcuts from any site itself. Please see [Feature Request: implement Vimium-style insert mode · Issue #656](https://github.com/brookhong/Surfingkeys/issues/656) for why we brought this in and the difference between `Alt-i` and `Alt-s`.

To press `p` to enter ephemeral PassThrough mode, which will automatically quit after 1 second.

### Lurk mode

User can specify the pages where Surfingkeys will lurk until it is called out by `Alt-i` or `p`(for ephemeral case), such as

    settings.lurkingPattern = /https:\/\/github\.com|.*confluence.*/i;

If the loading page matches with the `lurkingPattern`, Surfingkeys will enter `lurk` mode by default, in which mode only `Alt-i` and `p` are registered by Surfingkeys to activate `normal` mode. When user presses `Esc` or timeout, Surfingkeys reverts back to `lurk` mode.

API `lmap` can be used to change the shortcuts, for example,

    api.lmap("<Alt-j>", "<Alt-i>");

The extension icon in toolbar reflects current status of Surfingkeys,

* Grey -- disabled.
* Half Grey/Half Color -- lurking.
* Color -- enabled.
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
* `Ctrl-.` to show results of next page
* `Ctrl-,` to show results of previous page
* `Ctrl-c` to copy all listed items

In omnibar opened with `t`:

`Ctrl - d` to delete from bookmark or history

In omnibar opened with `b`:

`Ctrl - Shift - <any letter>` to create vim-like mark

![search_engine](https://cloud.githubusercontent.com/assets/288207/17644214/759ef1d4-61b3-11e6-9bd9-70c38c8b80e0.gif)

`cmap` could be used for Omnibar to change mappings, for example:

    api.cmap('<Ctrl-n>', '<Tab>');
    api.cmap('<Ctrl-p>', '<Shift-Tab>');

### Add bookmark
`ab` is a shortcut to bookmark current page. An Omnibar is displayed for you to choose a folder to place the new bookmark after you pressed `ab`. If you want to place the new bookmark into a new folder, you could input folder name -- **which must be ended with `/`** in Omnibar. For example, I choose folder `/Bookmarks Bar/tool/`, and append `abc/`, then current page will be bookmarked into `/Bookmarks Bar/tool/abc/`. If there is no `/` behind `abc`, `abc` will be used as title of the new bookmark.

## Search selected with

My favorite feature from when I was using Firefox. For both Firefox and Chrome, the extensions make it through context menu. Surfingkeys makes it through key mappings. By default, when you press `sg` in normal mode, it will search selected text with google, if there is none selected, it will search text from system clipboard with google. In visual mode, it will search selected text with google.

The `g` in `sg` is a search alias for google, there are some other built-in search aliases -- like `w` for bing. So press `sw` to search selected with bing. Refer to [Add search alias to omnibar](https://github.com/brookhong/Surfingkeys/blob/master/docs/API.md#addsearchalias) to add your own search alias, especially those search engines for company inside.

Besides that, there is a `sog`, to search selected text only in this site with google. For `sog`, `s` is the search_leader_key, `o` is the only_this_site_key, `g` is the search alias.

The search_leader_key `s` plus capital alias `G` will search selected with google interactively, all other search aliases and those you added through API `addSearchAlias` work in same way.

## Vim-like marks

You can create vim-like marks by pressing `m`, followed by a word character(0-9 / a-z / A-Z), used as mark name. For example, if you press `ma` on this page, you'll create a mark named `a` which points to this page. Then pressing `'a` anywhere, you'll jump to this page.

In this way, the created mark always points to current URL. You can also create vim-like marks from the bookmarks. Try following steps:

1. press `b` to open bookmarks.
1. type something to locate the URL you'd like to create vim-like mark for.
1. Hold Ctrl + Shift, press a mark name, such as `f`.

Then afterwards `'F` will open that URL directly.

This is very useful for those pages you access very frequently. `om` to check out all the vim-like marks you have created.

## Switch tabs

By default, pressing `T` will show all opened tabs in an overlay, then pressing the hint char, will switch to the related tab.

![tabs_overlay](https://github.com/brookhong/Surfingkeys/assets/288207/f0ca339d-133f-4fb0-b902-cdc64fc71374)

If there is no hint label matched with your pressing, omnibar will be opened. So you can always press a non-hint character such as `;` or `j` to launch omnibar directly from the tabs overlay.

There is also `settings.tabsThreshold` here. When total of opened tabs exceeds `settings.tabsThreshold`, omnibar will be used for choosing tabs.

![tabs_omnibar](https://cloud.githubusercontent.com/assets/288207/10544630/1fbdd02c-7457-11e5-823c-14411311c315.png)

If you prefer to use omnibar always, use below mapping:

    api.mapkey('<Space>', 'Choose a tab with omnibar', function() {
        api.Front.openOmnibar({type: "Tabs"});
    });

which works same as:

    settings.tabsThreshold = 0;

The tabs are displayed in MRU order by default, either in omnibar or overlay. If you want them in natural order, use:

    settings.tabsMRUOrder = false;

## Windows management

`W` will bring up a popup of Windows, you can select one of them and press `Enter` to move current tab to the selected window. If there is only one window, `W` will move current tab to a new window directly.

`;gt` will open Omnibar with all tabs not from current window, you could input some text to filter the tabs, then press `Enter` to gather the filtered tabs into current window. `;gw` will gather all tabs into current window.

So to group your tabs into windows, you can use `W` to move one tab to a specified window or use `;gt` to gather filtered tabs into current window.

## Commands

`:` to open omnibar for commands, then you can execute any pre-defined there. The result will be displayed below the omnibar.

    // create shortcuts for the command with different parameters
    api.map(';pa', ':setProxyMode always');
    api.map(';pb', ':setProxyMode byhost');
    api.map(';pd', ':setProxyMode direct');

Besides commands, you can also run javascript code.

![commands_in_omnibar](https://cloud.githubusercontent.com/assets/288207/11527801/fadee82c-991d-11e5-92e9-b054796a6a75.png)

## Smooth scroll

Smooth scroll works for any scrollable element. It is on by default, to turn it off as below:

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

    api.map('<Ctrl-i>', '<Alt-s>'); // hotkey must be one keystroke with/without modifier, it can not be a sequence of keystrokes like `gg`.

When Surfingkeys is turned off on some site by `Alt-s`, the status will be persisted in settings, for example,

    "blocklist": {
        "https://github.com": 1
    },

`Alt-s` once more will remove it from settings.blocklist. The data settings are not always presented in snippets, you could use `yj` to dump all settings into clipboard, then paste it in your text editor to check out.

Another way to disable Surfingkeys is to use `settings.blocklistPattern`, please refer to [regex for disabling](https://github.com/brookhong/Surfingkeys/issues/63).

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

* setProxyMode, to set proxy mode, there are five modes: direct, byhost, bypass, always, system and clear.

        direct      Chrome will connect to all sites directly.
        byhost      Chrome will only connect to sites added in settings through related proxy. You could add multiple pairs of `proxy` and `hosts`, for hosts matched with `hosts` `proxy` will be used.
        bypass      Chrome will connect to all sites through proxy, with specified hosts excluded.
        always      Chrome will connect to all sites through proxy.
        system      Use proxy configuration taken from the operating system.
        clear       Surfingkeys will not take control of proxy settings, this is the default mode.

* `cp`, toggle proxy for current site.

* `;pa`, shortcut for `:setProxyMode always`

* `;pb`, shortcut for `:setProxyMode byhost`

* `;pc`, shortcut for `:setProxyMode clear`

* `;pd`, shortcut for `:setProxyMode direct`

* `;ps`, shortcut for `:setProxyMode system`

## VIM editor and Emacs editor

Thanks ACE for the vim editor, Surfingkeys integrates ACE for the vim editor. The vim editor is used:

* to edit any input on html page
* to edit URL to open in new tab
* to edit settings

You could change to Emacs keybindings for the editor by adding below settings:

    settings.aceKeybindings = "emacs";

With Emacs keybindings, use `C-x C-s` to save your input.

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

`;u` to open vim editor to edit current URL, then `Enter` or `:w` to open the input URL, which works just like address bar with vim-binding keys.

`Tab` completion works with all URLs from bookmark/history, `Space` to choose a match from popup.

![url_with_vim](https://cloud.githubusercontent.com/assets/288207/17644220/75f8eedc-61b3-11e6-9630-da2250ac5f10.gif)

### Edit settings

`;e` to open settings editor, `:w` to save settings.

## Dot to repeat previous action

[Repeating previous actions](https://github.com/brookhong/Surfingkeys/issues/67)

All keystrokes in normal mode are repeatable by dot, except those keystrokes mapped with `repeatIgnore` as `true`, for example,

    api.mapkey('se', '#2My magic se', function() {
        // your code here
    }, {repeatIgnore: true});

Then `.` will not repeat your magic action with `se`, even it is just pressed.

## Markdown preview

1. copy your markdown source into clipboard.
1. `;pm` to open markdown preview, which will preview markdown from clipboard.
1. Then on the preview page, another `;pm` will open vim editor to edit markdown source.
1. `:wq` to refresh preview.
1. `r` to reload markdown source from clipboard.

![markdown](https://cloud.githubusercontent.com/assets/288207/17669897/0b6fbaf6-6342-11e6-8583-86eb8691190d.gif)

By default, Surfingkeys uses this [markdown parser](https://github.com/chjj/marked) to preview markdown, if you'd like to use [github markdown API](https://developer.github.com/v3/markdown/) to parse your markdown, please add below line to your settings:

    settings.useLocalMarkdownAPI = false;

## Capture page

There are some circumstances that you want to take a screenshot on a page, below shortcuts could help you, especially when it is for a long page or just for some scrollable DIV on the page.

* `yg` to capture current page.
* `yG` to capture current full page if it is scrollable.
* `yS` to capture current scroll target.

After one of above shortcuts pressed, you could see a popup of captured image, on which you could then right click with a MOUSE( 😢 ) to save as or copy into system clipboard.

## PDF viewer
To make Surfingkeys work for PDF files, Surfingkeys integrates PDF viewer from the notable [pdf.js](https://github.com/mozilla/pdf.js). When a pdf file is opened in Chrome, the PDF viewer will be launched, and you could use everything from Surfingkeys then.

If you would like to use original pdf viewer provided by Chrome itself, use `;s` to toggle that.

Some functionalities are also available when you're using original pdf viewer, but some functionalities such as smooth scroll/visual mode etc won't be available.

## Edit your own settings

### Properties list

| key | default value | explanation |
|:---------------|:-----|:-----|
| settings.showModeStatus | false | Whether always to show mode status. |
| settings.showProxyInStatusBar | false | Whether to show proxy info in status bar. |
| settings.richHintsForKeystroke | 500 | Timeout(ms) to show rich hints for keystroke, 0 will disable rich hints. |
| settings.useLocalMarkdownAPI |  true | Whether to use [chjj/marked](https://github.com/chjj/marked) to parse markdown, otherwise use github markdown API. |
| settings.focusOnSaved | true | Whether to focus text input after quitting from vim editor. |
| settings.omnibarMaxResults | 10 | How many results will be listed out each page for Omnibar. |
| settings.omnibarHistoryCacheSize | 100 | The maximum of items fetched from browser history. |
| settings.omnibarPosition | "middle" | Where to position Omnibar. ["middle", "bottom"] |
| settings.omnibarSuggestion | false | Show suggestion URLs|
| settings.omnibarSuggestionTimeout | 200 | Timeout duration before Omnibar suggestion URLs are queried, in milliseconds. Helps prevent unnecessary HTTP requests and API rate-limiting. |
| settings.focusFirstCandidate | false | Whether to focus first candidate of matched result in Omnibar. |
| settings.tabsThreshold | 100 | When total of opened tabs exceeds the number, Omnibar will be used for choosing tabs. |
| settings.verticalTabs | true | Whether to show tab pickers vertically aligned. |
| settings.clickableSelector | "" | Extra CSS selector to pick elements for hints mode, such as "\*.jfk-button, \*.goog-flat-menu-button". |
| settings.clickablePat | /(https?&#124;thunder&#124;magnet):\/\/\S+/ig | A regex to detect clickable links from text, you could use `O` to open them. |
| settings.editableSelector | div.CodeMirror-scroll,div.ace_content | CSS selector for additional editable elements. |
| settings.smoothScroll | true | Whether to use smooth scrolling when pressing keys like `j`/`k`/`e`/`d` to scroll page or elements. |
| settings.modeAfterYank | "" | Which mode to fall back after yanking text in visual mode. Value could be one of ["", "Caret", "Normal"], default is "", which means no action after yank.|
| settings.scrollStepSize | 70 | A step size for each move by `j`/`k` |
| settings.scrollFriction | 0 | A force that is needed to start continuous scrolling after initial scroll step. A bigger number will cause a flicker after initial step, but help to keep the first step precise. |
| settings.nextLinkRegex | /((>>&#124;next)+)/i | A regex to match links that indicate next page. |
| settings.prevLinkRegex | /((<<&#124;prev(ious)?)+)/i| A regex to match links that indicate previous page. |
| settings.hintAlign | "center" | Alignment of hints on their target elements. ["left", "center", "right"] |
| settings.hintExplicit | false | Whether to wait for explicit input when there is only a single hint available |
| settings.hintShiftNonActive | false | Whether new tab is active after entering hint while holding shift |
| settings.defaultSearchEngine | "g" | The default search engine used in Omnibar. |
| settings.blocklistPattern | undefined | A regex to match the sites that will have Surfingkeys disabled. |
| settings.focusAfterClosed | "right" | Which tab will be focused after the current tab is closed. ["left", "right", "last"] |
| settings.repeatThreshold | 9 | The maximum of actions to be repeated. |
| settings.tabsMRUOrder | true | Whether to list opened tabs in order of most recently used beneath Omnibar. |
| settings.historyMUOrder | true | Whether to list history in order of most used beneath Omnibar. |
| settings.newTabPosition | 'default' | Where to new tab. ["left", "right", "first", "last", "default"] |
| settings.interceptedErrors | [] | Indicates for which errors Surfingkeys will show error page, so that you could use Surfingkeys on those error pages. For example, ["*"] to show error page for all errors, or ["net::ERR_NAME_NOT_RESOLVED"] to show error page only for ERR_NAME_NOT_RESOLVED, please refer to [net_error_list.h](https://github.com/adobe/chromium/blob/master/net/base/net_error_list.h) for complete error list.  |
| settings.enableEmojiInsertion | false | Whether to turn on Emoji completion in Insert mode. |
| settings.startToShowEmoji | 2 | How many characters are needed after colon to show emoji suggestion. |
| settings.language | undefined | The language of the usage popover, only "zh-CN" and "ru-RU" are added for now, PR for any other language is welcomed, please see [l10n.json](https://github.com/brookhong/Surfingkeys/blob/master/src/pages/l10n.json). |
| settings.stealFocusOnLoad | true | Whether to prevent focus on input on page loaded, set to true by default so that we could use Surfingkeys directly after page loaded, otherwise we need press `Esc` to quit input. |
| settings.enableAutoFocus | true | Whether to enable auto focus after mouse click on some widget. This is different with `stealFocusOnLoad`, which is only for the time of page loaded. For example, there is a hidden input box on a page, it is turned to visible after user clicks on some other link. If you don't like the input to be focused when it's turned to visible, you could set this to false. |
| settings.theme | undefined | To change css of the Surfingkeys UI elements. |
| settings.caseSensitive | false | Whether finding in page/Omnibar is case sensitive. |
| settings.smartCase | true | Whether to make caseSensitive true if the search pattern contains upper case characters. |
| settings.cursorAtEndOfInput | true | Whether to put cursor at end of input when entering an input box, by false to put the cursor where it was when focus was removed from the input. |
| settings.digitForRepeat | true | Whether digits are reserved for repeats, by false to enable mapping of numeric keys. |
| settings.editableBodyCare | true | Insert mode is activated automatically when an editable element is focused, so if document.body is editable for some window/iframe (such as docs.google.com), Insert mode is always activated on the window/iframe, which means all shortcuts from Normal mode will not be available. With `editableBodyCare` as `true`, Insert mode will not be activated automatically in this case. |
| settings.ignoredFrameHosts | ["https://tpc.googlesyndication.com"] | When using `w` to loop through frames, you could use this settings to exclude some of them, such as those for advertisements. |
| settings.aceKeybindings | "vim" | Set it "emacs" to use emacs keybindings in the ACE editor. |
| settings.caretViewport | null | Set it in format `[top, left, bottom, right]` to limit hints generation on `v` for entering visual mode, such as `[window.innerHeight / 2 - 10, 0, window.innerHeight / 2 + 10, window.innerWidth]` will make Surfingkeys generate Hints only for text that display on vertically middle of window. |
| settings.mouseSelectToQuery | [] | All hosts that have enable feature -- mouse selection to query. |
| settings.autoSpeakOnInlineQuery | false | Whether to automatically speak the query string with TTS on inline query. |
| settings.showTabIndices | false | Whether to show tab numbers (indices) in the tab titles. |
| settings.tabIndicesSeparator | "\|" | The separator between index and original title of a tab. |
| settings.disabledOnActiveElementPattern | undefined | Automatically disable this extension when the active element matches with this pattern and reactivate the extension when the active element changes, one useful case is to enable user to type to locate an option in a large dropdown, such as `settings.disabledOnActiveElementPattern = "ul.select-dropdown-options";` |

### Example of settings.theme, below is to set font size of status bar

    settings.theme = `
        #sk_status, #sk_find {
            font-size: 20pt;
        }
    }`;

## Chat with LLM
There are several LLM providers integrated into Surfingkeys now, use `A` to call out a chat popup, and chat with your AI providers. The supported LLM providers now are

* Ollama
* Bedrock
* DeepSeek
* Gemini
* Custom LLM provider (e.g.: SiliconFlow and OpenRouter; other OpenAI API compatible services should also work)

To use the feature, you need set up your credentials/API keys first, like

    settings.defaultLLMProvider = "bedrock";
    settings.llm = {
        bedrock: {
            accessKeyId: '********************',
            secretAccessKey: '****************************************',
            // model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
            model: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
        },
        gemini: {
            apiKey: '***************************************',
        },
        ollama: {
            model: 'qwen2.5-coder:32b',
        },
        deepseek: {
            apiKey: '***********************************',
            model: 'deepseek-chat',
        },
        custom: {
            serviceUrl: 'https://api.siliconflow.cn/v1/chat/completions',
            apiKey: '***********************************',
            model: 'deepseek-ai/DeepSeek-V3.1',
        }
    };

You can also use `A` in visual mode. Press `v` or `V` to enter visual mode, then `v` again to select the text you'd like to chat with AI about, then `A` to call out the LLM chat box. Now start to chat with AI about the selected text.

Another solution to select the content to chat with AI about is Regional Hints mode. Press `L` to pick an element, then `l` to call out the LLM chat box.

### To use LLM chat with specified system prompt

For example, you can designate your AI to be a translator with below snippets

    api.mapkey('A', '#8Open llm chat', function() {
        api.Front.openOmnibar({type: "LLMChat", extra: {
            system: "You're a translator, whenever you got a message in Chinese, please just translate it into English, and if you got a message in English, please translate it to Chinese. You don't need to answer any question, just TRANSLATE."
        }});
    });

### 403 Forbidden with Ollama

To use Ollama with Chrome extension, you need run ollama with some modification on `OLLAMA_ORIGINS`

Under Windows

    OLLAMA_ORIGINS=chrome-extension://* ollama serve

Under Mac

    launchctl setenv OLLAMA_ORIGINS chrome-extension://gfbliohnnapiefjpjlpjnehglfpaknnc

Under Mac for both Chrome and Firefox

    launchctl setenv OLLAMA_ORIGINS "chrome-extension://gfbliohnnapiefjpjlpjnehglfpaknnc,moz-extension://*"

## API Documentation

> The API documentation is currently a work in progress.

* [Markdown](docs/API.md)
* [HTML](http://brookhong.github.io/Surfingkeys)

## Other

* [Anki Study Deck](https://ankiweb.net/shared/info/1195173768), Anki Study Deck (helpful for memorizing keyboard mappings) 
* For further information check out the [FAQ](https://github.com/brookhong/Surfingkeys/wiki/FAQ) and add to the user-contributed documentation on the [Surfingkeys Wiki](https://github.com/brookhong/Surfingkeys/wiki/).

## Credits

* ~~[jQuery](https://github.com/jquery/jquery)~~, removed for less memory usage and better performance.
* ~~[TRIE](https://github.com/mikedeboer/trie)~~, finally replaced by my own simple implementation for less memory usage and better performance.
* [ACE vim editor](https://github.com/ajaxorg/ace), for vim editor.
* [markdown parser](https://github.com/chjj/marked), for markdown parser.
* [pdf.js](https://github.com/mozilla/pdf.js), for pdf viewer.
* [vimium](https://github.com/philc/vimium), for the days without this extension.
* [cVim](https://github.com/1995eaton/chromium-vim), for the days without this extension.

## Donate
Support me with [paypal](https://www.paypal.me/brookhong), or

![donation](https://raw.githubusercontent.com/brookhong/Surfingkeys/master/src/pages/donation.png)

## License

MIT License
