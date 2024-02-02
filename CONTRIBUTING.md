Thank you for willing to contribute on this project.

## Reporting issues

Please use below template to report issue, or you could click menu item from SurfingKeys icon in browser's tool bar.

    ## Error details



    SurfingKeys: 0.9.22

    Browser: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:57.0) Gecko/20100101 Firefox/57.0

    URL: <The_URL_Where_You_Find_The_Issue>

    ## Context

    **Please replace this with a description of how you were using SurfingKeys.**

## Build

    npm install
    npm run build:prod

    browser=firefox npm run build:prod             # build webextension for firefox

    npm run build:dev                         # build development version
    browser=firefox npm run build:dev         # build development version for firefox

## Load Extension

To load the extension:
1. Build using npm.
2. Open the browser's extension page. 
  - For Chrome, this can be accessed through "chrome://extensions".
3. Disable the Surfingkeys extension that was installed from the Google Chrome Store.
4. Enable "Developer mode" then click "Load unpacked."
5. For versions prior to v1.x, navigate to `<pathToSurfingkeys>/dist/Chrome-extensions`
6. For version v1.x, navigate to `<pathToSurfingkeys>/dist/<env>/<browser>`.
