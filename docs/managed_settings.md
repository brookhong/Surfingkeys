# Managed Surfingkeys settings (Firefox / LibreWolf)

Surfingkeys supports declarative configuration through Firefox managed storage (`browser.storage.managed`).

This is useful when you want a reproducible baseline from `policies.json`, while still allowing users to customize settings manually.

## Policy location

Managed data comes from enterprise policy:

- `policies.json` → `policies` → `3rdparty` → `Extensions` → `<extension-id>`

## Supported keys (minimal schema)

Surfingkeys reads only these keys:

- `snippets` (string)
  - Inline Surfingkeys settings JavaScript.
- `localPath` (string)
  - URL or filesystem path to a settings file.
  - Plain filesystem paths are normalized to `file:///...`.

If both `snippets` and `localPath` are present, `snippets` is used.

## Runtime behavior

1. Managed values are fallback defaults.
2. User-saved `snippets` / `localPath` always win.
3. Users can always update settings manually in the UI.
4. "Load settings from URL" remains available.

## Example policies

> Replace `<extension-id>` with your Surfingkeys extension ID.
> AMO Firefox build commonly uses `{a8332c60-5b6d-41ee-bfc8-e9bb331d34ad}`.

### Managed inline snippets

```json
{
  "policies": {
    "3rdparty": {
      "Extensions": {
        "<extension-id>": {
          "snippets": "settings.scrollStepSize = 120; settings.tabsMRUOrder = true;"
        }
      }
    }
  }
}
```

### Managed local file/path

```json
{
  "policies": {
    "3rdparty": {
      "Extensions": {
        "<extension-id>": {
          "localPath": "/home/user/.config/surfingkeys/config.js"
        }
      }
    }
  }
}
```

## Notes

- Managed config is read-only from the extension side.
- This feature intentionally stays small: no aliases, no wrappers, no mode flags, no integrity schema.
- The goal is clear behavior and easy maintenance.
