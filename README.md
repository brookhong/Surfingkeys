# Surfingkeys - Expand your browser with javascript and keyboard.

Surfingkeys is another Chrome extension that provides keyboard-based navigation and control of the web in the spirit of the VIM editor. But it's not for VIM users only, it's for anyone who just needs some more shortcuts to his own functions.

There are several Chrome extensions that provides similar functionalities. I used [philc/vimium](https://github.com/philc/vimium) for almost one year, then I switched to [1995eaton/chromium-vim](https://github.com/1995eaton/chromium-vim) half a year ago.

Both are great extensions. What makes me create another wheel, is that I found so many changes that need to be done when I tried to add some functionalities to meet my own requirements. For example, some functions that I originally used some other extensions for,

* Search selected text with different kinds for search engine
* Double click on a word to get translation

Surfingkeys is created with all settings described in Javascript, so it's easy for anyone to map any keystrokes to his own defined Javascript function. For example,

    mapkey('c-y', 'Show me the money', function() {
        alert('a well-known phrase uttered by characters in the 1996 film Jerry Maguire');
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

## Quick start

After you install the extension from [Chrome Web Store](https://chrome.google.com/webstore/detail/surfingkeys/gfbliohnnapiefjpjlpjnehglfpaknnc), open a site you'd like. Then press `u` or `Ctrl-i` to take a quick look on the default mappings first. Press `Esc` to hide the usage popover.

Try some mappings described in the usage popover. For example, press `e` to scroll a page up, `d` to scroll a page down, `se` to open settings page.

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

## Vim-like marks

You can create vim-like marks by pressing `m`, followed by a word character(0-9, A-Z, a-z), used as mark name. For example, if you press `ma` on this page, you'll create a mark named `a` which points to this page. Then pressing `'a` anywhere, you'll jump to this page.

In this way, the created mark always points to current URL. You can also create vim-like marks from the bookmarks. Try following steps:

1. press `b` to open bookmarks.
1. type something to locate the URL you'd like to create vim-like mark for.
1. press Ctrl, plus a mark name, such as `f`.

Then afterwards `'f` will open that URL directly.

This is very useful for those pages you access very frequently. `om` to check out all the vim-like marks you have created.

## Edit your own settings

### Map a keystroke to some action

    mapkey(keystroke, help_string, action_code)

| parameter  | explanation |
|:---------------| :-----|
|**keystroke**                   | any keystroke to trigger the action|
|**help_string**                 | a help message to describe the action, which will displayed in help opened by `u`.|
|**action_code**                 | action code can be a snippet of Javascript code or a Javascript function.|

    vmapkey(keystroke, help_string, action_code)

mapkey in visual mode

### Add search alias to omnibar

    addSearchAlias(alias, prompt, search_url, suggestion_url, callback_to_parse_suggestion);

| parameter  | explanation |
|:---------------| :-----|
|**alias**                                   | one or several chars, used as search alias. When you input the string and press `space` in omnibar, it will switch to the related search engine.|
|**prompt**                                  | a string to tell you which search engine will be used for following search|
|**search_url**                              | the URL for the search engine|
|**suggestion_url[optional]**                | omnibar will list out search suggestions from the engine, if you provide suggestion_url and callback_to_parse_suggestion|
|**callback_to_parse_suggestion[optional]**  | works with suggestion_url to provide search suggestion|

    addSearchAliasX(alias, prompt, search_url, search_leader_key, suggestion_url, callback_to_parse_suggestion);

This version will create a mapping to search selected text with `search_url` on pressing `search_leader_key` followed by `alias`, except that it adds search alias to omnibar as the normal version. For example, below line

    addSearchAliasX('s', 'stackoverflow', 'http://stackoverflow.com/search?q=', 'o');

works like

    addSearchAlias('s', 'stackoverflow', 'http://stackoverflow.com/search?q=');
    mapkey('os', 'Search Selected with stackoverflow',  'searchSelectedWith("http://stackoverflow.com/search?q=")');
    vmapkey('os', 'Search Selected with stackoverflow',  'searchSelectedWith("http://stackoverflow.com/search?q=")');

### Omnibar helpers

    OmnibarUtils.listWords(<array of words>)
    OmnibarUtils.html(<any html snippets>)

### Add a mini query

Mini query differs from search engine by showing the query result in omnibar instead of openning a new page.

    addMiniQuery(alias, prompt, search_url, callback_to_display_result);

## License

MIT License
