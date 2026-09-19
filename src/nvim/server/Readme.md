This native messaging host serves two features:

* the neovim editor, which needs it to run `nvim` for you.
* loading settings from `~/.surfingkeys.js`, by setting **Load settings from** to
  `<native>` on the settings page — the browser can not read a file in your home
  directory itself. Safari has the Surfingkeys app for this and needs none of the
  setup below.

## Installation under Windows

**Note: Please update the paths when creating those files, in below instructions, I'm putting those files under `C:\Users\brook\.Surfingkeys_NativeMessagingHosts\` and `nvim.exe` under `d:\tools\Neovim\bin\`.**

1. Download `server.lua` from https://raw.githubusercontent.com/brookhong/Surfingkeys/master/src/nvim/server/server.lua

1. Create a `start.bat`

        @echo off
        d:\tools\Neovim\bin\nvim.exe --headless -c "luafile C:\Users\brook\.Surfingkeys_NativeMessagingHosts\server.lua"

1. Create a `surfingkeys.json`

        {
            "allowed_origins": [
                "chrome-extension://aajlcoiaogpknhgninhopncaldipjdnp/",
                "chrome-extension://gfbliohnnapiefjpjlpjnehglfpaknnc/"
            ],
            "description": "Neovim UI client from Surfingkeys",
            "name": "surfingkeys",
            "type": "stdio",
            "path": "C:\\Users\\brook\\.Surfingkeys_NativeMessagingHosts\\start.bat"
        }

1. Create a `surfingkeys.reg` for Google Chrome

        Windows Registry Editor Version 5.00

        [HKEY_CURRENT_USER\SOFTWARE\Google\Chrome\NativeMessagingHosts\surfingkeys]
        @="C:\\Users\\brook\\.Surfingkeys_NativeMessagingHosts\\surfingkeys.json"

    or for Chromium,

        Windows Registry Editor Version 5.00

        [HKEY_CURRENT_USER\SOFTWARE\Chromium\NativeMessagingHosts\surfingkeys]
        @="C:\\Users\\brook\\.Surfingkeys_NativeMessagingHosts\\surfingkeys.json"

1. Double click the reg file to import it.

1. Restart your browser.

## Installation under Mac / Linux

1. Download `server.lua` from https://raw.githubusercontent.com/brookhong/Surfingkeys/master/src/nvim/server/server.lua to a folder, such as `$HOME/.Surfingkeys_NativeMessagingHosts/`.

1. Create a `start.sh` under the same folder, and `chmod +x` it. Two lines in it are
   easy to leave out, and both fail silently — the host never starts and the browser
   reports only *"Native host has exited."* (Chrome) or *"An unexpected error
   occurred"* (Firefox):

    * **the shebang** — without it the script is never run at all.
    * **the `PATH` line**, because a browser started from the desktop gives its
      children a minimal `PATH` with none of the usual install locations in it, so
      plain `nvim` is not found. Add wherever your own `which nvim` reports if it is
      not already listed.

            #!/bin/sh
            PATH="/usr/local/bin:/opt/homebrew/bin:/opt/local/bin:$HOME/.local/bin:$PATH"
            export PATH
            SCRIPT_PATH="${0%/*}"
            exec nvim --headless -c "luafile $SCRIPT_PATH/server.lua"

   The copy in this folder checks both before starting nvim and writes a reason to
   stderr, which the browser logs — worth copying, since a missing `server.lua`
   otherwise leaves the browser waiting with nothing to show.

1. Create a `surfingkeys.json` under `<Chromium User Data Directory>/NativeMessagingHosts/`.

        {
            "allowed_origins": [
                "chrome-extension://aajlcoiaogpknhgninhopncaldipjdnp/",
                "chrome-extension://gfbliohnnapiefjpjlpjnehglfpaknnc/"
            ],
            "description": "Neovim UI client from Surfingkeys",
            "name": "surfingkeys",
            "type": "stdio",
            "path": "<PATH_TO_YOUR_START_SH>/start.sh"
        }

    **Chromium User Data Directory**
    ### Mac OS X
    The default location is in the Application Support folder:

    * [Chrome] ~/Library/Application Support/Google/Chrome
    * [Chromium] ~/Library/Application Support/Chromium

    ### Linux
    The default location is in ~/.config:

    * [Chrome] ~/.config/google-chrome
    * [Chromium] ~/.config/chromium

1. Restart your browser.

## Installation under Firefox

Firefox uses the same `server.lua` and `start.sh`, but identifies the extension by
id: use `allowed_extensions` in place of `allowed_origins`.

    {
        "allowed_extensions": [ "surfingkeys@github.com" ],
        "description": "Neovim UI client from Surfingkeys",
        "name": "surfingkeys",
        "type": "stdio",
        "path": "<PATH_TO_YOUR_START_SH>/start.sh"
    }

Which id to use depends on the build you run, and a mismatch is refused:

* a development build (`npm run build:dev`) is `surfingkeys@github.com`.
* the released addon from AMO is `{a8332c60-5b6d-41ee-bfc8-e9bb331d34ad}`.

`about:debugging#/runtime/this-firefox` shows the id of whatever is actually loaded.

Save it as `surfingkeys.json` under

* [Mac OS X] ~/Library/Application Support/Mozilla/NativeMessagingHosts/
* [Linux] ~/.mozilla/native-messaging-hosts/
* [Windows] a registry key
  `HKEY_CURRENT_USER\SOFTWARE\Mozilla\NativeMessagingHosts\surfingkeys` pointing
  at the file, as for Chrome above.

Then restart your browser.

## Note on `<native>` settings

When the file can not be read — no host installed, or no answer from it — the page
keeps the settings from the last successful read, and the settings page says what went
wrong.

To see why, `touch ~/.surfingkeys.log.on` and reload the extension: each host process
then writes `~/.surfingkeys.<pid>.log`, holding every message in both directions.
Delete the marker to stop it.
