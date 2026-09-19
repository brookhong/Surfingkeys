#!/bin/sh
# See start.sh for why the shebang, the PATH line and both checks are needed.
PATH="/usr/local/bin:/opt/homebrew/bin:/opt/local/bin:$HOME/.local/bin:$PATH"
export PATH

SCRIPT_PATH="${0%/*}"

if ! command -v nvim >/dev/null 2>&1; then
    echo "surfingkeys: nvim not found in PATH ($PATH). Edit PATH in $0." >&2
    exit 127
fi
if [ ! -f "$SCRIPT_PATH/server.lua" ]; then
    echo "surfingkeys: $SCRIPT_PATH/server.lua not found." >&2
    exit 127
fi

exec nvim --headless -c "luafile $SCRIPT_PATH/server.lua" -u NONE
