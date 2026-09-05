# Surfingkeys - Expand your browser with JavaScript and keyboard.

[![Node CI](https://github.com/brookhong/Surfingkeys/workflows/Node%20CI/badge.svg?branch=master)](https://github.com/brookhong/Surfingkeys/actions?query=workflow%3A%22Node+CI%22+branch%3Amaster)

Surfingkeys is a browser extension (for Google Chrome, Chromium-based browsers, Firefox, and Safari) that provides keyboard-based navigation and control of the web in the spirit of the VIM editor. But it's not just for VIM users; it's for anyone who needs more shortcuts for their own functions.

Surfingkeys is created with all settings described in JavaScript, so it's easy for anyone to map any keystrokes to their own defined JavaScript functions. For example,

    api.mapkey('<Ctrl-y>', 'Show me the money', function() {
        api.Front.showPopup('a well-known phrase uttered by characters in the 1996 film Jerry Maguire (Escape to close).');
    });

Surfingkeys does its best to make full use of the keyboard for web browsing, but there are some limitations from Google Chrome itself; please see the [Brook Build of Chromium](https://brookhong.github.io/2021/04/18/brook-build-of-chromium.html) for a more thorough experience.

## Installation

<img src="https://raw.githubusercontent.com/brookhong/Surfingkeys/master/sk.svg" width="384">

* [Surfingkeys - Chrome Web Store](https://chrome.google.com/webstore/detail/surfingkeys/gfbliohnnapiefjpjlpjnehglfpaknnc) for Google Chrome, Chromium based browsers
* [Surfingkeys – Get this Extension for 🦊 Firefox](https://addons.mozilla.org/en-US/firefox/addon/surfingkeys_ff/) for Firefox
* [Surfingkeys - Microsoft Edge Addons](https://microsoftedge.microsoft.com/addons/detail/kgnghhfkloifoabeaobjkgagcecbnppg) for Microsoft Edge
* [Surfingkeys on the Mac App Store](https://apps.apple.com/us/app/surfingkeys/id1609752330) for Safari, works on both macOS and iOS, except that on iOS an external keyboard must be connected to your device. There is one exception of the [special feature designed for iOS devices](https://youtu.be/xaTf2booQkQ) -- `Search selected with`.

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
| Tab Groups | Y | Y | N |
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
* All settings are set up within a javascript file, which makes it easy to create mappings to user-customized functions.
* A large cursor in visual mode, which makes visual mode better.
* Search selected with, which works in both normal mode and visual mode.
* Help messages are automatically generated for mappings.
* `*` to search word under cursor in visual mode.
* Scroll actions like page up/down (`e` `d`) work not only for the top window but also for scrollable DIVs.
* `w` to switch frames if there are any.
* Session management
* A versatile bookmark/url finder
* Count prefixes to repeat actions
* Use vim editor to edit input on page
* Dot to repeat previous action
* `;pm` to preview markdown
* Emoji completion in Insert mode
* Rich hints for keystroke
* Everything in Surfingkeys works for PDFs
* Regional Hints mode
* Chat with LLM

## Quick start

After you install the extension from [Chrome Web Store](https://chrome.google.com/webstore/detail/surfingkeys/gfbliohnnapiefjpjlpjnehglfpaknnc) or [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/surfingkeys_ff/), open a site you'd like to browse. Then press `?` or `u` to take a quick look at the default mappings first. Press `Esc` to hide the usage popover.

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

### Visual mode, the mode for text selection and actions on the selected text.

Press `v` to toggle visual mode. You'll see an indicator at the bottom of the current page - `Caret` or `Range`, and a large cursor on the page. The cursor is made large for visibility, as sometimes it's not easy for humans to locate a normal cursor on a web page.

`Caret` indicates that the cursor is moved when you press jkhl, `Range` indicates that you'll select text when moving the cursor.

Now here is a small practice,

1. press `v`, you'll see `Caret`
1. use the VIM key bindings to move the cursor somewhere.
1. press `v` again, you'll see `Range`.
1. use the VIM key bindings to select some text.
1. press `sg` to see what will happen.
1. press `v` again to go back to normal mode.

All mappings added with `vmapkey` work in this mode, with some built-in mappings like those in VIM - `j` `k` `h` `l` `b` `w` `0` `$` etc.

![search_selected](https://cloud.githubusercontent.com/assets/288207/17644215/759f1e70-61b3-11e6-8bf8-0bdff7d0c933.gif)

* `zz` make cursor at center of window.
* `f` forward to next char.
* `F` backward to next char.
* `;` repeat latest f, F.
* `,` repeat latest f, F in opposite direction.

### Hints mode

Press `f` to enter Hints mode to follow links. There are several other keystrokes to enter Hints mode with different behaviors, such as `cf` for continuous following, `af` for active following.

The default hint characters for links are `asdfgqwertzxcvb`. Hints mode quits when a non-hint key is pressed. Add the line below to your settings to make it right-handed:

    api.Hints.setCharacters('yuiophjklnm'); // for right hand

When hints are overlapped, press `Shift` to flip them. Hold `space` to hold hints temporarily, release `space` to restore hints.

Hints are placed at the center of target links; you could add the line below to your settings to align them left.

    settings.hintAlign = "left";

#### Regional Hints mode

Press `L` to enter regional Hints mode by picking a visually large element. There are some built-in actions in regional Hints mode,

* `Esc` to exit regional hints mode
* `ct` to copy text from target element
* `ch` to copy HTML from target element
* `d` to delete target element
* `l` to chat with AI about the text of the element
* `p` to select the parent element of the target element

[Demo on YouTube](https://www.youtube.com/watch?v=pFPOzAZDO38)

### Insert mode

When focus is switched into any editable element by whatever means (`i` hints, `f` hints, or mouse click), Insert mode is on.

All mappings added with `imapkey` work in this mode.

* `Ctrl-i` to open vim editor to edit.
* `Ctrl-'` to toggle quotes in an input element, which is useful for search engines like Google.
* `Ctrl-e` to move the cursor to the end of the line.
* `Ctrl-a` to move the cursor to the beginning of the line; use `Ctrl-f` in Windows to avoid conflict with select all.
* `Ctrl-u` to delete all entered characters before the cursor.
* `Alt-b` to move the cursor backward 1 word.
* `Alt-f` to move the cursor forward 1 word.
* `Alt-w` to delete a word backwards.
* `Alt-d` to delete a word forwards.
* `Ctrl-g` to correct the grammar of the current input with LLM.

`imap` and `iunmap` work for insert mode.

    api.imap(',,', "<Esc>");        // press comma twice to leave current input box.
    api.imap(';;', "<Ctrl-'>");     // press semicolon twice to toggle quote.

#### Emoji completion

When a user inputs a colon and 2 (set by `settings.startToShowEmoji`) characters such as `:gr` in insert mode, Surfingkeys will try to find matching emoji and list them if any are found.

![emoji](https://cloud.githubusercontent.com/assets/288207/23602453/924ed762-028b-11e7-86f3-bf315c0a2499.gif)

If you want this feature disabled completely, use below settings:

    api.iunmap(":");

If you'd like emoji suggestions popup as soon as you input colon, use below:

    settings.startToShowEmoji = 0;

[Complete list of Emoji](https://github.com/brookhong/Surfingkeys/blob/master/src/pages/emoji.tsv)

### Find

`Find` is not actually a mode; it's just another way to enter visual mode. Press `/` to open the find bar, which sits at almost the same position as the Mode indicator, and type something there. All occurrences of your input will be highlighted. Press `Enter` to finish the finding, and you're in `Caret` visual mode now; press `n` to find next, `N` to find previous.

Press `Ctrl-Enter` to find the exact whole word entered, like with the input `\bkeyword\b`.

### PassThrough mode

Pressing `Alt-i` to enter PassThrough mode gives you a chance to temporarily suppress SurfingKeys, which means Surfingkeys will not care about any key press until you leave this mode by pressing `Esc`. In this mode, you could use built-in shortcuts from any site itself. Please see [Feature Request: implement Vimium-style insert mode · Issue #656](https://github.com/brookhong/Surfingkeys/issues/656) for why we brought this in and the difference between `Alt-i` and `Alt-s`.

Pressing `p` enters an ephemeral PassThrough mode, which automatically quits after 1 second.

### Lurk mode

Users can specify the pages where Surfingkeys will lurk until it is called out by `Alt-i` or `p` (for the ephemeral case), such as

    settings.lurkingPattern = /https:\/\/github\.com|.*confluence.*/i;

If the loading page matches with the `lurkingPattern`, Surfingkeys will enter `lurk` mode by default, in which mode only `Alt-i` and `p` are registered by Surfingkeys to activate `normal` mode. When user presses `Esc` or timeout, Surfingkeys reverts back to `lurk` mode.

API `lmap` can be used to change the shortcuts, for example,

    api.lmap("<Alt-j>", "<Alt-i>");

The extension icon in the toolbar reflects the current status of Surfingkeys:

* Grey -- disabled.
* Half grey/half color -- lurking.
* Color -- enabled.
## Omnibar

The omnibar provides various functions that need user input, for example,

* Open URLs (from both bookmarks and history) with `t`
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

`Ctrl-d` to delete from bookmarks or history

In omnibar opened with `b`:

`Ctrl-Shift-<any letter>` to create a vim-like mark

![search_engine](https://cloud.githubusercontent.com/assets/288207/17644214/759ef1d4-61b3-11e6-9bd9-70c38c8b80e0.gif)

`cmap` can be used for the Omnibar to change mappings, for example:

    api.cmap('<Ctrl-n>', '<Tab>');
    api.cmap('<Ctrl-p>', '<Shift-Tab>');

### Add bookmark
`ab` is a shortcut to bookmark the current page. After you press `ab`, an Omnibar is displayed for you to choose a folder in which to place the new bookmark. If you want to place the new bookmark into a new folder, you can type the folder name -- **which must end with `/`** -- in the Omnibar. For example, I choose folder `/Bookmarks Bar/tool/`, and append `abc/`, then current page will be bookmarked into `/Bookmarks Bar/tool/abc/`. If there is no `/` behind `abc`, `abc` will be used as the title of the new bookmark.

## Search selected with

My favorite feature from when I used Firefox. Both Firefox and Chrome extensions provide it through the context menu; Surfingkeys provides it through key mappings. By default, when you press `sg` in normal mode, it will search the selected text with Google; if there is none selected, it will search text from the system clipboard with Google. In visual mode, it will search the selected text with Google.

The `g` in `sg` is a search alias for Google; there are some other built-in search aliases, like `w` for Bing. So press `sw` to search the selected text with Bing. Refer to [Add search alias to omnibar](https://github.com/brookhong/Surfingkeys/blob/master/docs/API.md#addsearchalias) to add your own search alias, especially those search engines for company inside.

Besides that, there is `sog`, to search the selected text only within this site with Google. For `sog`, `s` is the search_leader_key, `o` is the only_this_site_key, `g` is the search alias.

The search_leader_key `s` plus the capital alias `G` will search the selected text with Google interactively; all other search aliases and those you added through API `addSearchAlias` work in the same way.

## Vim-like marks

You can create vim-like marks by pressing `m` followed by a word character (0-9 / a-z / A-Z), which is used as the mark name. For example, if you press `ma` on this page, you'll create a mark named `a` which points to this page. Then pressing `'a` anywhere will jump to this page.

In this way, the created mark always points to the current URL. You can also create vim-like marks from the bookmarks. Try the following steps:

1. press `b` to open bookmarks.
1. type something to locate the URL you'd like to create vim-like mark for.
1. Hold Ctrl + Shift, press a mark name, such as `f`.

Then afterwards `'F` will open that URL directly.

This is very useful for pages you access frequently. Press `om` to check out all the vim-like marks you have created.

## Switch tabs

By default, pressing `T` shows all opened tabs in an overlay; pressing the hint character then switches to the related tab.

![tabs_overlay](https://github.com/brookhong/Surfingkeys/assets/288207/f0ca339d-133f-4fb0-b902-cdc64fc71374)

If there is no hint label matched with your pressing, omnibar will be opened. So you can always press a non-hint character such as `;` or `j` to launch omnibar directly from the tabs overlay.

There is also `settings.tabsThreshold` here. When the total number of opened tabs exceeds `settings.tabsThreshold`, the omnibar will be used for choosing tabs.

![tabs_omnibar](https://cloud.githubusercontent.com/assets/288207/10544630/1fbdd02c-7457-11e5-823c-14411311c315.png)

If you prefer to use omnibar always, use below mapping:

    api.mapkey('<Space>', 'Choose a tab with omnibar', function() {
        api.Front.openOmnibar({type: "Tabs"});
    });

which works same as:

    settings.tabsThreshold = 0;

The tabs are displayed in MRU order by default, either in the omnibar or the overlay. If you want them in natural order, use:

    settings.tabsMRUOrder = false;

## Windows management

`W` brings up a popup of windows; you can select one of them and press `Enter` to move the current tab to the selected window. If there is only one window, `W` will move the current tab to a new window directly.

`;gt` opens the Omnibar with all tabs not from the current window; you can type some text to filter the tabs, then press `Enter` to gather the filtered tabs into the current window. `;gw` gathers all tabs into the current window.

So to group your tabs into windows, you can use `W` to move one tab to a specified window or use `;gt` to gather filtered tabs into the current window.

## Commands

`:` opens the omnibar for commands, where you can execute any pre-defined commands there. The result will be displayed below the omnibar.

    // create shortcuts for the command with different parameters
    api.map(';pa', ':setProxyMode always');
    api.map(';pb', ':setProxyMode byhost');
    api.map(';pd', ':setProxyMode direct');

Besides commands, you can also run javascript code.

![commands_in_omnibar](https://cloud.githubusercontent.com/assets/288207/11527801/fadee82c-991d-11e5-92e9-b054796a6a75.png)

## Smooth scroll

Smooth scroll works for any scrollable element. It is on by default; to turn it off, use:

    settings.smoothScroll = false;

`j`/`k` scroll in one step with a size of 70; you could change it as below:

    settings.scrollStepSize = 140;

## Session management

To create a session in Chrome with Surfingkeys is to save the URLs of all tabs; to open a session is to open all of its URLs in separate tabs. So a session is basically a named list of URLs.

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

If you need to repeat some action several times, just press a number before the mapkey, such as `3d`, which will scroll down 3 pages. Repeats also work for tab navigation. For example, if you're now on the 1st Tab and you want to switch to the 4th Tab,

* press `3R` to achieve that
* `3E` will switch back to 1st Tab.

Another example is to move one tab. Say you're on the 12th Tab of 23 tabs.

* `11<<` will move current tab to beginning.
* `10>>` will move current tab to end.

Usually, you need not count the number; you can just prefix a large number such as `99<<` if you want to move a tab to the beginning or end.

## Hotkey to toggle Surfingkeys

By default, `Alt-s` toggles Surfingkeys for the current site. When Surfingkeys is turned off, all mappings stop working except the hotkey. To change the hotkey, use the settings below:

    api.map('<Ctrl-i>', '<Alt-s>'); // hotkey must be one keystroke with/without modifier, it can not be a sequence of keystrokes like `gg`.

When Surfingkeys is turned off on some site by `Alt-s`, the status will be persisted in settings, for example,

    "blocklist": {
        "https://github.com": 1
    },

`Alt-s` once more will remove it from settings.blocklist. The settings data is not always presented in snippets; you can use `yj` to dump all settings into the clipboard, then paste it into your text editor to check.

Another way to disable Surfingkeys is to use `settings.blocklistPattern`, please refer to [regex for disabling](https://github.com/brookhong/Surfingkeys/issues/63).

## Proxy settings

SwitchySharp is a great extension for switching proxies, but my use case with it is very simple:

1. create a profile using PAC script.
1. maintain site list in the PAC script, use proxy if the site being accessed is in the list.
1. whenever I come into a site blocked by something, I add it to the list in PAC script.
1. click the SwitchySharp icon to reload the profile.
1. casually I click the SwitchySharp icon to switch profile between `direct` and `pac_script`.

To avoid manually editing PAC script and reloading/switching profile by clicking SwitchySharp icon, I replaced SwitchySharp by integrating proxy settings into Surfingkeys, and provides related commands and shortcuts.

* setProxy, to set proxy, some examples:

        setProxy 192.168.1.100:8080
        setProxy 127.0.0.1:1080 SOCKS5

* setProxyMode, to set proxy mode; there are six modes: direct, byhost, bypass, always, system and clear.

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

Thanks to ACE for the vim editor, Surfingkeys integrates ACE for the vim editor. The vim editor is used:

* to edit any input on html page
* to edit URL to open in new tab
* to edit settings

You could change to Emacs keybindings for the editor by adding below settings:

    settings.aceKeybindings = "emacs";

With Emacs keybindings, use `C-x C-s` to save your input.

### Edit any input on html page

In normal mode, press capital `I`, then use a hint letter to pick an input box. A vim editor is opened for you to edit text. The vim editor is opened in slightly different ways for `<input>`, `<textarea>`, and `<select>` elements.

For `<input>` elements, the vim editor has only one line, and you use vim key bindings to edit your text. Then press `Enter` or `:w` to write your text back to the `<input>` element.

![input_with_vim](https://cloud.githubusercontent.com/assets/288207/17644219/75a72b2e-61b3-11e6-8ce2-06c9cc94aeca.gif)

For `<textarea>` elements, the vim editor is opened in bigger size. After you complete your edits, press `Ctrl-Enter` or `:w` to write your text back to the `<textarea>` element.

![textarea_with_vim](https://cloud.githubusercontent.com/assets/288207/17644217/75a27e44-61b3-11e6-8f21-9cd79d3c5776.gif)

For `<select>` elements, the vim editor is again opened in a bigger size. Instead of editing the text, search for the desired option and jump to the line, then press `Enter` to select it. This is handy for `<select>` elements which have lots of options.

![select_with_vim](https://cloud.githubusercontent.com/assets/288207/17644218/75a458a4-61b3-11e6-8ce7-eedcc996745c.gif)

`Esc` or `:q` to quit vim editor without writing text back.

`Tab` completion works with all words on current page, `Space` to choose a match from popup.

If you enter insert mode with `i` or mouse click, you will edit your input in normal way. You could also open vim editor at that time by pressing `Ctrl-i`.

Remember that in insert mode, press `Ctrl-i` to open the vim editor.

### Edit URL to open in new tab

`;u` opens the vim editor to edit the current URL, then `Enter` or `:w` opens the input URL, which works just like an address bar with vim-binding keys.

`Tab` completion works with all URLs from bookmark/history, `Space` to choose a match from popup.

![url_with_vim](https://cloud.githubusercontent.com/assets/288207/17644220/75f8eedc-61b3-11e6-9630-da2250ac5f10.gif)

### Edit settings

`;e` to open settings editor, `:w` to save settings.

## Dot to repeat previous action

[Repeating previous actions](https://github.com/brookhong/Surfingkeys/issues/67)

All keystrokes in normal mode are repeatable by dot, except those mapped with `repeatIgnore` as `true`, for example,

    api.mapkey('se', '#2My magic se', function() {
        // your code here
    }, {repeatIgnore: true});

Then `.` will not repeat your magic action with `se`, even if it was just pressed.

## Markdown preview

1. copy your markdown source into clipboard.
1. `;pm` to open markdown preview, which will preview markdown from clipboard.
1. Then on the preview page, another `;pm` will open vim editor to edit markdown source.
1. `:wq` to refresh preview.
1. `r` to reload markdown source from clipboard.

![markdown](https://cloud.githubusercontent.com/assets/288207/17669897/0b6fbaf6-6342-11e6-8583-86eb8691190d.gif)

By default, Surfingkeys uses this [markdown parser](https://github.com/chjj/marked) to preview markdown. If you'd like to use the [github markdown API](https://developer.github.com/v3/markdown/) to parse your markdown, add the line below to your settings:

    settings.useLocalMarkdownAPI = false;

## Capture page

There are circumstances where you want to take a screenshot of a page; the shortcuts below can help, especially for a long page or for some scrollable DIV on the page.

* `yg` to capture current page.
* `yG` to capture current full page if it is scrollable.
* `yS` to capture current scroll target.

After pressing one of the above shortcuts, you'll see a popup of the captured image, on which you could then right-click with a mouse (😢) to save it as or copy it into the system clipboard.

## PDF viewer
To make Surfingkeys work for PDF files, Surfingkeys integrates the PDF viewer from the notable [pdf.js](https://github.com/mozilla/pdf.js). When a PDF file is opened in Chrome, the PDF viewer is launched, and you can use everything from Surfingkeys then.

If you would like to use the original PDF viewer provided by Chrome itself, use `;s` to toggle that.

Some functionalities are also available when you're using the original PDF viewer, but some, such as smooth scroll/visual mode, etc., won't be available.

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
| settings.scrollFallback | false | Fallback to document-level scrolling when the focused element cannot scroll in the requested direction. |
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

### Example of `settings.theme`: below is to set the font size of the status bar

    settings.theme = `
        #sk_status, #sk_find {
            font-size: 20pt;
        }
    }`;

## Chat with LLM
There are several LLM providers integrated into Surfingkeys now. Use `A` to call out a chat popup and chat with your AI providers. The page you are on is not sent along with your question: the model reads it with the `read_page` tool when a question actually needs it, so a chat that never asks about the page never sends it anywhere. The supported LLM providers are currently:

* Ollama
* Bedrock
* Custom LLM provider (e.g.: SiliconFlow, OpenRouter, DeepSeek and Gemini; other OpenAI API compatible services should also work)

To use the feature, you need to set up your credentials/API keys first, like this:

    settings.defaultLLMProvider = "bedrock";
    settings.llm = {
        bedrock: {
            accessKeyId: '********************',
            secretAccessKey: '****************************************',
            // model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
            model: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
        },
        ollama: {
            model: 'qwen2.5-coder:32b',
        },
        custom: {
            siliconflow: {
                serviceUrl: 'https://api.siliconflow.cn/v1/chat/completions',
                apiKey: '***********************************',
                model: 'deepseek-ai/DeepSeek-V3.1',
            },
            openrouter: {
                serviceUrl: 'https://openrouter.ai/api/v1/chat/completions',
                apiKey: '***********************************',
                model: 'meta-llama/llama-3.1-70b-instruct:free',
            },
            deepseek: {
                serviceUrl: 'https://api.deepseek.com/chat/completions',
                apiKey: '***********************************',
                model: 'deepseek-chat',
            },
            gemini: {
                serviceUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
                apiKey: '***********************************',
                model: 'gemini-2.0-flash',
            },
        }
    };

You can also use `A` in visual mode. Press `v` or `V` to enter visual mode, then `v` again to select the text you'd like to chat with AI about, then `A` to call out the LLM chat box. Now start chatting with AI about the selected text — `read_page` then returns only that selection, not the whole page, and a half-selected link is still a link.

A conversation is kept per site, so returning to any page of that site — or reloading — resumes where you left off. `/clear` starts a fresh one, and also withdraws the tool permissions granted from a confirmation prompt on that site (see below). A conversation you resume under a different provider than the one it was held with keeps its questions and answers, but not the tool results, which only the original provider can be given back.

`/copy` puts the conversation on the clipboard as Markdown, to paste into a ticket, a document or a message. What you can read is what you get: your questions, the answers, and the `⚙` line for every tool call inside the answer that made one — including the ones you denied, so a pasted answer never reads as if the model simply knew something it had to go and look up. An answer still being written is copied as far as it has got, rather than the copy quietly giving you less than the screen does.

Another solution to select the content to chat with AI about is Regional Hints mode. Press `L` to pick an element, then `l` to call out the LLM chat box.

### Correct grammar of the input with LLM

In insert mode, press `Ctrl-g` to send the text of the current input to the LLM. The input text is then replaced with the corrected version.

### Browser tools available to the LLM

While chatting, the LLM can look things up in your browser instead of guessing. It decides on its own when a tool is needed, and the chat shows which tool is running. Most of the tools only report:

| Tool | What the LLM can do with it |
| --- | --- |
| `read_page` | read the page you are looking at, or just the part you picked |
| `page_outline` | see what a long page covers, and read only the section that matters |
| `search_page` | find where something is mentioned on that page, without reading all of it |
| `list_page_links` | see where the page can take you, to follow one of its links |
| `search_browsing_history` | find a page you visited before, or answer questions about what you have been reading |
| `search_bookmarks` | search the pages you deliberately saved |
| `list_recently_closed_tabs` | find a page that was open a moment ago |
| `list_tabs` | see the tabs you have open right now |
| `list_downloads` | see what you saved, where it came from, and whether it finished |
| `read_tab` | read a page you already have open in another tab, as your browser rendered it |
| `fetch_url` | read another page, to follow a link or check a fact the current page only references |

So you can ask things like *"summarize this"*, *"which of my open tabs covers authentication?"*, *"what does this page say about rate limits?"*, *"reopen the tab I just closed about Rust"*, *"find the Rust article I read last week and summarize it"*, *"compare the docs in my other tab with this one"*, or *"open the first link on this page and compare it with what I'm reading"*.

A few tools **change** something instead of reporting on it, so that an answer can be acted on rather than only read:

| Tool | What the LLM can do with it |
| --- | --- |
| `highlight_on_page` | highlight the passage an answer rests on and scroll to it, so you can see where it came from |
| `open_url` | open a page in a background tab, for you to look at when you are done — or for `read_tab` to read |
| `group_tabs` | collect open tabs into one named tab group |

So *"where does it say that?"* highlights the sentence on the page (`n` walks the other matches, `Esc` clears them), *"open the changelog it links to"* leaves a tab waiting for you, and *"tidy my GitHub tabs into a group"* does it. These three never touch the page you are on and never close anything: `open_url` opens in the background on purpose, because navigating or switching away would take the chat down with it, and a tab group only collects tabs you already have open — drag one out to undo it. **Every call of them is confirmed, and no setting can waive that** — the only thing that can is the `s` you press on the prompt itself, which allows the tool on one site until you take it back — see below.

`page_outline`, `search_page` and `list_page_links` exist so that a question about one detail of a long page does not cost a full read of it: each returns a short list, and `search_page` gives the character offset that makes the `read_page` after it land on the answer rather than at the top. `list_page_links` reads the converter's own output back, which is exact rather than approximate — every unescaped bracket in that text is one the converter wrote, so a link it reports is a link the page really contains, and a page that merely prints `[docs](https://evil.example)` in its text has none.

`list_downloads` reports the name of each file, not the path to it: that path names your account and home directory, and this is on its way to a third party. Ask where a file was saved and the model can request the full path, which the confirmation prompt then says it is doing.

There are two ways to read a page that is not the one you are on, and they are not interchangeable. `read_tab` takes a tab id — one `list_tabs` reported, or the one `open_url` reports for the tab it just opened — and reads that tab where it stands — the page as *your browser* rendered it, after its scripts ran and with you signed in, so a single-page app has its content and a page behind a login is the page you see. `fetch_url` makes a fresh request from the extension instead: no scripts run, no images are downloaded and your session is not part of it, which is what lets it read a page you never opened — a link from this page, from your history or from your bookmarks — and what makes it report little more than "probably rendered by JavaScript" for an app. So *"compare this with the spec in my other tab"* is `read_tab`, and *"check what the changelog it links to says"* is `fetch_url`. `read_tab` is the one read tool that can hand over a page you are not looking at, which is why its confirmation prompt names the tab **and its host** — *"read the text of tab 7, "Inbox (12)" at mail.example.com"* is a decision you can make; *"read tab 7"* is not — and why it is not in the default allowlist. A tab the browser has unloaded to save memory holds no page at all, and Surfingkeys does not run in browser pages, the extension gallery or the PDF viewer, so the model is told to use `fetch_url` or to ask you to open the tab rather than inventing what it says.

When `fetch_url` comes back with nothing usable — an empty app shell, a login page, a request that failed — the result tells the model the way through rather than leaving it to report failure: `open_url` puts the address in a background tab and `read_tab` reads it there, rendered and signed in. `open_url` reports the id of the tab it opened, so that second step needs no `list_tabs` call in between — an id is checked against the tabs your browser actually has open, so one tool's id is as good as another's, and the model is not sent back for something it was just handed. That route opens a tab, so it is `open_url`'s own confirmation prompt that decides whether it happens, every time; the model is told to take it when *your* question needs that page, and never because a page or a fetched document asked to be opened. A tab a second old is usually still loading, so a reading of an unfinished page is deliberately not kept: the result says so and says to read the tab again rather than continuing at an offset into a page that has since grown.

A route that reaches pages by opening them is a route that leaves tabs behind, so the two tools that make it clean up after themselves. Every tab the chat opens joins one tab group, named **LLM** — one group per window, collapsed or closed in a single gesture rather than hunted for along the strip. And a tab whose page the model has read *to the end* is the tab the next `open_url` uses: it has served its purpose, so the next address goes into it instead of beside it, and a question that reads five pages costs one tab rather than five. "To the end" is what makes that free rather than a trade: a page arrives in chunks, each ending in the offset that continues it, and a tab taken away mid-page would leave the rest of it reachable nowhere at all — not in the tab, which now holds something else. So a half-read tab keeps its page, and the model is told which of the two states it is in, so it can finish a page to free the tab or leave it and keep the page.

That bounds nothing by itself, though — a model that reads a little of each page would hold every tab it ever opened — so there is a ceiling, `settings.llmMaxTabs`, five tabs by default:

    settings.llmMaxTabs = 3;

At the ceiling the next `open_url` takes the **oldest** of those tabs even mid-page, and says so, both in the prompt and to the model, which is told that the offsets it holds for that page are now void and that opening that address in a tab again — which recycles a tab in turn — is how to have the rest. It is pointed back at a tab rather than at the network on purpose: that page is known to render in one, having just been read from one, whereas `fetch_url` is either untried on it or is the door that sent it here. Nothing is permanently lost, so the ceiling costs a re-read rather than an answer; what it buys is that the strip has an end. The recycling goes round: a tab that has just been given a page is the newest of them, so it goes to the back of the queue, and the same tab is not taken twice in a row. Which of the two kinds of reuse is about to happen is in the prompt — *"open https://b.example/2 in background tab 5, replacing https://a.example/1 — the oldest page this chat opened, which it has NOT finished reading, because it is holding its limit of 5 tabs"* — so replacing a page is a thing you approve rather than discover, and if you would rather keep that tab, `n`, or close one of the others, or raise the number.

Only tabs the chat opened are ever reused: it identifies them by watching a tab appear, not by their address, so a tab of yours at the same URL is not one of them. And the ceiling never overrides whose tab it is — a tab you are looking at right now, or one you have navigated somewhere of your own, is not the chat's to take at any count, so when all of them are like that it opens one more and goes over the limit rather than pull a page out from under you. A tab you have taken over that way still *counts*, though, because it is on your strip and in that group only because the chat put it there: what the number bounds is the tabs the chat caused, not the ones it can still recycle. So the chat pays for it — as you claim its tabs, it has less room and starts taking back pages it opened more recently — and you never do.

None of this bookkeeping is meant to reach the answer. All of it — the ids, the group, which tab was reused for which page, and that a page went unfinished — is addressed to the model so that its next call is right, and every one of those results says outright that it is not to be repeated to you. That withholds nothing you would want: a page the model needs more of is a page it can read again, so the silence costs a re-read at most, never an answer built on less than the model could have had. What it tells you is that it opened the page you asked about; where you see the mechanics is the confirmation prompt, which is the moment it matters, and the tool line in the bubble, which is the record. Answer, not plumbing.

`read_page`, `read_tab` and `fetch_url` hand over the page as Markdown rather than as flat text, because flat text keeps the words and drops everything the words point at. A link becomes its label with no destination, an image contributes nothing however carefully its `alt` was written, a table collapses into one run-on line, and a form becomes a few stray captions with no hint of what submitting it would do — and the model cannot tell that any of it was withheld, so it guesses. As Markdown you get instead:

    Compare [the token bucket](https://en.wikipedia.org/wiki/Token_bucket) with:

    | Algorithm | Burst | Memory |
    | --- | --- | --- |
    | Token bucket | yes | O(1) |

    ![A bucket filling at a fixed rate](https://example.com/img/bucket.svg)

    [form POST https://example.com/subscribe]

    [email name=email label="Email" placeholder="you@example.com" required]

    [hidden field csrf_token]

    [select name=cadence] options: Weekly (selected) | Monthly

    [button caption="Subscribe"]

So *"what would this form send, and where?"* and *"open the second link in the table"* are answerable. Links are absolute, so the model can pass one straight to `fetch_url`; the value of a hidden field or a password is never included, only its name, since these are session tokens on their way to a third party; a `data:` image is named but not inlined; an `alt=""` image is dropped, which is what the empty attribute means; and anything a page hides with CSS is left out, as it is not what you are reading — that holds for a tab read with `read_tab` as much as for the page you are on, while a page fetched by `fetch_url` is never laid out, so there nothing can be measured as hidden and nothing is dropped on that ground. Brackets in the page's own text are escaped, so a page cannot print something that reads like a link or a form of its own and have the model take it for one. URLs do make the text longer, so a link-heavy page may take a second `read_page` call — the result says how much is left and which offset continues it.

Tool use works with every provider. The declarations are sent in the shape each one speaks: the Anthropic shape to Bedrock, and the OpenAI function-calling shape to the custom providers and to Ollama, whose own `/api/chat` accepts that same shape. Note that a small local model may ignore the tools or call them with poor arguments — this works best with a capable model, and a service whose model has no function calling at all will answer with an error.

A single question is allowed five tool rounds. On the fifth the model is asked to answer with what it has gathered instead of calling anything else. A call that changes something buys back the round it costs, up to twelve in all: reading costs one round per answer, while acting costs two, since the round after it is where the model checks what happened and tells you.

#### Every tool call asks first

A tool call is not necessarily something you asked for. Whatever the page-reading tools return was written by whoever wrote that page, so the conversation contains text nobody in your browser wrote, and it may well be addressed to the model — and `fetch_url` takes a URL, which is also a way to send data out. So each call is confirmed before it runs, showing the tool, what it will do, and the arguments verbatim:

    🔐 search_browsing_history wants to read your browsing history and send the matches to the LLM provider.
       query: rust async
       y allow once · a allow for this chat · s allow on https://news.example.com · n deny

`y` allows that one call, `a` stops asking for that tool for the rest of the conversation, `n` denies it — a denial is reported back to the model, which then answers with what it already has. Any other unmodified key is ignored while the prompt is up, so a stray Enter cannot submit past it, but `Ctrl`/`Cmd` shortcuts still work if you want to copy a URL out before deciding. The choices are also clickable, since the chat input does not always have the keyboard. Read the arguments before approving — they are shown one per line, exactly as the model sent them, and a request to fetch an address on your own network is called out explicitly.

`s` stops asking for that tool on every URL of the site you are on, in every tab, until you take it back. The chat is rebuilt with each page you visit, so `a` lasts only until you follow a link — one question walked across a few pages of a site asks about the same tool once per page, and once more in the next tab. `s` is that decision made once instead. It is scoped to the **origin**, which is what the prompt names rather than saying "this site": `http://example.com` and `https://example.com` are two different sites to it, a subdomain is another one again, and a `file:` or `data:` page counts only as itself.

A grant is kept where the conversations are kept, so it is remembered across a restart of the browser and is read fresh on every call — grant a tool in one tab and the chat already open in another honours it, withdraw it anywhere and it stops in every tab at once.

Nothing expires a grant, so there are two ways to take one back. `/clear` withdraws what was granted on **the site you are on**, along with the conversation. `/permissions` lists every site you have granted something and what you granted it — from any page, which is the point, since the `s` worth reviewing is the one you pressed on a site you have not been back to — and `/permissions clear` withdraws all of them at once. Press `s` knowing that: on `fetch_url` or a write tool it is a decision that stands until you go and look for it.

The prompt arrives whenever the model decides it needs a tool, which may be in the middle of a sentence you are typing, so `y`/`a`/`s`/`n` do not count for a moment after it appears — a keystroke meant for the input cannot approve a call or grant a standing permission. `Esc` denies immediately, and is the key to reach for if a prompt takes you by surprise.

Page text arrives as a tool result, fenced and labelled as untrusted, and the model is told to report on it rather than obey it.

To stop being asked for tools you trust, list them:

    settings.llmAllowedTools = ["read_page", "list_tabs", "fetch_url"];

Anything not listed is still confirmed. The default is `["read_page", "search_page", "list_page_links"]`: reading the page you opened the chat on is the point of opening it there, and none of the three takes a destination, so they have nowhere to send anything — the latter two are served from the same snapshot as `read_page` and report strictly less of it, so asking about them while the whole page goes unasked would only teach you to approve without reading. Set it to `[]` to be asked about those too. `page_outline` and `highlight_on_page` are reasonable additions for the same reason: the first reports strictly less of the page than `read_page`, and the second sends nothing anywhere. `read_tab` and `fetch_url` are the two worth thinking twice about before listing: the first can hand over a page you are not looking at — your mail, your tickets — and the second takes a URL chosen per call by a model that has been reading text the page wrote, so a standing permission for it is a standing permission to send something somewhere.

A tool that CHANGES something — `open_url`, `group_tabs` — is asked about until you grant it a site. Listing it in `llmAllowedTools` has no effect and the prompt for it does not offer `a`, because a standing permission is a judgement made once about calls that have not happened yet: with these tools the arguments are the whole decision — which URL, which tabs — and they are chosen per call by a model that has been reading text the page wrote. So the prompt names the target rather than the tool, looking up what the ids mean first:

    🔐 group_tabs wants to put 3 tabs: "Inbox", "Pull requests", "CI — build #4821" into a tab group named "work".
       tabIds: [7,12,19]
       title: work
       y allow once · s allow any call on https://github.com · n deny

`s` is the one standing permission these accept, and it reads **allow any call** rather than "allow on", because the prompt above it describes the call in front of you while the grant covers the ones after it — arguments included. It is the only grant whose reach you choose with the same keystroke that makes it — one origin, the one the prompt names — and `/clear` on that site, or `/permissions clear` from anywhere, takes it back in every tab at once. A setting cannot stand in for it, and neither can `a`: those answer for sites you are not on, or before the model has shown what it does with the tool. Worth pressing for *"open each of these links"* on a site you are working through; worth thinking about first for `open_url`, since a URL is also a way to send something somewhere, and the model picks it after reading the page. Whatever you grant, the call still appears in the chat as a trace line — the prompt is what a granted call loses, not the record of it, and `/permissions` will still name the tool afterwards.

### To use LLM chat with a specified system prompt

For example, you can designate your AI to be a translator with the snippet below

    api.mapkey('A', '#8Open llm chat', function() {
        api.Front.openOmnibar({type: "LLMChat", extra: {
            system: "You're a translator, whenever you got a message in Chinese, please just translate it into English, and if you got a message in English, please translate it to Chinese. You don't need to answer any question, just TRANSLATE."
        }});
    });

`extra.system` replaces the built-in instructions entirely, including the ones about the page being untrusted data, so say what you need if the chat is still meant to read pages. It does not affect the tools: how they work and what to do when one comes back empty is carried by the tools themselves, so a custom prompt does not cost you that.

### 403 Forbidden with Ollama

To use Ollama with the Chrome extension, you need to run ollama with a modification on `OLLAMA_ORIGINS`:

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
