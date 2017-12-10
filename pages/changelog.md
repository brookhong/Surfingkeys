# Changelog of Surfingkeys

## 0.9.19

`unsafe-eval` was removed from `content_security_policy` of the extension, which means creating mapping with JS code string is prohibited. So code below will not work

    mapkey('<Ctrl-y>', 'Show me the money', "Front.showPopup('hello world');");

You need use it like:

    mapkey('<Ctrl-y>', 'Show me the money', function() {
        Front.showPopup('hello world');
    });

The change is introduced to meet the need to publish this extension on [AMO](https://addons.mozilla.org) for Firefox users, which is also good for security.
