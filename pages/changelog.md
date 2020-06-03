# Changelog of Surfingkeys

## 0.9.65
* compute scrollable elements automatically when invalidated (#1248)
* fixed some default mappings started with s, for example, `se` is replaced with `;e`.
* show warning about mapping preceded in console
* OpenUserURLs in Omnibar to open urls from user script
* Fixed #1244 enable toggleBlacklist in iframes
* show warning about mapping override in console
* remove unused code for web request errors
* Fixed #1241 merge wikipedia search alias
* Fixed #1238 T for choose tab doesn't work properly
* Fix bug of scroll on duckduckgo.com's search result page
* Fix bug of Hints.flashPressedLink
* Fix search highlights by placing them in document.documentElement (#1234)
* Fix dark theme with dompurify changes (#1231)
* Prevent browser window focus from exiting insert mode (#1230)

## 0.9.64
* Fixed #1180 don't blur on enter key in Input
* Fixed some issues of ACE editor
* Fixed #1207 issue of getRealRect
* Fixed #915 Alt-w delete the space between words
* introduce State for Front mode to avoid unnecessary entrance
* Add header to bug issue template (#1225)
* Update issue template to newer style (#1223)
* Fix search marks being offset on some pages (#1220)
* Fix EOL in insert mode with contenteditable (#1217)
* Fix enableAutoFocus blurring when entering insert mode dynamically (#1218)

## 0.9.63
* Fix error of ACE editor on Escape
* Upgrade dependency ace 1.4.11
* Upgrade dependencies: marked 1.0.0, mermaid 8.5.0
* add .gitattributes to exclude files not for Firefox from archive
* Remove Firefox dependency on shadydom since Element.attachShadow is supported since verson 63
* use DOMPurify to sanitize raw HTML
* Remove permissions of webRequest
* Correct commenting out of readme comment (#1215)

## 0.9.62
* Remove brand from description for different marketplaces

## 0.9.61
* Fixed #1187 quit Find Mode on clicking on other places than input box.
* default settings.autoSpeakOnInlineQuery false to disable automatical speaking
* Fixed #1197 display no hint label for hidden elments
* Add QR code for donation.
* Fixed #1191 intercept network errors only when proxy mode is set to byhost
* gulpfile.js: Fix a typo in the 'build_manifest' task (#1184)

## 0.9.60
* enable proxy edit for ALWAYS mode on option page
* let exceptions threw on background
* Fixed #425 BUG: in normal mode, keystrokes are leaking to the site
* remove animations of keystroke hint
* make InlineQuery work in pdf viewer and markdown previewer
* Fixed #1167 input overlay does not support search input
* Fixed #1173 IME not works properly in iframe
* handshake of frontend detachment
* isolate DOM observer from Normal as there is no need for it in frontend
* create input in frontend on demand to mitigate a memory leak issue -- https://bugs.chromium.org/p/chromium/issues/detail?id=1058367
* Fix issue of smartPageBoundary when the only scrolling element is not document.scrollingElement.
* Added setting to open hints in background when holding shift (#1159)
* Added hintExplicit option to disable automatic hint selection (#1157)

## 0.9.59
* Fixed issue of getRealRect when an element contains only one child element.

## 0.9.58
* Fixed #1147 won't blur from input if it is the only element in an iFrame
* t to translate selected text with google in Visual mode
* Fix init issue of iframes with src as about:blank
* Fix tabHistory not being updated for new tabs (#1145)
* Fixed #1124 document error on half page up/down
* Fixed #1130 correct position of a wrapped A tag
* Add setting to switch to last focused tab on stack on tab close (#1143)
* Mitigation for #1134. Don't filter out parent elements explicitly requested in configuration. (#1136)
* Disable autoFocus blurring when in insert or passthrough mode (#1137)
* Hide large image in GH Issue Template in submitted issue (#1125)
* 翻页快捷键支持根据目标链接地址去重 (#1127)

## 0.9.57
* enable auto detect of modal elements only after clicking on some element and disable it on starting to scroll
* Fixed #1119 uiHost must be appended after pdf document ready.
* Fix scrolling with smooth scrolling disabled with site overrides (#1114)

## 0.9.56
* bug fix of showBubble
* ignore tiny frames
* get really visible rect of an element with getClientRects
* set active content window on showEditor or openOmnibar
* V to enter visual mode with current selection node
* add settings.editableSelector for additional editable elements
* Add build badge to README (#1097)
* Add Github Actions npm build (#1090)

## 0.9.55
* Fixed #1076 Replace deprecated API proxy.onProxyError
* only hang on runtime.onMessage when an asynchronous response is necessary.
* remove autocmd
* remove some event listeners on enter Disabled mode.

## 0.9.54
* create ui frame only for active tab to reduce memory usage
* remove long-live ports for message passing
* apply user settings as soon as possible
* Fixed #1074 Can't search in help
* add isElementPositionRelative to detect modal elements
* Fix issues on a page with frameset as its body
* Fixed #1071 unexpected removal of scrollNode
* Fixed #1072 disruptive issue of initScrollIndex
* add label for flash frame
* Fixed #1068 issue of autocmd
* Fixed #1069 mitigate issue of unexpected scroll event
* create components for frame when user clicks on it

## 0.9.53
* Performance improvement: create components for frames only when it is necessary.

## 0.9.52
* Fix issue of detecting modal element.
* Remove settings.passThroughTimeout, add PassThrough.setTimeout, so that we could have both passThrough mode and ephemeral passThrough mode simultaneously.

## 0.9.51
* suppress next scroll event on following cases:
    - call to check hasScroll
    - when scroll to detect modal element, firing scroll event is not expected

## 0.9.50
* Fixed #1055 issue of detecting modal elements

## 0.9.49
* Skip some frames invisible to users.
* Fixed issues of paste data from copied form.
* Fixed #1002 unmapAllExcept does not unmap number keys
* Fixed #1032 yT to duplicate the active tab as a background tab
* Fixed #964 Automatically quit PassThrough mode after specified milliseconds, to set it 0 will disable automatical quit.
* Fixed issue of Hint mode: prevent hint keys leak to site
* also read text on mouse up
* Treat element with role textbox as input widget
* Find scrollable modal element and use it as scrollNode on DOM node inserted, remove it if current scrollNode is detached from document, so that we could scroll in modal dialog automatically, such as on reddit/zhihu.

## 0.9.47

* Using port.sender is must, as calls to background service APIs may be made
from any inactive tab, such as API getDisabled.

* For API openLink in background, we can't just use sender.tab when calls to
this API was made from Omnibar, as it may be stale, which was bound when port
was created.

## 0.9.46

Fix message listener of long-lived connections, in which case sender.tab is not valid.

Fixed #1004 Open default search engine after Enter not working most of the time

Fixed #989 previousPage/nextPage ([[/]]) should respect the rel HTML attribute

Fixed #993 Chrome warning on scroll listener

Fixed #1000 Hint styling not working in Firefox

bug fix: unable to remove proxied host on setting page

Fix the 'O' default mapping on Firefox (closes #990) (#991)

Unlike Chrome, trying to follow generated links with the click()
method has no effect on Firefox. Assigning the URL to window.location
instead works in both browsers.

## 0.9.45

Fixed #985 Pressing 'f' causes text to vanish

Fixed #982 Cannot enter the edit box on wandbox.org

Fixed #970 keep cursor on mouse click to enter Insert mode

Fixed #962 Facebook Messsenger "Could not display conversation list"

Fixed #870 use precise roles of elements to match clickable targets

Fixed #951 summary tag is supposed to be clickable by default.

canonical xml format for elements to be created

feat(scrollable-hints): display hints for scrollable elements with di… (#968)

* feat(scrollable-hints): display hints for scrollable elements with different color; add it's function to the the 'f' command and add another command ';fs' to trigger it; user mouse click could also switch the scrollable focus

* remove scrollable hints from the 'f' command, due to performance consideration

Fix 'yf' and ';pf': remove the domain name from the form key, so that the workflow could work across different sites.

disable binding action in Insert mode when IME is opened

Fixed #954 url detection should also work when there is no suggestion

Fixed #952 Add doc for 'ab'

## 0.9.44
blacklist should work with interceptedErrors

toggleMouseQuery needs to work with iframes

improve vim-like marks

Fix openLink for javascript:

;q to toggle mouseSelectToQuery site-wise

Shift-Enter in visual mode open link in new tab

add settings.mouseSelectToQuery for whether to enable mouse selection to query.

Add: PrevLink and NextLink Regex for douban.com (#930)

douban.com names its paging buttons as '前页' and “后页", which were not considered by PrevLinkRegex and NextLinkRegex. Now they are added.

fixed: isEditable: TypeError: element is null (#920)

tweak: attempt to treat OmniBar input as URL (#940)

if the user enters a string lacking a URI scheme, try to construct a URL
by prepending 'https://', falling back to a query URL for the default
search engine

Update README.md (#938)

I created a study deck for memorizing the default keyboard mappings.

## 0.9.43
Fixed #894 Firefox: Visual mode: Forward/backward document boundary moves viewscreen but not the cursor

Fixed #899 Unrecognized key event: Meta-Meta in Firefox

Add settings.caretViewport to limit hints generation on 'v' for entering visual mode

Fixed #911 keep scroll position on finding completed

Fixed #578 support Emacs keybindings in ACE editor

Fixed #907 doesn't work well with TinyMCE editor

Fixed #906 pass-through mode is undocumented

* add settings.ignoredFrameHosts for excluding unwanted frames
* g# to reload current page without hash fragment

adds title to iframe to supress Lighthouse error: "iframe elements do not have a title" (#904)

Fixed #887 map function should work for Omnibar/Find/Help/AceEditor

Fixed #892 Front.showBanner ignores linger_time

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

