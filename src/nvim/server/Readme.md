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

1. Create a `start.sh` under the same folder

        SCRIPT_PATH=$(dirname $BASH_SOURCE[0])
        exec nvim --headless -c "luafile $SCRIPT_PATH/server.lua"

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
