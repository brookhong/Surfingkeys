// Minimal mocks of the extension APIs that src/background/start.js talks to,
// so that start() can be exercised in jsdom.

// A stand-in for a chrome.events.Event: records listeners and can fire them.
function makeEvent() {
    const listeners = [];
    return {
        listeners,
        addListener: jest.fn((fn) => listeners.push(fn)),
        removeListener: jest.fn((fn) => {
            const i = listeners.indexOf(fn);
            if (i !== -1) {
                listeners.splice(i, 1);
            }
        }),
        hasListener: jest.fn((fn) => listeners.indexOf(fn) !== -1),
        // Invoke every registered listener, returning their results.
        fire: (...args) => listeners.map((fn) => fn(...args)),
    };
}

function tabMatches(tab, queryInfo, currentWindowId) {
    return Object.keys(queryInfo).every((key) => {
        const want = queryInfo[key];
        if (key === 'currentWindow' || key === 'lastFocusedWindow') {
            return want ? tab.windowId === currentWindowId : tab.windowId !== currentWindowId;
        }
        return tab[key] === want;
    });
}

/**
 * Build a fake `chrome` namespace.
 *
 * @param {object}  [opts]
 * @param {number}  [opts.manifestVersion=3] drives start()'s isMV3 branch.
 * @param {Array}   [opts.tabs=[]]           fixtures returned by chrome.tabs.query.
 * @param {number}  [opts.currentWindowId=1] which window `currentWindow: true` means.
 * @param {object}  [opts.storage]           seeds chrome.storage.{local,sync}.
 * @param {boolean} [opts.deferStorageReads=false] hold every storage read until
 *   `chrome.flushStorageReads()` is called. Storage is really asynchronous, and an
 *   MV3 worker is woken BY a message, so anything start() reads at boot arrives
 *   after the first request it has to answer -- which is only reproducible here by
 *   deciding when the read lands.
 * @param {Error}   [opts.storageReadThrows]  make every storage read throw, the way
 *   EVERY chrome API does once the extension context has been invalidated -- which
 *   is why it is not per-area. Note the browser stub's loadRawSettings does not go
 *   through chrome.storage, so under this option a boot fails only at the reads
 *   start() issues itself.
 * @param {string}  [opts.storageReadError]   the OTHER way a read fails: it is
 *   accepted and answered, but with `undefined` instead of items and
 *   chrome.runtime.lastError set for the duration of the callback. A caller that
 *   reaches into the answer without checking throws inside the callback here, where
 *   nothing is left to complete whatever was waiting on it.
 */
function createChromeMock(opts = {}) {
    const {
        manifestVersion = 3,
        tabs = [],
        currentWindowId = 1,
        storage = {},
        deferStorageReads = false,
        storageReadThrows = null,
        storageReadError = null,
    } = opts;

    const state = { tabs, currentWindowId };
    const pendingStorageReads = [];

    /*
     * What chrome.storage answers a read with: null/undefined asks for the whole
     * area, a string or array of strings for those keys alone -- a key absent from
     * the store is absent from the answer -- and an OBJECT for its keys with its
     * values as defaults for the ones the store does not have. Returning the whole
     * area regardless would hide a caller that forgot to ask for a key, and would
     * hand it a default it never requested.
     */
    const selectKeys = (data, keys) => {
        if (keys === null || keys === undefined) {
            return Object.assign({}, data);
        }
        const wanted = typeof keys === 'string' ? [keys] : keys;
        const defaults = Array.isArray(wanted) ? {} : wanted;
        const names = Array.isArray(wanted) ? wanted : Object.keys(wanted);
        const picked = {};
        names.forEach((k) => {
            if (Object.prototype.hasOwnProperty.call(data, k)) {
                picked[k] = data[k];
            } else if (Object.prototype.hasOwnProperty.call(defaults, k)) {
                picked[k] = defaults[k];
            }
        });
        return picked;
    };

    const makeStorageArea = (seed) => {
        const data = Object.assign({}, seed);
        return {
            data,
            MAX_WRITE_OPERATIONS_PER_MINUTE: 120,
            get: jest.fn((keys, cb) => {
                if (storageReadThrows) {
                    throw storageReadThrows;
                }
                if (!cb) {
                    return;
                }
                // snapshot at the moment the read is ISSUED, the way real storage
                // serialises it: a write that happens while the read is in flight is
                // not in its answer. That is what lets a stale answer land on top of
                // a fresher write, which is the whole point of deferring one.
                const snapshot = selectKeys(data, keys);
                const answer = storageReadError
                    ? () => {
                        chrome.runtime.lastError = { message: storageReadError };
                        try {
                            cb(undefined);
                        } finally {
                            // chrome clears it once the callback returns, so reading it
                            // later tells you nothing
                            chrome.runtime.lastError = undefined;
                        }
                    }
                    : () => cb(snapshot);
                if (deferStorageReads) {
                    pendingStorageReads.push(answer);
                } else {
                    answer();
                }
            }),
            set: jest.fn((items, cb) => {
                Object.assign(data, items);
                cb && cb();
            }),
            clear: jest.fn((cb) => {
                Object.keys(data).forEach((k) => delete data[k]);
                cb && cb();
            }),
        };
    };

    // Several call sites use chrome.tabs.update(props, cb) without a tabId, so
    // find the callback by type instead of by position.
    const callBack = (args, result) => {
        const cb = args.find((a) => typeof a === 'function');
        cb && cb(result);
    };

    const chrome = {
        state,
        runtime: {
            lastError: undefined,
            id: 'surfingkeys-test',
            getManifest: jest.fn(() => ({ manifest_version: manifestVersion })),
            getURL: jest.fn((p) => `chrome-extension://surfingkeys${p}`),
            setUninstallURL: jest.fn(),
            reload: jest.fn(),
            sendMessage: jest.fn(),
            sendNativeMessage: jest.fn((id, msg, cb) => cb && cb({ nativeReply: msg.command })),
            connectNative: jest.fn(),
            onMessage: makeEvent(),
            onInstalled: makeEvent(),
            onUserScriptMessage: makeEvent(),
        },
        tabs: {
            query: jest.fn((queryInfo, cb) =>
                cb(state.tabs.filter((t) => tabMatches(t, queryInfo, state.currentWindowId)))),
            update: jest.fn((...args) =>
                callBack(args, { id: typeof args[0] === 'number' ? args[0] : 999 })),
            remove: jest.fn((ids, cb) => cb && cb()),
            create: jest.fn((props, cb) => cb && cb({ id: 999, ...props })),
            move: jest.fn((ids, props, cb) => cb && cb()),
            reload: jest.fn((id, props, cb) => callBack([id, props, cb])),
            duplicate: jest.fn((id, cb) => cb && cb({ id: 999 })),
            group: jest.fn((props, cb) => cb && cb(77)),
            ungroup: jest.fn((ids, cb) => cb && cb()),
            sendMessage: jest.fn(() => Promise.resolve()),
            getZoom: jest.fn((id, cb) => cb && cb(1)),
            setZoom: jest.fn((id, factor, cb) => cb && cb()),
            getZoomSettings: jest.fn((id, cb) => cb && cb({ defaultZoomFactor: 1 })),
            captureVisibleTab: jest.fn((windowId, options, cb) => cb && cb('data:image/png;base64,AAA')),
            onRemoved: makeEvent(),
            onUpdated: makeEvent(),
            onCreated: makeEvent(),
            onMoved: makeEvent(),
            onActivated: makeEvent(),
            onDetached: makeEvent(),
            onAttached: makeEvent(),
        },
        tabGroups: {
            TAB_GROUP_ID_NONE: -1,
            query: jest.fn((info, cb) => cb && cb([])),
            update: jest.fn((id, props, cb) => cb && cb()),
        },
        windows: {
            create: jest.fn((props, cb) => cb && cb({ id: 2, tabs: [] })),
            update: jest.fn((id, props, cb) => cb && cb()),
            remove: jest.fn((id, cb) => cb && cb()),
            getAll: jest.fn((info, cb) => cb && cb([{ id: 1 }, { id: 2 }])),
            onFocusChanged: makeEvent(),
        },
        storage: {
            local: makeStorageArea(storage.local),
            sync: makeStorageArea(storage.sync),
        },
        commands: { onCommand: makeEvent() },
        bookmarks: {
            search: jest.fn((q, cb) => cb && cb([])),
            getTree: jest.fn((cb) => cb && cb([{ id: '0', title: '', children: [] }])),
            getSubTree: jest.fn((id, cb) => cb && cb([{ id, children: [] }])),
            create: jest.fn((b, cb) => cb && cb({ id: 'new', ...b })),
            remove: jest.fn((id, cb) => cb && cb()),
        },
        history: {
            search: jest.fn((q, cb) => cb && cb([])),
            addUrl: jest.fn(),
            deleteUrl: jest.fn((details, cb) => cb && cb()),
            deleteRange: jest.fn((range, cb) => cb && cb()),
        },
        sessions: {
            getRecentlyClosed: jest.fn((filter, cb) => cb && cb([])),
            restore: jest.fn(),
        },
        downloads: {
            search: jest.fn((q, cb) => cb && cb([])),
            download: jest.fn(),
            erase: jest.fn(),
            setShelfEnabled: jest.fn(),
        },
        topSites: { get: jest.fn((cb) => cb && cb([])) },
        tts: {
            getVoices: jest.fn((cb) => cb && cb([])),
            speak: jest.fn(),
            stop: jest.fn(),
        },
        userScripts: {
            configureWorld: jest.fn(),
            register: jest.fn((scripts, cb) => cb && cb()),
            unregister: jest.fn((filter, cb) => cb && cb()),
            getScripts: jest.fn((filter, cb) => cb && cb([])),
        },
        scripting: { executeScript: jest.fn((injection, cb) => cb && cb([])) },
        action: { setIcon: jest.fn() },
        browserAction: { setIcon: jest.fn() },
        proxy: { settings: { set: jest.fn(), clear: jest.fn() } },
    };

    // Answer every storage read held back by `deferStorageReads`, in the order they
    // were made. Not part of the chrome API: it is how a test says "and now the disk
    // came back", which is the only moment a boot-time read can be observed at.
    chrome.flushStorageReads = () => {
        const pending = pendingStorageReads.splice(0);
        pending.forEach((answer) => answer());
        return pending.length;
    };

    return chrome;
}

/**
 * Build the `browser` adapter start() is parameterised over, mirroring the
 * shape src/background/chrome.js passes in.
 *
 * @param {object} [opts]
 * @param {object} [opts.settings] merged over start()'s defaults by loadRawSettings.
 */
function createBrowserStub(opts = {}) {
    const { settings = {}, name = 'Chrome', ...rest } = opts;
    // Same contract as getSubSettings() in src/background/start.js: a null/empty
    // key set means "everything", otherwise only the requested keys come back.
    const subset = (set, keys) => {
        if (!keys) {
            return set;
        }
        const picked = {};
        (Array.isArray(keys) ? keys : [keys]).forEach((k) => {
            picked[k] = set[k];
        });
        return picked;
    };
    return {
        name,
        detectTabTitleChange: true,
        settings,
        _setNewTabUrl: jest.fn(() => 'chrome://newtab/'),
        // start() calls this as loadRawSettings(keys, cb, defaultSet); the real
        // adapters merge storage over defaultSet then narrow it to `keys`.
        loadRawSettings: jest.fn((keys, cb, defaultSet) => {
            cb(subset(Object.assign({}, defaultSet, settings), keys));
        }),
        _applyProxySettings: jest.fn(),
        _getContainerName: jest.fn(() => undefined),
        getLatestHistoryItem: jest.fn((text, maxResults, cb) => cb([])),
        ...rest,
    };
}

/**
 * Stub global.fetch the way start.js's internal request() expects: it reads a
 * charset off the content-type header and decodes an ArrayBuffer.
 */
function mockFetchText(text, contentType = 'text/plain; charset=utf-8') {
    global.fetch = jest.fn(() => Promise.resolve({
        headers: { get: () => contentType },
        arrayBuffer: () => Promise.resolve(new TextEncoder().encode(text).buffer),
        blob: () => Promise.resolve({ size: text.length }),
    }));
    return global.fetch;
}

function mockFetchFailure(error = new Error('offline')) {
    global.fetch = jest.fn(() => Promise.reject(error));
    return global.fetch;
}

// Let queued promise callbacks (request(), _loadSettingsFromUrl(), ...) run.
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

module.exports = {
    makeEvent,
    createChromeMock,
    createBrowserStub,
    mockFetchText,
    mockFetchFailure,
    flushPromises,
};
