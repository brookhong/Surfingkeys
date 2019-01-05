# Changelog of Surfingkeys

## 0.9.42
* replace 'qv' with 'cq' for word query with Hints.
* 'p' in visual mode to expand selection to parent element.

* Show message when failed to load settings from. * Implicit Insert Mode activation only for trusted event.

Fixed #879 Array.prototype.flatMap is only supported since version 69

* qv to query word in visual mode. * yQ to copy all query history of OmniQuery.

Visual Mode navigation improvements

Fixed #867 enable focus for Hints.createInputLayer when there are more than one inputs

* Bug fix: Clipboard does not work on editable document.body * Ensure vim editor get focused when it's visible

Fixed #864 Pressing 'Enter' in Ace editor will sometimes incorrectly close the editor in multiline fields

Don't enter implicitly Insert mode on editable document.body, so that shortcuts from Normal mode are still accessible, but show mode status line to warn user.

## 0.9.41
Fixed #860 keep cursor where it is when Insert mode is activated implicitly

## 0.9.40
Try to bring iframe center of screen
Put cursor end of input on up arrow in Find bar

Fixed #850 disabling SurfingKeys should cancel key prefix

Fixed #839 introduce stopPropagation callback so that we could still propagate colon.

Fixed #746 Uncaught DOMException

Also check window.origin for map/unmap when document.location.href is about:blank

feat(hints): hint creation via array of elements (#852)
- create function `createHintsForElements` which takes an array of DOM
  elements and creates a hint for each one, optionally filtering out
  invisible elements by specifying `attrs.filterInvisible` (default true)

- modify `createHints` function to additionally check for the `cssSelector`
  argument to be an Array, and if so choosing to use the
  `createHintsForElements` function.
Fixed #789 undefined KeyEvent.key in some cases

Fixed #843 handle DOMContentLoaded only once, there is some site firing DOMContentLoaded twice

Fixed #839 Always stop propagation for ASCII key in Insert mode

Fixed #845 document what 'capture' means

Fixed #835 omnibar default string when opening bookmark

gxx to close all tabs except current one

Added DuckDuckGo mapping to omnibar (#847)
DuckDuckGo mapping was missing from omnibar, ie od. Added support.
Fixed #842 Fix search suggestions for Youtube

Fixed #841 Add smartCase setting to Find mode

## 0.9.39 

Fixed #837 Scrolling broken on sites using 'scroll-behavior: smooth'

save history for inlineQuery 

enter Insert mode on CodeMirror editor

Fixed #832 Omnibar bookmark does not work in Firefox

## 0.9.38
- Remove pdf viewer from Firefox version
- use markedjs 0.3.19
- use shadydom.min.js 1.1.2
- Multiple proxies support in byhost mode
- Remove mermaid from Firefox version

Adapt Omnibar.listResults to accept raw HTML (#815)
* Change Omnibar.listResults to accept raw HTML

Prior changes to SurfingKeys made it difficult or impossible for users
to return results as raw HTML items in custom Search Engine completion
functions.

This change allows for returning an object from the `addSearchAlias()`
`listSuggestion` callback of the following format:

{
	html: "<li><b>FooBar</b></li>",  // the raw HTML for the item, including a <li> container
	props: { // any properties to be attached to the DOM element
		url: "https://example.com/"
	}
}

* De-duplicate code for creating items from raw HTML

use emoji for search results from Omnibar

Fixed #416 oi to open current page in incognito mode

Fixed #794 'soG' cursor not going to the input box

Fixed issue of emoji completion

## 0.9.37 Fixed #803 Page error.html doesn't work in Incognito Mode

Fixed Firefox listing only 2 of search results on www.cnki.net

Fixed bug of nextFrame for Firefox

clear head for html playground

sort scrollable elements by size

:memo: fix typos in README.md with codespell (#787)

Edit filter logic to not filter out certain elements for hints (#783)
In `filterOverlapElements` in content_scripts/utils.js:

- Use the topmost rectangle instead of `getBoundingClientRect` to
account for elements that wrap around
- Additionally check if `el` is inside the element to account for
elements that contain other elements (like bold, span, etc.)
add proxyFrame for inline query in pdf viewer

;w to focus top window yh to copy current page's host

add command :userAgent to modify user agent

Improve numeric Hints mode

## 0.9.36 
Fixed #776 invalid request

## 0.9.35

Fixed icons

add sU to edit current URL with vim editor, and reload

Fix MRU tab sort in Firefox (#775)

Improve Front.highlightElement for recursive iframes

improve nextFrame

* Fixed bug of failed to load local snippets. * Fixed bug of vim editor on select element.

Fixed #772 omnibar css issue

## 0.9.34
Fixed #767 omnibar css issue 

Fixed issue of bubble in iframe 

Improved placeHints

## 0.9.33

Refine bubble UI and inline query for Q

youtube omnibar alias closes #753 (#759)

* Fixed #756 use window.location.origin for compatibility * upgrade mermaid to 8.0.0-rc.8

## 0.9.32 
Fixed #744 Return/enter don't work in omnibar

Fixed #740 could not use search engine when no item focused

## 0.9.31
Fixed #731 add settings.digitForRepeat to enable mapping of numeric keys.

Reduce warnings for addons.mozilla.org

Fixed #735 Hint styles no longer applied

Fix custom hint and omnibar styling not working (#736)
In 45dd0c3 the strings to create the CSS were changed to use template
literals, but the curly braces weren't preserved/became part of the
`${}` placeholders so the CSS was invalid.

## 0.9.30
Remove jQuery for performance improvement, so that you could not use jQuery($) in your .surfingkeys.js now, please use plain javascript.

## 0.9.22

Due to the removal of `unsafe-eval`, user scripts could not be executed in context of the extension itself, which means Omnibar is not accessible in user space now.

* Omnibar helpers like `Omnibar.listResults`, `Omnibar.listWords` and `Omnibar.html` are not supported. For your customized search engines added through `addSearchAliasX`, please just return an array.
* Two APIs -- `cmapkey` and `command` are also removed for same reason.
* `onAceVimKeymapInit` is replaced by `addVimMapKey`.

More discussions could be found at [issue 607](https://github.com/brookhong/Surfingkeys/issues/607).

## 0.9.19

`unsafe-eval` was removed from `content_security_policy` of the extension, which means creating mapping with JS code string is prohibited. So code below will not work

    mapkey('<Ctrl-y>', 'Show me the money', "Front.showPopup('hello world');");

You need use it like:

    mapkey('<Ctrl-y>', 'Show me the money', function() {
        Front.showPopup('hello world');
    });

The change is introduced to meet the need to publish this extension on [AMO](https://addons.mozilla.org) for Firefox users, which is also good for security.

