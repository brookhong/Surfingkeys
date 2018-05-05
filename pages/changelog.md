# Changelog of Surfingkeys

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
