import {
    _save,
    dictFromArray,
    extendObject,
    getSubSettings,
    start,
} from '../../src/background/start.js';
import llmClients from '../../src/background/llm.js';
import {
    createBrowserStub,
    createChromeMock,
    flushPromises,
    mockFetchFailure,
    mockFetchText,
} from './chromeMock.js';

describe('dictFromArray', () => {
    it('builds a dict mapping each item to the given value', () => {
        expect(dictFromArray(['a', 'b', 'c'], 1)).toEqual({a: 1, b: 1, c: 1});
    });

    it('handles an empty array', () => {
        expect(dictFromArray([], 'x')).toEqual({});
    });
});

describe('extendObject', () => {
    it('copies own enumerable properties from source to target', () => {
        const target = {a: 1};
        extendObject(target, {b: 2, c: 3});
        expect(target).toEqual({a: 1, b: 2, c: 3});
    });

    it('overwrites existing keys on target', () => {
        const target = {a: 1};
        extendObject(target, {a: 99});
        expect(target).toEqual({a: 99});
    });

    it('mutates and returns nothing', () => {
        const target = {};
        expect(extendObject(target, {x: 1})).toBeUndefined();
        expect(target).toEqual({x: 1});
    });
});

describe('getSubSettings', () => {
    const set = {a: 1, b: 2, c: 3};

    it('returns the whole set when keys is null/undefined/""', () => {
        expect(getSubSettings(set)).toBe(set);
        expect(getSubSettings(set, null)).toBe(set);
        expect(getSubSettings(set, "")).toBe(set);
    });

    it('picks a single key when given a string', () => {
        expect(getSubSettings(set, 'b')).toEqual({b: 2});
    });

    it('picks multiple keys when given an array', () => {
        expect(getSubSettings(set, ['a', 'c'])).toEqual({a: 1, c: 3});
    });

    it('preserves undefined for keys missing from the set', () => {
        expect(getSubSettings(set, ['a', 'missing'])).toEqual({a: 1, missing: undefined});
    });
});

describe('_save', () => {
    let syncStorage;
    let localStorage;
    let textEncoder;

    beforeEach(() => {
        global.chrome = {
            storage: {
                sync: {},
                local: {},
            },
        };
        syncStorage = global.chrome.storage.sync;
        localStorage = global.chrome.storage.local;
        textEncoder = new TextEncoder();
    });

    const mockFetchContent = (content, contentType) => {
        global.fetch = jest.fn().mockResolvedValue({
            headers: {get: () => contentType},
            arrayBuffer: () => Promise.resolve(textEncoder.encode(content).buffer),
        });
    };

    it('strips localPath/snippets before saving to sync storage', () => {
        const set = jest.fn().mockImplementation((data, cb) => cb && cb());
        syncStorage.set = set;
        _save(syncStorage, {localPath: 'http://x', snippets: 's', a: 1, b: 2}, () => {});
        expect(set).toHaveBeenCalledWith({a: 1, b: 2}, expect.any(Function));
        expect(set.mock.calls[0][0]).not.toHaveProperty('localPath');
        expect(set.mock.calls[0][0]).not.toHaveProperty('snippets');
    });

    it('does not write to sync storage when only one key remains after stripping', () => {
        const set = jest.fn();
        syncStorage.set = set;
        _save(syncStorage, {localPath: 'http://x'}, () => {});
        expect(set).not.toHaveBeenCalled();
    });

    it('writes directly to sync storage when no localPath is present', () => {
        const set = jest.fn().mockImplementation((data, cb) => cb && cb());
        syncStorage.set = set;
        _save(syncStorage, {a: 1, b: 2}, () => {});
        expect(set).toHaveBeenCalledWith({a: 1, b: 2}, expect.any(Function));
    });

    it('fetches snippets from localPath and caches them in local storage', async () => {
        mockFetchContent('snippet-data', null);
        const set = jest.fn().mockImplementation((data, cb) => cb && cb());
        localStorage.set = set;
        await new Promise((resolve) => {
            _save(localStorage, {localPath: 'http://x', snippets: 'stale'}, resolve);
        });
        expect(global.fetch).toHaveBeenCalledWith('http://x', expect.objectContaining({method: 'GET'}));
        expect(set).toHaveBeenCalledWith({localPath: 'http://x', snippets: 'snippet-data'}, expect.any(Function));
    });

    it('writes directly to local storage when no localPath is present', () => {
        const set = jest.fn().mockImplementation((data, cb) => cb && cb());
        localStorage.set = set;
        _save(localStorage, {a: 1}, () => {});
        expect(set).toHaveBeenCalledWith({a: 1}, expect.any(Function));
    });
});

describe('start', () => {
    const TABS = [
        {id: 11, index: 0, windowId: 1, url: 'https://a.example/', title: 'A', active: false, pinned: false},
        {id: 12, index: 1, windowId: 1, url: 'https://b.example/', title: 'B', active: true, pinned: false},
        {id: 13, index: 2, windowId: 1, url: 'https://c.example/', title: 'C', active: false, pinned: true},
        {id: 21, index: 0, windowId: 2, url: 'https://d.example/', title: 'D', active: true, pinned: false},
    ];

    // Boot start() against fake extension APIs and hand back everything a test
    // needs to poke at it.
    const bootstrap = ({chrome: chromeOpts, browser: browserOpts} = {}) => {
        const chrome = createChromeMock({tabs: TABS.map((t) => ({...t})), ...chromeOpts});
        global.chrome = chrome;
        const browser = createBrowserStub(browserOpts);
        const returned = start(browser);
        // Settings writes land in chrome.storage.local via _save(). Read the
        // accumulated store rather than the call arguments: _save() mutates the
        // diff object it is handed (its sync branch strips localPath/snippets).
        const stored = () => chrome.storage.local.data;
        // _broadcastSettings() posts one message per tab, all sharing the same
        // settings object, so a single broadcast shows up once per open tab.
        const broadcasts = () => chrome.tabs.sendMessage.mock.calls
            .filter((c) => c[1] && c[1].subject === 'settingsUpdated')
            .map((c) => c[1].settings);
        // start() registers exactly one runtime.onMessage listener: the dispatcher.
        // Everything it does is reachable only through the listeners it registers,
        // so drive it the way the browser does.
        const dispatch = (message, sender = {}) => {
            const sendResponse = jest.fn();
            const kept = chrome.runtime.onMessage.listeners[0](message, sender, sendResponse);
            return {sendResponse, kept};
        };
        return {returned, chrome, browser, dispatch, stored, broadcasts};
    };

    // Mirror RUNTIME() in src/content_scripts/common/runtime.js: the payload keys
    // come first and `action`/`needResponse` are appended. updateInputHistory
    // depends on that ordering (it reads the first key of the message).
    const runtimeMessage = (action, args = {}, needResponse = false) => {
        args.action = action;
        args.needResponse = needResponse;
        return args;
    };

    const senderFor = (tabId) => {
        const tab = TABS.find((t) => t.id === tabId);
        return {tab: {...tab}, frameId: 0, url: tab.url, origin: new URL(tab.url).origin};
    };

    describe('initialization', () => {
        it('publishes its handlers through runtime.onMessage rather than a return value', () => {
            const {returned, dispatch} = bootstrap();
            // start() returns nothing: the adapters in src/background/{chrome,firefox,safari}.js
            // call it for its side effects only.
            expect(returned).toBeUndefined();
            expect(dispatch({action: 'getTopURL', needResponse: true}, senderFor(12)).sendResponse)
                .toHaveBeenCalledWith({url: 'https://b.example/'});
            expect(dispatch({action: 'getQueueURLs', needResponse: true}, {}).sendResponse)
                .toHaveBeenCalledWith({queueURLs: []});
        });

        it('asks the browser adapter for the new tab url', () => {
            const {browser} = bootstrap();
            expect(browser._setNewTabUrl).toHaveBeenCalled();
        });

        it('loads all settings and applies the persisted proxy config on boot', () => {
            const {browser} = bootstrap();
            expect(browser.loadRawSettings).toHaveBeenCalledWith(null, expect.any(Function), expect.any(Object));
            expect(browser._applyProxySettings).toHaveBeenCalledWith(
                expect.objectContaining({proxyMode: 'clear', proxy: [], blocklist: {}}));
        });

        it('normalizes a legacy string proxy setting into an array', () => {
            const {browser} = bootstrap({
                browser: {settings: {proxy: 'PROXY localhost:8080', autoproxy_hosts: ['a.com']}},
            });
            expect(browser._applyProxySettings).toHaveBeenCalledWith(expect.objectContaining({
                proxy: ['PROXY localhost:8080'],
                autoproxy_hosts: [['a.com']],
            }));
        });

        it('subscribes to the tab, window and command events it needs', () => {
            const {chrome} = bootstrap();
            expect(chrome.tabs.onRemoved.addListener).toHaveBeenCalled();
            expect(chrome.tabs.onUpdated.addListener).toHaveBeenCalled();
            expect(chrome.tabs.onCreated.addListener).toHaveBeenCalled();
            expect(chrome.tabs.onMoved.addListener).toHaveBeenCalled();
            expect(chrome.tabs.onActivated.addListener).toHaveBeenCalled();
            expect(chrome.tabs.onDetached.addListener).toHaveBeenCalled();
            expect(chrome.tabs.onAttached.addListener).toHaveBeenCalled();
            expect(chrome.windows.onFocusChanged.addListener).toHaveBeenCalled();
            expect(chrome.commands.onCommand.addListener).toHaveBeenCalled();
            expect(chrome.runtime.onMessage.listeners).toHaveLength(1);
        });

        it('registers the uninstall survey url', () => {
            const {chrome} = bootstrap();
            expect(chrome.runtime.setUninstallURL).toHaveBeenCalledWith(expect.stringContaining('http'));
        });

        it('wires up the user script world on MV3', () => {
            const {chrome} = bootstrap({chrome: {manifestVersion: 3}});
            expect(chrome.runtime.onUserScriptMessage.listeners).toHaveLength(1);
            expect(chrome.runtime.onInstalled.listeners).toHaveLength(1);

            chrome.runtime.onInstalled.fire({reason: 'install'});
            expect(chrome.userScripts.configureWorld).toHaveBeenCalledWith(
                expect.objectContaining({messaging: true}));
        });

        it('marks messages arriving from a user script and dispatches them', () => {
            const {chrome} = bootstrap();
            const sendResponse = jest.fn();
            const message = {action: 'getTopURL', needResponse: true};
            chrome.runtime.onUserScriptMessage.fire(message, senderFor(12), sendResponse);
            expect(message.fromUserScript).toBe(true);
            expect(sendResponse).toHaveBeenCalledWith({url: 'https://b.example/'});
        });

        it('does not touch the user script APIs on MV2', () => {
            const {chrome} = bootstrap({chrome: {manifestVersion: 2}});
            expect(chrome.runtime.onUserScriptMessage.addListener).not.toHaveBeenCalled();
            expect(chrome.runtime.onInstalled.addListener).not.toHaveBeenCalled();
        });

        it('falls back to an empty container list when the adapter has no container support', () => {
            const {dispatch} = bootstrap();
            const {sendResponse} = dispatch({action: 'getContainers', needResponse: true}, senderFor(12));
            expect(sendResponse).toHaveBeenCalledWith({containers: []});
        });
    });

    describe('message dispatch', () => {
        it('routes a message to the handler named by its action', () => {
            const {dispatch} = bootstrap();
            const {sendResponse} = dispatch({action: 'getTopURL', needResponse: true}, senderFor(12));
            expect(sendResponse).toHaveBeenCalledWith({url: 'https://b.example/'});
        });

        it('answers synchronously and closes the port when the handler returns a result', () => {
            const {dispatch} = bootstrap();
            const message = {action: 'getTopURL', needResponse: true};
            const {kept, sendResponse} = dispatch(message, senderFor(12));
            // false => "I already responded, don't keep the port open".
            expect(kept).toBe(false);
            expect(message.needResponse).toBe(false);
            expect(sendResponse).toHaveBeenCalledTimes(1);
        });

        it('keeps the port open and queues the message when the handler responds later', () => {
            const {chrome, dispatch} = bootstrap();
            let deliverVoices;
            chrome.tts.getVoices = jest.fn((cb) => {
                deliverVoices = cb;
            });

            const message = {action: 'getVoices', needResponse: true};
            const {kept, sendResponse} = dispatch(message, senderFor(12));

            // true => "I'll call sendResponse asynchronously, keep the port open".
            expect(kept).toBe(true);
            expect(sendResponse).not.toHaveBeenCalled();

            deliverVoices([{voiceName: 'Alex'}]);
            expect(sendResponse).toHaveBeenCalledWith({voices: [{voiceName: 'Alex'}]});
        });

        it('does not respond when the sender did not ask for one', () => {
            const {dispatch} = bootstrap();
            const {sendResponse, kept} = dispatch({action: 'getTopURL'}, senderFor(12));
            expect(sendResponse).not.toHaveBeenCalled();
            expect(kept).toBeUndefined();
        });

        it('logs and ignores an unknown action instead of throwing', () => {
            const log = jest.spyOn(console, 'log').mockImplementation(() => {});
            const {dispatch} = bootstrap();
            expect(() => dispatch({action: 'noSuchAction', needResponse: true})).not.toThrow();
            expect(log).toHaveBeenCalledWith(expect.stringContaining('unexpected runtime message'));
            log.mockRestore();
        });
    });

    describe('getState', () => {
        const stateFor = (settings, message = {}, tabId = 12) => {
            const {dispatch} = bootstrap({browser: {settings}});
            const {sendResponse} = dispatch(
                {action: 'getState', needResponse: true, ...message}, senderFor(tabId));
            return sendResponse.mock.calls[0][0];
        };

        it('is enabled when nothing blocks the url', () => {
            expect(stateFor({blocklist: {}}).state).toBe('enabled');
        });

        it('is disabled everywhere when the blocklist holds the global pattern', () => {
            expect(stateFor({blocklist: {'.*': 1}}).state).toBe('disabled');
        });

        it('is disabled for a blocklisted origin only', () => {
            expect(stateFor({blocklist: {'https://b.example': 1}}).state).toBe('disabled');
            expect(stateFor({blocklist: {'https://other.example': 1}}).state).toBe('enabled');
        });

        it('is disabled when the blocklist pattern matches the url', () => {
            const message = {blocklistPattern: {source: 'b\\.example', flags: ''}};
            expect(stateFor({blocklist: {}}, message).state).toBe('disabled');
        });

        it('is lurking when the lurking pattern matches the url', () => {
            const message = {lurkingPattern: {source: 'b\\.example', flags: ''}};
            expect(stateFor({blocklist: {}}, message).state).toBe('lurking');
        });

        it('passes the pdf viewer and proxy settings back to the content script', () => {
            const res = stateFor({blocklist: {}, noPdfViewer: true, proxyMode: 'byhost', proxy: ['p']});
            expect(res).toMatchObject({noPdfViewer: true, proxyMode: 'byhost', proxy: ['p']});
        });
    });

    describe('per-tab url bookkeeping', () => {
        it('records the urls a tab visits and reports them back', () => {
            const {dispatch} = bootstrap();
            dispatch({action: 'tabURLAccessed', url: 'https://b.example/one', title: 'One'}, senderFor(12));
            dispatch({action: 'tabURLAccessed', url: 'https://b.example/two', title: 'Two'}, senderFor(12));

            const {sendResponse} = dispatch({action: 'getTabURLs', needResponse: true}, senderFor(12));
            expect(sendResponse).toHaveBeenCalledWith({urls: [
                {url: 'https://b.example/one', title: 'One'},
                {url: 'https://b.example/two', title: 'Two'},
            ]});
        });

        it('keeps each tab\'s urls separate', () => {
            const {dispatch} = bootstrap();
            dispatch({action: 'tabURLAccessed', url: 'https://a.example/x', title: 'X'}, senderFor(11));
            const {sendResponse} = dispatch({action: 'getTabURLs', needResponse: true}, senderFor(12));
            expect(sendResponse).toHaveBeenCalledWith({urls: []});
        });

        it('reports no tab index while tab indices are hidden', () => {
            const {dispatch} = bootstrap();
            const {sendResponse} = dispatch(
                {action: 'tabURLAccessed', needResponse: true, url: 'u', title: 't'}, senderFor(13));
            expect(sendResponse).toHaveBeenCalledWith({active: false, index: 0});
        });

        it('reports a 1-based tab index once showTabIndices is switched on', () => {
            const {dispatch} = bootstrap();
            dispatch({action: 'updateSettings', scope: 'snippets', settings: {showTabIndices: true}}, {});
            const {sendResponse} = dispatch(
                {action: 'tabURLAccessed', needResponse: true, url: 'u', title: 't'}, senderFor(13));
            // tab 13 sits at index 2
            expect(sendResponse).toHaveBeenCalledWith({active: false, index: 3});
        });

        it('returns an empty url for a sender that is not a tab', () => {
            const {dispatch} = bootstrap();
            const {sendResponse} = dispatch({action: 'getTopURL', needResponse: true}, {});
            expect(sendResponse).toHaveBeenCalledWith({url: ''});
        });
    });

    describe('queued urls', () => {
        it('accumulates, reports and clears the queue', () => {
            const {dispatch} = bootstrap();
            dispatch({action: 'queueURLs', urls: ['https://1.example/']}, {});
            dispatch({action: 'queueURLs', urls: ['https://2.example/', 'https://3.example/']}, {});

            let res = dispatch({action: 'getQueueURLs', needResponse: true}, {});
            expect(res.sendResponse).toHaveBeenCalledWith({
                queueURLs: ['https://1.example/', 'https://2.example/', 'https://3.example/'],
            });

            dispatch({action: 'clearQueueURLs'}, {});
            res = dispatch({action: 'getQueueURLs', needResponse: true}, {});
            expect(res.sendResponse).toHaveBeenCalledWith({queueURLs: []});
        });

        it('opens the next queued url when a tab closes', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'queueURLs', urls: ['https://queued.example/']}, {});
            chrome.tabs.onRemoved.fire(12);
            expect(chrome.tabs.create).toHaveBeenCalledWith({active: false, url: 'https://queued.example/'});
        });
    });

    describe('tab navigation', () => {
        it('focuses the nth tab of the current window', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'focusTabByIndex', repeats: 2}, senderFor(12));
            expect(chrome.tabs.update).toHaveBeenCalledWith(12, {active: true});
        });

        it('ignores an out-of-range tab index', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'focusTabByIndex', repeats: 99}, senderFor(12));
            dispatch({action: 'focusTabByIndex', repeats: 0}, senderFor(12));
            expect(chrome.tabs.update).not.toHaveBeenCalled();
        });

        it('moves to the next tab', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'nextTab', repeats: 1}, senderFor(11));
            expect(chrome.tabs.update).toHaveBeenCalledWith(12, {active: true});
        });

        it('wraps from the first tab to the last going backwards', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'previousTab', repeats: 1}, senderFor(11));
            expect(chrome.tabs.update).toHaveBeenCalledWith(13, {active: true});
        });

        it('wraps from the last tab to the first going forwards', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'nextTab', repeats: 1}, senderFor(13));
            expect(chrome.tabs.update).toHaveBeenCalledWith(11, {active: true});
        });

        it('returns to the previously activated tab', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.tabs.onActivated.fire({tabId: 11, windowId: 1});
            chrome.tabs.onActivated.fire({tabId: 13, windowId: 1});
            chrome.tabs.update.mockClear();

            dispatch({action: 'goToLastTab'}, senderFor(13));
            expect(chrome.tabs.update).toHaveBeenCalledWith(11, {active: true});
        });

        it('does nothing for goToLastTab without any tab history', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'goToLastTab'}, senderFor(12));
            expect(chrome.tabs.update).not.toHaveBeenCalled();
        });

        it('focuses the window first when the target tab lives elsewhere', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'focusTab', tabId: 21, windowId: 2}, senderFor(12));
            expect(chrome.windows.update).toHaveBeenCalledWith(2, {focused: true}, expect.any(Function));
            expect(chrome.tabs.update).toHaveBeenCalledWith(21, {active: true});
        });
    });

    describe('tab manipulation', () => {
        it('closes the requested tab ids', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'closeTabByIds', tabIds: [11, 13]}, senderFor(12));
            expect(chrome.tabs.remove).toHaveBeenCalledWith([11, 13]);
        });

        it('toggles the pinned state of the active tab', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'togglePinTab'}, senderFor(12));
            // tab 12 is the active tab of window 1 and is unpinned
            expect(chrome.tabs.update).toHaveBeenCalledWith(12, {pinned: true});
        });
    });

    describe('keyboard commands', () => {
        const fireCommand = (setup, command) => {
            const booted = bootstrap(setup);
            booted.chrome.commands.onCommand.fire(command);
            return booted;
        };

        it('closes the active tab', () => {
            const {chrome} = fireCommand({}, 'closeTab');
            expect(chrome.tabs.remove).toHaveBeenCalledWith(12);
        });

        it('cycles to the next tab, wrapping at the end', () => {
            const {chrome} = fireCommand({chrome: {currentWindowId: 2}}, 'nextTab');
            // window 2 holds a single tab, so next wraps back onto itself
            expect(chrome.tabs.update).toHaveBeenCalledWith(21, {active: true});
        });

        it('cycles to the previous tab', () => {
            const {chrome} = fireCommand({}, 'previousTab');
            expect(chrome.tabs.update).toHaveBeenCalledWith(11, {active: true});
        });

        it('reloads every tab and restarts the extension', () => {
            const {chrome} = fireCommand({}, 'restartext');
            expect(chrome.tabs.reload).toHaveBeenCalledTimes(4);
            expect(chrome.runtime.reload).toHaveBeenCalled();
        });

        it('ignores commands it does not own', () => {
            const {chrome} = fireCommand({}, 'someOtherCommand');
            expect(chrome.tabs.remove).not.toHaveBeenCalled();
            expect(chrome.tabs.update).not.toHaveBeenCalled();
        });
    });

    describe('tab event notifications', () => {
        it('tells the newly activated tab it is active, and deactivates the previous one', () => {
            const {chrome} = bootstrap();
            chrome.tabs.onActivated.fire({tabId: 11, windowId: 1});
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(11, {subject: 'tabActivated'}, {frameId: 0});

            chrome.tabs.sendMessage.mockClear();
            chrome.tabs.onActivated.fire({tabId: 12, windowId: 1});
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(11, {subject: 'tabDeactivated'}, {frameId: 0});
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(12, {subject: 'tabActivated'}, {frameId: 0});
        });

        it('forwards a title change when the adapter opts in', () => {
            const {chrome} = bootstrap();
            chrome.tabs.onUpdated.fire(12, {title: 'New title'}, TABS[1]);
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                12, {subject: 'titleChanged', changeInfo: {title: 'New title'}}, {frameId: 0});
        });

        it('does not forward a title change when the adapter opts out', () => {
            const {chrome} = bootstrap({browser: {detectTabTitleChange: false}});
            chrome.tabs.onUpdated.fire(12, {title: 'New title'}, TABS[1]);
            expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
        });

        it('broadcasts tab indices on reorder only while showTabIndices is on', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.tabs.onMoved.fire();
            expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();

            dispatch({action: 'updateSettings', scope: 'snippets', settings: {showTabIndices: true}}, {});
            chrome.tabs.onMoved.fire();
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(11, {subject: 'tabIndexChange', index: 1}, {frameId: 0});
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(12, {subject: 'tabIndexChange', index: 2}, {frameId: 0});
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(13, {subject: 'tabIndexChange', index: 3}, {frameId: 0});
        });

        it('forgets a tab\'s recorded urls once it is closed', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'tabURLAccessed', url: 'https://b.example/one', title: 'One'}, senderFor(12));
            chrome.tabs.onRemoved.fire(12);

            const {sendResponse} = dispatch({action: 'getTabURLs', needResponse: true}, senderFor(12));
            expect(sendResponse).toHaveBeenCalledWith({urls: []});
        });
    });

    describe('blocklist and mouse query toggles', () => {
        it('adds the sender origin to the blocklist and reports the new state', () => {
            const {dispatch} = bootstrap({browser: {settings: {blocklist: {}}}});
            const {sendResponse} = dispatch({action: 'toggleBlocklist', needResponse: true}, senderFor(12));
            expect(sendResponse).toHaveBeenCalledWith({
                state: 'disabled',
                blocklist: {'https://b.example': 1},
                url: 'https://b.example',
            });
        });

        it('removes an already blocklisted origin', () => {
            const {dispatch} = bootstrap({
                browser: {settings: {blocklist: {'https://b.example': 1}}},
            });
            const {sendResponse} = dispatch({action: 'toggleBlocklist', needResponse: true}, senderFor(12));
            expect(sendResponse).toHaveBeenCalledWith({
                state: 'enabled',
                blocklist: {},
                url: 'https://b.example',
            });
        });

        it('toggles globally when the sender is the extension itself', () => {
            const {dispatch} = bootstrap({browser: {settings: {blocklist: {}}}});
            const sender = {origin: 'chrome-extension://surfingkeys', frameId: 0};
            const {sendResponse} = dispatch({action: 'toggleBlocklist', needResponse: true}, sender);
            expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
                url: '.*',
                blocklist: {'.*': 1},
            }));
        });

        it('persists and broadcasts the updated blocklist', () => {
            const {dispatch, stored, broadcasts} = bootstrap({browser: {settings: {blocklist: {}}}});
            dispatch({action: 'toggleBlocklist', needResponse: true}, senderFor(12));
            expect(stored()).toMatchObject({blocklist: {'https://b.example': 1}});
            expect(stored().savedAt).toEqual(expect.any(Number));
            // one broadcast per open tab, all carrying the same settings object
            expect(broadcasts()).toHaveLength(4);
            expect(broadcasts()[0]).toMatchObject({blocklist: {'https://b.example': 1}});
        });

        it('adds then removes an origin from the mouse-select-to-query list', () => {
            let boot = bootstrap({browser: {settings: {mouseSelectToQuery: []}}});
            boot.dispatch({action: 'toggleMouseQuery', origin: 'https://b.example'}, senderFor(12));
            expect(boot.stored()).toMatchObject({mouseSelectToQuery: ['https://b.example']});

            boot = bootstrap({browser: {settings: {mouseSelectToQuery: ['https://b.example']}}});
            boot.dispatch({action: 'toggleMouseQuery', origin: 'https://b.example'}, senderFor(12));
            expect(boot.stored()).toMatchObject({mouseSelectToQuery: []});
        });

        it('ignores a mouse query toggle coming from an extension page', () => {
            const {chrome, dispatch} = bootstrap({browser: {settings: {mouseSelectToQuery: []}}});
            const sender = {tab: {id: 5, url: 'chrome-extension://surfingkeys/pages/frontend.html'}, frameId: 0};
            dispatch({action: 'toggleMouseQuery', origin: 'x'}, sender);
            expect(chrome.storage.local.set).not.toHaveBeenCalled();
        });
    });

    describe('vim marks', () => {
        it('stores a new mark', () => {
            const {dispatch, stored} = bootstrap({browser: {settings: {marks: {}}}});
            dispatch({action: 'addVIMark', mark: {a: {url: 'https://a.example/'}}}, senderFor(12));
            expect(stored()).toMatchObject({marks: {a: {url: 'https://a.example/'}}});
        });

        it('activates the existing tab when jumping to a mark', () => {
            const {chrome, dispatch} = bootstrap({
                browser: {settings: {marks: {a: {url: 'https://a.example/'}}}},
            });
            dispatch({action: 'jumpVIMark', mark: 'a'}, senderFor(12));
            expect(chrome.tabs.update).toHaveBeenCalledWith(11, {active: true});
        });

        it('queues the saved scroll position when jumping to a mark', () => {
            const {chrome, dispatch} = bootstrap({
                browser: {settings: {marks: {a: {url: 'https://a.example/', scrollTop: 240}}}},
            });
            dispatch({action: 'jumpVIMark', mark: 'a'}, senderFor(12));
            // the position is delivered to the tab the next time it reports a url
            dispatch({action: 'tabURLAccessed', url: 'https://a.example/', title: 'A'}, senderFor(11));
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                11, {subject: 'setScrollPos', scrollLeft: undefined, scrollTop: 240}, {frameId: 0});
        });

        it('opens a new tab when no tab holds the marked url', () => {
            const {chrome, dispatch} = bootstrap({
                browser: {settings: {marks: {a: {url: 'https://gone.example/'}}}},
            });
            dispatch({action: 'jumpVIMark', mark: 'a'}, senderFor(12));
            expect(chrome.tabs.create).toHaveBeenCalledWith(
                expect.objectContaining({url: 'https://gone.example/', active: true}),
                expect.any(Function));
        });

        it('does nothing for an unknown mark', () => {
            const {chrome, dispatch} = bootstrap({browser: {settings: {marks: {}}}});
            dispatch({action: 'jumpVIMark', mark: 'zz'}, senderFor(12));
            expect(chrome.tabs.update).not.toHaveBeenCalled();
            expect(chrome.tabs.create).not.toHaveBeenCalled();
        });

        it('drops a mark through removeURL', () => {
            const {dispatch, stored} = bootstrap({
                browser: {settings: {marks: {a: 1, b: 2}}},
            });
            const {sendResponse} = dispatch({action: 'removeURL', needResponse: true, uid: 'Ma'}, senderFor(12));
            expect(stored()).toMatchObject({marks: {b: 2}});
            expect(sendResponse).toHaveBeenCalledWith({response: 'Done'});
        });
    });

    describe('settings', () => {
        it('wipes both storage areas and republishes defaults on reset', () => {
            const {chrome, browser, dispatch} = bootstrap();
            const {sendResponse} = dispatch({action: 'resetSettings', needResponse: true}, senderFor(12));
            expect(chrome.storage.local.clear).toHaveBeenCalled();
            expect(chrome.storage.sync.clear).toHaveBeenCalled();
            expect(browser._applyProxySettings).toHaveBeenCalledTimes(2); // boot + reset
            expect(sendResponse).toHaveBeenCalledWith({settings: expect.objectContaining({proxyMode: 'clear'})});
        });

        it('returns a settings subset for a specific key', () => {
            const {dispatch} = bootstrap({browser: {settings: {blocklist: {x: 1}, marks: {m: 2}}}});
            const {sendResponse} = dispatch({action: 'getSettings', needResponse: true, key: 'marks'}, senderFor(12));
            expect(sendResponse).toHaveBeenCalledWith({settings: {marks: {m: 2}}});
        });

        it('reads straight through the adapter for the RAW key', () => {
            const {browser, dispatch} = bootstrap({browser: {settings: {marks: {m: 2}}}});
            const message = {action: 'getSettings', needResponse: true, key: 'RAW'};
            dispatch(message, senderFor(12));
            expect(browser.loadRawSettings).toHaveBeenLastCalledWith('', expect.any(Function));
            expect(message.key).toBe('');
        });

        it('decorates a full settings request with runtime capabilities', () => {
            const {dispatch} = bootstrap();
            const {sendResponse} = dispatch({action: 'getSettings', needResponse: true}, senderFor(12));
            expect(sendResponse).toHaveBeenCalledWith({settings: expect.objectContaining({
                isMV3: true,
                isUserScriptsAvailable: true,
            })});
        });

        it('reports userScripts as unavailable when the API is missing', () => {
            const chromeMock = createChromeMock({tabs: TABS.map((t) => ({...t}))});
            delete chromeMock.userScripts;
            global.chrome = chromeMock;
            start(createBrowserStub());
            const sendResponse = jest.fn();
            chromeMock.runtime.onMessage.listeners[0](
                {action: 'getSettings', needResponse: true}, senderFor(12), sendResponse);
            expect(sendResponse).toHaveBeenCalledWith({settings: expect.objectContaining({
                isUserScriptsAvailable: false,
            })});
        });

        it('persists and broadcasts a normal settings update', () => {
            const {dispatch, stored, broadcasts} = bootstrap();
            dispatch({action: 'updateSettings', settings: {scrollStepSize: 120}}, senderFor(12));
            expect(stored()).toMatchObject({scrollStepSize: 120});
            expect(broadcasts()[0]).toMatchObject({scrollStepSize: 120});
        });

        it('applies a snippets-scoped update to the live config without persisting it', () => {
            const {chrome, dispatch} = bootstrap();
            const {kept, sendResponse} = dispatch({
                action: 'updateSettings',
                needResponse: true,
                scope: 'snippets',
                settings: {focusAfterClosed: 'left', llm: {}},
            }, senderFor(12));
            expect(sendResponse).toHaveBeenCalledWith({error: ''});
            expect(kept).toBe(false);
            expect(chrome.storage.local.set).not.toHaveBeenCalled();
        });

        it('registers custom llm providers from a snippets update', () => {
            const {dispatch} = bootstrap();
            const settings = {llm: {custom: {myllm: {serviceUrl: 'https://llm.example/v1'}}}};
            dispatch({action: 'updateSettings', scope: 'snippets', settings}, senderFor(12));

            const {sendResponse} = dispatch({action: 'getAllLlmProviders', needResponse: true}, senderFor(12));
            expect(sendResponse.mock.calls[0][0].providers).toContain('myllm');
            // the custom block is consumed so it never reaches storage
            expect(settings.llm.custom).toBeUndefined();
        });

        it('refuses to shadow a built-in llm provider with a custom one', () => {
            const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
            const {dispatch} = bootstrap();
            dispatch({
                action: 'updateSettings',
                scope: 'snippets',
                settings: {llm: {custom: {ollama: {serviceUrl: 'https://evil.example'}}}},
            }, senderFor(12));
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('built-in LLM provider'));
            warn.mockRestore();
        });

        it('configures the user script world when advanced mode is switched on', () => {
            const {chrome, dispatch} = bootstrap();
            const {kept} = dispatch({
                action: 'updateSettings',
                needResponse: true,
                settings: {showAdvanced: true, snippets: 'api.mapkey("x", "y", () => {});'},
            }, senderFor(12));
            expect(chrome.userScripts.configureWorld).toHaveBeenCalled();
            expect(chrome.userScripts.register).toHaveBeenCalledWith(
                [expect.objectContaining({id: 'settingsSnippets', allFrames: true})], expect.any(Function));
            expect(kept).toBe(true);
        });

        it('explains why advanced mode is unavailable without the userScripts API', () => {
            const chromeMock = createChromeMock({tabs: []});
            delete chromeMock.userScripts;
            global.chrome = chromeMock;
            start(createBrowserStub());
            const sendResponse = jest.fn();
            chromeMock.runtime.onMessage.listeners[0](
                {action: 'updateSettings', needResponse: true, settings: {showAdvanced: true}},
                senderFor(12), sendResponse);
            expect(sendResponse).toHaveBeenCalledWith({error: expect.stringContaining('Developer mode')});
        });

        it('unregisters the snippets user script when advanced mode is off', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.userScripts.getScripts = jest.fn((filter, cb) => cb([{id: 'settingsSnippets', js: [{code: 'old'}]}]));
            dispatch({action: 'getSettings', needResponse: true}, senderFor(12));
            expect(chrome.userScripts.unregister).toHaveBeenCalledWith(
                {ids: ['settingsSnippets']}, expect.any(Function));
        });

        it('replaces the snippets user script when the code changed', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.userScripts.getScripts = jest.fn((filter, cb) => cb([{id: 'settingsSnippets', js: [{code: 'stale'}]}]));
            dispatch({
                action: 'updateSettings',
                needResponse: true,
                settings: {showAdvanced: true, snippets: 'fresh'},
            }, senderFor(12));
            expect(chrome.userScripts.unregister).toHaveBeenCalled();
            expect(chrome.userScripts.register).toHaveBeenCalled();
        });

        it('loads settings from a url and reports success', async () => {
            mockFetchText('api.mapkey("a", "b", () => {});');
            const {dispatch, stored} = bootstrap();
            const {sendResponse} = dispatch(
                {action: 'loadSettingsFromUrl', needResponse: true, url: 'https://conf.example/sk.js'},
                senderFor(12));
            await flushPromises();
            expect(sendResponse).toHaveBeenCalledWith({
                status: 'Succeeded',
                snippets: 'api.mapkey("a", "b", () => {});',
            });
            expect(stored()).toMatchObject({
                localPath: 'https://conf.example/sk.js',
                snippets: 'api.mapkey("a", "b", () => {});',
            });
        });

        it('appends a cache-busting nonce when loading settings over http', async () => {
            const fetchMock = mockFetchText('snippets');
            const {dispatch} = bootstrap();
            dispatch({action: 'loadSettingsFromUrl', needResponse: true, url: 'https://conf.example/sk.js'},
                senderFor(12));
            await flushPromises();
            expect(fetchMock.mock.calls[0][0]).toMatch(/^https:\/\/conf\.example\/sk\.js\?nonce=\d+$/);
        });

        it('reports failure when the settings url cannot be read', async () => {
            mockFetchFailure();
            const {dispatch} = bootstrap();
            const {sendResponse} = dispatch(
                {action: 'loadSettingsFromUrl', needResponse: true, url: 'https://conf.example/sk.js'},
                senderFor(12));
            await flushPromises();
            expect(sendResponse).toHaveBeenCalledWith({status: 'Failed'});
        });

        it('reports the error when boot-time snippets cannot be fetched', async () => {
            mockFetchFailure();
            const {browser} = bootstrap({browser: {settings: {localPath: 'https://conf.example/sk.js'}}});
            await flushPromises();
            expect(browser._applyProxySettings).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.stringContaining('Failed to read snippets'),
            }));
        });
    });

    describe('input history', () => {
        it('prepends a new entry, most recent first', () => {
            const {dispatch, stored} = bootstrap({browser: {settings: {findHistory: ['old']}}});
            const {sendResponse} = dispatch(
                runtimeMessage('updateInputHistory', {find: 'new'}, true), senderFor(12));
            expect(stored()).toMatchObject({findHistory: ['new', 'old']});
            expect(sendResponse).toHaveBeenCalledWith({history: ['new', 'old']});
        });

        it('de-duplicates an entry that is already in the history', () => {
            const {dispatch, stored} = bootstrap({browser: {settings: {findHistory: ['a', 'b']}}});
            dispatch(runtimeMessage('updateInputHistory', {find: 'b'}), senderFor(12));
            expect(stored()).toMatchObject({findHistory: ['b', 'a']});
        });

        it('caps the history at 50 entries', () => {
            const long = Array.from({length: 50}, (_, i) => `e${i}`);
            const {dispatch, stored} = bootstrap({browser: {settings: {findHistory: long}}});
            dispatch(runtimeMessage('updateInputHistory', {find: 'newest'}), senderFor(12));
            const saved = stored().findHistory;
            expect(saved).toHaveLength(50);
            expect(saved[0]).toBe('newest');
            expect(saved).not.toContain('e49');
        });

        it('replaces the whole history when handed an array', () => {
            const {dispatch, stored} = bootstrap({browser: {settings: {cmdHistory: ['a']}}});
            dispatch(runtimeMessage('updateInputHistory', {cmd: ['x', 'y']}), senderFor(12));
            expect(stored()).toMatchObject({cmdHistory: ['x', 'y']});
        });

        it('ignores blank and placeholder entries', () => {
            const {chrome, dispatch} = bootstrap({browser: {settings: {findHistory: ['a']}}});
            dispatch(runtimeMessage('updateInputHistory', {find: '   '}, true), senderFor(12));
            dispatch(runtimeMessage('updateInputHistory', {find: '.'}, true), senderFor(12));
            expect(chrome.storage.local.set).not.toHaveBeenCalled();
        });
    });

    describe('omnibar data sources', () => {
        it('flattens recently closed windows and tabs', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.sessions.getRecentlyClosed = jest.fn((filter, cb) => cb([
                {window: {tabs: [{url: 'https://w1.example/', title: 'W1'}, {url: 'https://w2.example/', title: 'W2'}]}},
                {tab: {url: 'https://t1.example/', title: 'T1'}},
            ]));
            const {sendResponse} = dispatch({action: 'getRecentlyClosed', needResponse: true}, senderFor(12));
            expect(sendResponse.mock.calls[0][0].urls.map((u) => u.url)).toEqual([
                'https://w1.example/', 'https://w2.example/', 'https://t1.example/',
            ]);
        });

        it('filters recently closed entries by query', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.sessions.getRecentlyClosed = jest.fn((filter, cb) => cb([
                {tab: {url: 'https://keep.example/', title: 'Keep'}},
                {tab: {url: 'https://drop.example/', title: 'Drop'}},
            ]));
            const {sendResponse} = dispatch({action: 'getRecentlyClosed', needResponse: true, query: 'keep'}, senderFor(12));
            expect(sendResponse.mock.calls[0][0].urls.map((u) => u.url)).toEqual(['https://keep.example/']);
        });

        it('returns the top sites', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.topSites.get = jest.fn((cb) => cb([{url: 'https://top.example/', title: 'Top'}]));
            const {sendResponse} = dispatch({action: 'getTopSites', needResponse: true}, senderFor(12));
            expect(sendResponse).toHaveBeenCalledWith({urls: [{url: 'https://top.example/', title: 'Top'}]});
        });

        it('returns no top sites when the API is unavailable', () => {
            const chromeMock = createChromeMock({tabs: []});
            delete chromeMock.topSites;
            global.chrome = chromeMock;
            start(createBrowserStub());
            const sendResponse = jest.fn();
            chromeMock.runtime.onMessage.listeners[0](
                {action: 'getTopSites', needResponse: true}, senderFor(12), sendResponse);
            expect(sendResponse).toHaveBeenCalledWith({urls: []});
        });

        it('tops bookmarks up with history when there is room', () => {
            const {chrome, browser, dispatch} = bootstrap();
            chrome.bookmarks.search = jest.fn((q, cb) => cb([{url: 'https://bm.example/', title: 'BM'}]));
            browser.getLatestHistoryItem = jest.fn((text, maxResults, cb) => cb([
                {url: 'https://h1.example/', title: 'H1', visitCount: 1},
                {url: 'https://h2.example/', title: 'H2', visitCount: 9},
            ]));
            const {sendResponse} = dispatch({action: 'getAllURLs', needResponse: true, maxResults: 10}, senderFor(12));
            // history is appended after bookmarks, sorted by visit count
            expect(sendResponse.mock.calls[0][0].urls.map((u) => u.url)).toEqual([
                'https://bm.example/', 'https://h2.example/', 'https://h1.example/',
            ]);
        });

        it('skips history entirely when bookmarks already fill the quota', () => {
            const {chrome, browser, dispatch} = bootstrap();
            chrome.bookmarks.search = jest.fn((q, cb) => cb([
                {url: 'https://1.example/', title: '1'},
                {url: 'https://2.example/', title: '2'},
            ]));
            const {sendResponse} = dispatch({action: 'getAllURLs', needResponse: true, maxResults: 1}, senderFor(12));
            expect(browser.getLatestHistoryItem).not.toHaveBeenCalled();
            expect(sendResponse.mock.calls[0][0].urls).toHaveLength(1);
        });

        it('returns history entries, optionally by most used', () => {
            const {browser, dispatch} = bootstrap();
            browser.getLatestHistoryItem = jest.fn((text, maxResults, cb) => cb([
                {url: 'https://a/', visitCount: 2}, {url: 'https://b/', visitCount: 7},
            ]));
            const {sendResponse} = dispatch(
                {action: 'getHistory', needResponse: true, sortByMostUsed: true}, senderFor(12));
            expect(sendResponse.mock.calls[0][0].history.map((h) => h.url)).toEqual(['https://b/', 'https://a/']);
        });

        it('records urls into browser history', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'addHistories', history: ['https://x/', 'https://y/']}, senderFor(12));
            expect(chrome.history.addUrl).toHaveBeenCalledWith({url: 'https://x/'});
            expect(chrome.history.addUrl).toHaveBeenCalledWith({url: 'https://y/'});
        });

        it('lists tabs filtered by title or url', () => {
            const {dispatch} = bootstrap();
            const {sendResponse} = dispatch(
                {action: 'getTabs', needResponse: true, filter: 'a.example', tabsThreshold: 99}, senderFor(12));
            expect(sendResponse.mock.calls[0][0].tabs.map((t) => t.id)).toEqual([11]);
        });

        it('drops the current tab and orders by recent use past the threshold', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.state.tabs = [
                {id: 11, index: 0, windowId: 1, url: 'https://a/', title: 'A', lastAccessed: 100},
                {id: 12, index: 1, windowId: 1, url: 'https://b/', title: 'B', lastAccessed: 300},
                {id: 13, index: 2, windowId: 1, url: 'https://c/', title: 'C', lastAccessed: 200},
                {id: 21, index: 0, windowId: 2, url: 'https://d/', title: 'D'},
            ];
            const {sendResponse} = dispatch({action: 'getTabs', needResponse: true, tabsThreshold: 1}, senderFor(12));
            const ids = sendResponse.mock.calls[0][0].tabs.map((t) => t.id);
            // the sender tab drops out, the rest sort newest-first with
            // never-accessed tabs pushed to the end
            expect(ids).toEqual([13, 11, 21]);
        });

        /*
         * A tab that has just been created holds its destination in `pendingUrl` and
         * has no `url` at all, so it is left out of the lists a person picks a tab
         * from -- but a caller looking for the tab it opened a moment ago has to be
         * able to see it, or a slow site alone decides whether that tab was found.
         */
        it('hides a tab that has not committed its navigation', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.state.tabs = [
                {id: 11, index: 0, windowId: 1, url: 'https://a/', title: 'A'},
                {id: 12, index: 1, windowId: 1, url: '', pendingUrl: 'https://slow/', title: ''},
            ];
            const {sendResponse} = dispatch({action: 'getTabs', needResponse: true}, senderFor(11));
            expect(sendResponse.mock.calls[0][0].tabs.map((t) => t.id)).toEqual([11]);
        });

        it('reports a tab that has not committed its navigation when asked to', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.state.tabs = [
                {id: 11, index: 0, windowId: 1, url: 'https://a/', title: 'A'},
                {id: 12, index: 1, windowId: 1, url: '', pendingUrl: 'https://slow/', title: ''},
            ];
            const {sendResponse} = dispatch(
                {action: 'getTabs', needResponse: true, includeLoading: true}, senderFor(11));
            expect(sendResponse.mock.calls[0][0].tabs.map((t) => t.id)).toEqual([11, 12]);
        });

        /*
         * A loading tab has no title and no `url` for a query to match, so admitting
         * it and then matching it on those two would drop every one of them again the
         * moment a caller passed a filter -- the destination stands in for both.
         */
        it('matches a filter against the destination of a tab still loading', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.state.tabs = [
                {id: 11, index: 0, windowId: 1, url: 'https://a/', title: 'A'},
                {id: 12, index: 1, windowId: 1, url: '', pendingUrl: 'https://slow/', title: ''},
            ];
            const {sendResponse} = dispatch(
                {action: 'getTabs', needResponse: true, includeLoading: true, filter: 'slow'},
                senderFor(11));
            expect(sendResponse.mock.calls[0][0].tabs.map((t) => t.id)).toEqual([12]);
        });

        // the tabs themselves are answered, not the projection the match was made on
        it('answers the tabs as the browser reports them when filtering', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.state.tabs = [
                {id: 12, index: 0, windowId: 1, url: '', pendingUrl: 'https://slow/', title: ''},
            ];
            const {sendResponse} = dispatch(
                {action: 'getTabs', needResponse: true, includeLoading: true, filter: 'slow'},
                senderFor(12));
            expect(sendResponse.mock.calls[0][0].tabs).toEqual([
                {id: 12, index: 0, windowId: 1, url: '', pendingUrl: 'https://slow/', title: ''},
            ]);
        });

        // a tab with neither is not a tab anything can be said about, whatever the
        // caller asked for
        it('still leaves out a tab with no address at all', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.state.tabs = [
                {id: 11, index: 0, windowId: 1, url: 'https://a/', title: 'A'},
                {id: 12, index: 1, windowId: 1, title: ''},
            ];
            const {sendResponse} = dispatch(
                {action: 'getTabs', needResponse: true, includeLoading: true}, senderFor(11));
            expect(sendResponse.mock.calls[0][0].tabs.map((t) => t.id)).toEqual([11]);
        });
    });

    describe('tab groups', () => {
        it('creates a group from the sender tab and titles it', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'createTabGroup', title: 'Work', color: 'blue'}, senderFor(12));
            expect(chrome.tabs.group).toHaveBeenCalledWith(
                {tabIds: [12], groupId: undefined}, expect.any(Function));
            expect(chrome.tabGroups.update).toHaveBeenCalledWith(
                77, {title: 'Work', color: 'blue'}, expect.any(Function));
        });

        /*
         * A caller that grouped what it LISTED rather than where it sits, and needs
         * to be told what it got: the LLM chat's `group_tabs` reports the group back
         * to the model, which must not claim more than actually happened.
         */
        it('groups the tabs it was given and answers with the group', () => {
            const {chrome, dispatch} = bootstrap();
            const {sendResponse} = dispatch(
                {action: 'createTabGroup', tabIds: [11, 13], title: 'Docs', needResponse: true},
                senderFor(12));
            expect(chrome.tabs.group).toHaveBeenCalledWith(
                {tabIds: [11, 13], groupId: undefined}, expect.any(Function));
            expect(sendResponse).toHaveBeenCalledWith({groupId: 77, tabIds: [11, 13]});
        });

        it('falls back to the sender tab when the id list is empty', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'createTabGroup', tabIds: []}, senderFor(12));
            expect(chrome.tabs.group).toHaveBeenCalledWith(
                {tabIds: [12], groupId: undefined}, expect.any(Function));
        });

        /*
         * Reported, not thrown: a throw in the background reaches the caller as a
         * timeout it can neither explain nor act on.
         */
        it('reports a browser that cannot group tabs', () => {
            const {chrome, dispatch} = bootstrap();
            delete chrome.tabGroups;
            const {sendResponse} = dispatch(
                {action: 'createTabGroup', tabIds: [11], needResponse: true}, senderFor(12));
            expect(chrome.tabs.group).not.toHaveBeenCalled();
            expect(sendResponse.mock.calls[0][0].error).toMatch(/not supported/);
        });

        it('reports a group the browser refused to create', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.tabs.group = jest.fn((props, cb) => {
                chrome.runtime.lastError = {message: 'Tabs cannot be edited right now'};
                cb(undefined);
            });
            const {sendResponse} = dispatch(
                {action: 'createTabGroup', tabIds: [11], needResponse: true}, senderFor(12));
            expect(sendResponse.mock.calls[0][0].error).toMatch(/cannot be edited/);
            expect(chrome.tabGroups.update).not.toHaveBeenCalled();
            delete chrome.runtime.lastError;
        });

        it('does not touch the group when no title or color is given', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'createTabGroup', groupId: 5}, senderFor(12));
            expect(chrome.tabGroups.update).not.toHaveBeenCalled();
        });

        it('ungroups and collapses', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'ungroupTab'}, senderFor(12));
            expect(chrome.tabs.ungroup).toHaveBeenCalledWith([12]);

            dispatch({action: 'collapseGroup', groupId: 3, collapsed: true}, senderFor(12));
            expect(chrome.tabGroups.update).toHaveBeenCalledWith(3, {collapsed: true});
        });

        it('attaches each group\'s tabs and marks the active group', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.tabGroups.query = jest.fn((info, cb) => cb([{id: 7}, {id: 8}, {id: 9, hermit: true}]));
            chrome.state.tabs = [
                {id: 11, index: 0, windowId: 1, url: 'https://a/', title: 'A', groupId: 7, active: false},
                {id: 12, index: 1, windowId: 1, url: 'https://b/', title: 'B', groupId: 7, active: true},
                {id: 13, index: 2, windowId: 1, url: 'https://c/', title: 'C', groupId: -1, active: false},
            ];
            const {sendResponse} = dispatch({action: 'getTabGroups', needResponse: true}, senderFor(12));
            const groups = sendResponse.mock.calls[0][0].groups;
            expect(groups.map((g) => g.id)).toEqual([7, 8]); // hermit group filtered out
            expect(groups[0].tabs.map((t) => t.id)).toEqual([11, 12]);
            expect(groups[0].active).toBe(true);
            expect(groups[1].tabs).toEqual([]);
        });
    });

    describe('closing tabs', () => {
        it('closes a run of tabs starting at the sender', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'closeTab', repeats: 2}, senderFor(11));
            expect(chrome.tabs.remove).toHaveBeenCalledWith([11, 12], expect.any(Function));
        });

        it('rounds the run back when it would overflow the window', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'closeTab', repeats: 2}, senderFor(13));
            expect(chrome.tabs.remove).toHaveBeenCalledWith([12, 13], expect.any(Function));
        });

        it('focuses the tab to the left after closing when configured to', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'updateSettings', scope: 'snippets', settings: {focusAfterClosed: 'left'}}, {});
            dispatch({action: 'closeTab', repeats: 1}, senderFor(12));
            expect(chrome.tabs.update).toHaveBeenCalledWith(11, {active: true});
        });

        it('falls back to the previously visited tab after closing when configured to', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.tabs.onActivated.fire({tabId: 11, windowId: 1});
            chrome.tabs.onActivated.fire({tabId: 12, windowId: 1});
            dispatch({action: 'updateSettings', scope: 'snippets', settings: {focusAfterClosed: 'last'}}, {});
            chrome.tabs.update.mockClear();
            dispatch({action: 'closeTab', repeats: 1}, senderFor(12));
            expect(chrome.tabs.update).toHaveBeenCalledWith(11, {active: true});
        });

        it('closes tabs to the left and to the right of the sender', () => {
            let boot = bootstrap();
            boot.dispatch({action: 'closeTabLeft', repeats: 1}, senderFor(12));
            expect(boot.chrome.tabs.remove).toHaveBeenCalledWith([11]);

            boot = bootstrap();
            boot.dispatch({action: 'closeTabRight', repeats: 1}, senderFor(12));
            expect(boot.chrome.tabs.remove).toHaveBeenCalledWith([13]);
        });

        it('closes every tab to one side of the sender', () => {
            let boot = bootstrap();
            boot.dispatch({action: 'closeTabsToLeft'}, senderFor(13));
            expect(boot.chrome.tabs.remove).toHaveBeenCalledWith([11, 12]);

            boot = bootstrap();
            boot.dispatch({action: 'closeTabsToRight'}, senderFor(11));
            expect(boot.chrome.tabs.remove).toHaveBeenCalledWith([12, 13]);
        });

        it('keeps only the sender tab and pinned tabs', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'tabOnly'}, senderFor(12));
            // 13 is pinned, 12 is the sender, so only 11 goes
            expect(chrome.tabs.remove).toHaveBeenCalledWith([11]);
        });

        it('closes the audible tab', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.state.tabs = [{id: 31, index: 0, windowId: 1, url: 'https://noisy/', audible: true}];
            dispatch({action: 'closeAudibleTab'}, senderFor(12));
            expect(chrome.tabs.remove).toHaveBeenCalledWith(31);
        });

        it('reloads a run of tabs, optionally bypassing the cache', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'reloadTab', repeats: 2, nocache: true}, senderFor(11));
            expect(chrome.tabs.reload).toHaveBeenCalledWith(11, {bypassCache: true});
            expect(chrome.tabs.reload).toHaveBeenCalledWith(12, {bypassCache: true});
        });
    });

    describe('single tab actions', () => {
        it('toggles the mute state of the sender tab', () => {
            const {chrome, dispatch} = bootstrap();
            const sender = {...senderFor(12), tab: {...TABS[1], mutedInfo: {muted: false}}};
            dispatch({action: 'muteTab'}, sender);
            expect(chrome.tabs.update).toHaveBeenCalledWith(12, {muted: true});
        });

        it('duplicates a tab and can keep focus on the original', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'duplicateTab', active: false}, senderFor(12));
            expect(chrome.tabs.duplicate).toHaveBeenCalledWith(12, expect.any(Function));
            expect(chrome.tabs.update).toHaveBeenCalledWith(12, {active: true});
        });

        it('restores the last session on chrome-likes', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'openLast'}, senderFor(12));
            expect(chrome.sessions.restore).toHaveBeenCalled();
        });

        it('asks the native host to reopen the last tab on Safari', () => {
            const {chrome, dispatch} = bootstrap({browser: {name: 'Safari'}});
            const {sendResponse} = dispatch({action: 'openLast', needResponse: true}, senderFor(12));
            expect(chrome.runtime.sendNativeMessage).toHaveBeenCalledWith(
                'application.id', {command: 'reopenLastTab'}, expect.any(Function));
            expect(sendResponse).toHaveBeenCalledWith({nativeReply: 'reopenLastTab'});
        });

        it('moves a tab within its window, clamped to the ends', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'moveTab', step: 1, repeats: 1}, senderFor(11));
            expect(chrome.tabs.move).toHaveBeenCalledWith(11, {index: 1});

            chrome.tabs.move.mockClear();
            dispatch({action: 'moveTab', step: -1, repeats: 5}, senderFor(11));
            expect(chrome.tabs.move).toHaveBeenCalledWith(11, {index: 0});
        });

        it('zooms relative to the current factor', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.tabs.getZoom = jest.fn((id, cb) => cb(1.2));
            dispatch({action: 'setZoom', zoomFactor: 0.1, repeats: 2}, senderFor(12));
            expect(chrome.tabs.setZoom).toHaveBeenCalledWith(12, expect.closeTo(1.4));
        });

        it('resets to the default zoom when the factor is zero', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.tabs.getZoomSettings = jest.fn((id, cb) => cb({defaultZoomFactor: 1.5}));
            dispatch({action: 'setZoom', zoomFactor: 0, repeats: 3}, senderFor(12));
            expect(chrome.tabs.setZoom).toHaveBeenCalledWith(12, 1.5);
        });

        it('cycles focus through the frames of a tab', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.scripting.executeScript = jest.fn((injection, cb) =>
                cb([{result: 'f1'}, {result: 'f2'}, {result: 0}]));
            dispatch({action: 'nextFrame', frameId: 'f1'}, senderFor(12));
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                12, {subject: 'focusFrame', frameId: 'f2'}, undefined);
        });

        it('wraps back to the first frame from the last', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.scripting.executeScript = jest.fn((injection, cb) =>
                cb([{result: 'f1'}, {result: 'f2'}]));
            dispatch({action: 'nextFrame', frameId: 'f2'}, senderFor(12));
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                12, {subject: 'focusFrame', frameId: 'f1'}, undefined);
        });

        it('does nothing when the tab reports no frames', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'nextFrame', frameId: 'f1'}, senderFor(12));
            expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
        });
    });

    describe('windows', () => {
        it('groups the tabs of other windows for the picker', () => {
            const {dispatch} = bootstrap();
            const {sendResponse} = dispatch({action: 'getWindows', needResponse: true}, senderFor(12));
            expect(sendResponse).toHaveBeenCalledWith({windows: [
                {id: '2', tabs: [{title: 'D', url: 'https://d.example/'}], isPreviousChoice: false},
            ]});
        });

        it('remembers the window the user picked last', () => {
            const {dispatch} = bootstrap();
            dispatch({action: 'moveToWindow', windowId: 2}, senderFor(12));
            const {sendResponse} = dispatch({action: 'getWindows', needResponse: true}, senderFor(12));
            expect(sendResponse.mock.calls[0][0].windows[0].isPreviousChoice).toBe(true);
        });

        it('detaches the tab into a brand new window for windowId -1', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'moveToWindow', windowId: -1}, senderFor(12));
            expect(chrome.windows.create).toHaveBeenCalledWith({tabId: 12});
        });

        it('moves the tab to an existing window and focuses it', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'moveToWindow', windowId: 2}, senderFor(12));
            expect(chrome.tabs.move).toHaveBeenCalledWith(12, {windowId: 2, index: -1}, expect.any(Function));
            expect(chrome.windows.update).toHaveBeenCalledWith(2, {focused: true}, expect.any(Function));
        });

        it('pulls every other window\'s tabs into the sender\'s window', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'gatherWindows'}, senderFor(12));
            expect(chrome.tabs.move).toHaveBeenCalledWith(21, {windowId: 1, index: -1});
        });

        it('pulls the listed tabs into the sender\'s window', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'gatherTabs', tabs: [{id: 21}]}, senderFor(12));
            expect(chrome.tabs.move).toHaveBeenCalledWith(21, {windowId: 1, index: -1});
        });

        it('closes every window on quit', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'quit'}, senderFor(12));
            expect(chrome.windows.remove).toHaveBeenCalledWith(1);
            expect(chrome.windows.remove).toHaveBeenCalledWith(2);
        });

        it('opens a url in an incognito window', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'openIncognito', url: 'https://secret/'}, senderFor(12));
            expect(chrome.windows.create).toHaveBeenCalledWith({url: 'https://secret/', incognito: true});
        });
    });

    describe('opening links', () => {
        it('refuses a javascript: url and warns the page', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'openLink', url: 'javascript:alert(1)', tab: {}}, senderFor(12));
            expect(chrome.tabs.create).not.toHaveBeenCalled();
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                12, expect.objectContaining({subject: 'showBanner'}), {frameId: 0});
        });

        it('prefixes a bare host with http://', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'openLink', url: 'example.com', tab: {tabbed: true, active: true}}, senderFor(12));
            expect(chrome.tabs.create).toHaveBeenCalledWith(
                expect.objectContaining({url: 'http://example.com'}), expect.any(Function));
        });

        it('navigates the current tab when not opening in a new tab', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'openLink', url: 'https://dest/', tab: {}}, senderFor(12));
            expect(chrome.tabs.update).toHaveBeenCalledWith(
                {url: 'https://dest/', pinned: false}, expect.any(Function));
        });

        it('opens right after the current tab by default, cascading for repeats', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'openLink', url: 'https://1/', tab: {tabbed: true}}, senderFor(11));
            dispatch({action: 'openLink', url: 'https://2/', tab: {tabbed: true}}, senderFor(11));
            expect(chrome.tabs.create.mock.calls[0][0].index).toBe(1);
            expect(chrome.tabs.create.mock.calls[1][0].index).toBe(2);
        });

        it.each([
            ['left', 1],
            ['right', 2],
            ['first', 0],
            ['last', undefined],
        ])('honours newTabPosition=%s', (position, index) => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'updateSettings', scope: 'snippets', settings: {newTabPosition: position}}, {});
            dispatch({action: 'openLink', url: 'https://dest/', tab: {tabbed: true}}, senderFor(12));
            expect(chrome.tabs.create.mock.calls[0][0].index).toBe(index);
        });

        it('queues a scroll position for the newly opened tab', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'openLink', url: 'https://dest/', tab: {tabbed: true}, scrollTop: 80}, senderFor(12));
            const created = chrome.tabs.create.mock.calls[0][0];
            expect(created.openerTabId).toBe(12);
            // the new tab picks the position up on its first url report
            dispatch({action: 'tabURLAccessed', url: 'https://dest/', title: 'D'},
                {tab: {id: 999, index: 3, active: true}, frameId: 0, url: 'https://dest/'});
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                999, expect.objectContaining({subject: 'setScrollPos', scrollTop: 80}), {frameId: 0});
        });

        it('resolves the active tab when the request comes from the omnibar frame', () => {
            const {chrome, dispatch} = bootstrap();
            const omnibarSender = {
                tab: {id: 11, index: 0, windowId: 1, pinned: false},
                frameId: 3,
                url: 'chrome-extension://surfingkeyspages/frontend.html',
            };
            dispatch({action: 'openLink', url: 'https://dest/', tab: {tabbed: true}}, omnibarSender);
            // the active tab of the current window is 12 at index 1
            expect(chrome.tabs.create).toHaveBeenCalledWith(
                expect.objectContaining({openerTabId: 12, index: 2}), expect.any(Function));
        });

        it('drops a container id on non-Firefox browsers', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'openLink', url: 'https://dest/', tab: {tabbed: true, cookieStoreId: 'c1'}}, senderFor(12));
            expect(chrome.tabs.create.mock.calls[0][0].cookieStoreId).toBeUndefined();
        });

        it('keeps a container id on Firefox when it differs from the sender\'s', () => {
            const {chrome, dispatch} = bootstrap({browser: {name: 'Firefox'}});
            const sender = {...senderFor(12), tab: {...TABS[1], cookieStoreId: 'other'}};
            dispatch({action: 'openLink', url: 'https://dest/', tab: {cookieStoreId: 'c1'}}, sender);
            expect(chrome.tabs.create.mock.calls[0][0].cookieStoreId).toBe('c1');
        });

        it('opens the view-source url of the current tab', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'viewSource', tab: {tabbed: true}}, senderFor(12));
            expect(chrome.tabs.create).toHaveBeenCalledWith(
                expect.objectContaining({url: 'view-source:https://b.example/'}), expect.any(Function));
        });

        /*
         * Navigating a tab the caller is NOT in: only the background can address one
         * by id, which is what lets the LLM chat's `open_url` reuse a tab it opened
         * instead of leaving one behind per URL. The focus is left alone -- the chat
         * runs in an iframe of the tab the user is on, and activating another tab
         * detaches it mid-answer.
         */
        it('navigates a tab by id and answers with it', () => {
            const {chrome, dispatch} = bootstrap();
            const {sendResponse} = dispatch(
                {action: 'navigateTab', tabId: 11, url: 'https://dest/', needResponse: true},
                senderFor(12));
            expect(chrome.tabs.update).toHaveBeenCalledWith(11, {url: 'https://dest/'}, expect.any(Function));
            expect(sendResponse).toHaveBeenCalledWith({tab: {id: 11}});
            // no `active` and no window of its own: the tab is navigated where it stands
            expect(chrome.windows.update).not.toHaveBeenCalled();
        });

        it('prefixes a bare host it is asked to navigate to', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'navigateTab', tabId: 11, url: 'example.com'}, senderFor(12));
            expect(chrome.tabs.update).toHaveBeenCalledWith(11, {url: 'http://example.com'}, expect.any(Function));
        });

        it.each([
            ['a javascript url', 'javascript:alert(1)'],
            ['a file url', 'file:///etc/passwd'],
            ['nothing at all', ''],
        ])('refuses to point a tab at %s', (_label, url) => {
            const {chrome, dispatch} = bootstrap();
            const {sendResponse} = dispatch(
                {action: 'navigateTab', tabId: 11, url, needResponse: true}, senderFor(12));
            expect(chrome.tabs.update).not.toHaveBeenCalled();
            expect(sendResponse.mock.calls[0][0].error).toMatch(/not an http\(s\) URL/);
        });

        it('asks for a tab id instead of guessing one', () => {
            const {chrome, dispatch} = bootstrap();
            const {sendResponse} = dispatch(
                {action: 'navigateTab', url: 'https://dest/', needResponse: true}, senderFor(12));
            expect(chrome.tabs.update).not.toHaveBeenCalled();
            expect(sendResponse.mock.calls[0][0].error).toMatch(/no tab id/);
        });

        /*
         * Reported, not thrown: the caller has to be able to tell the model that the
         * tab is gone, and a throw here would reach it as a timeout instead.
         */
        it('reports a tab the browser would not navigate', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.tabs.update = jest.fn((id, props, cb) => {
                chrome.runtime.lastError = {message: 'No tab with id: 11.'};
                cb(undefined);
            });
            const {sendResponse} = dispatch(
                {action: 'navigateTab', tabId: 11, url: 'https://dest/', needResponse: true},
                senderFor(12));
            expect(sendResponse.mock.calls[0][0].error).toMatch(/No tab with id/);
            delete chrome.runtime.lastError;
        });
    });

    describe('bookmarks', () => {
        it('flattens the folder tree into paths', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.bookmarks.getTree = jest.fn((cb) => cb([{
                id: '0', title: '', children: [
                    {id: '1', title: 'Bar', children: [{id: '3', title: 'Sub', children: []}]},
                    {id: '2', title: 'A link', url: 'https://x/'},
                ],
            }]));
            const {sendResponse} = dispatch({action: 'getBookmarkFolders', needResponse: true}, senderFor(12));
            expect(sendResponse).toHaveBeenCalledWith({folders: [
                {id: '1', title: '/Bar/'},
                {id: '3', title: '/Bar/Sub/'},
            ]});
        });

        it('replaces an existing bookmark, creating intermediate folders', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.bookmarks.search = jest.fn((q, cb) => cb([{id: 'old'}]));
            const {sendResponse} = dispatch({
                action: 'createBookmark',
                needResponse: true,
                page: {url: 'https://x/', title: 'X', folder: '1', path: ['New']},
            }, senderFor(12));
            expect(chrome.bookmarks.remove).toHaveBeenCalledWith('old');
            expect(chrome.bookmarks.create).toHaveBeenCalledWith(
                {parentId: '1', title: 'New'}, expect.any(Function));
            expect(chrome.bookmarks.create).toHaveBeenCalledWith(
                {parentId: 'new', title: 'X', url: 'https://x/'}, expect.any(Function));
            expect(sendResponse).toHaveBeenCalledWith({bookmark: expect.objectContaining({title: 'X'})});
        });

        it('lists the children of a folder, filtered by query', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.bookmarks.getSubTree = jest.fn((id, cb) => cb([{id, children: [
                {title: 'Keep me', url: 'https://keep/'},
                {title: 'Nope', url: 'https://nope/'},
            ]}]));
            const {sendResponse} = dispatch(
                {action: 'getBookmarks', needResponse: true, parentId: '1', query: 'keep'}, senderFor(12));
            expect(sendResponse).toHaveBeenCalledWith({bookmarks: [{title: 'Keep me', url: 'https://keep/'}]});
        });

        it('searches bookmarks when given a query and no folder', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.bookmarks.search = jest.fn((q, cb) => cb([
                {title: 'Match', url: 'https://m/'},
                {title: 'Other', url: 'https://o/'},
            ]));
            const {sendResponse} = dispatch({action: 'getBookmarks', needResponse: true, query: 'match'}, senderFor(12));
            expect(sendResponse).toHaveBeenCalledWith({bookmarks: [{title: 'Match', url: 'https://m/'}]});
        });

        it('returns the whole tree when there is no query', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.bookmarks.getTree = jest.fn((cb) => cb([{children: [{title: 'Bar'}]}]));
            const {sendResponse} = dispatch({action: 'getBookmarks', needResponse: true}, senderFor(12));
            expect(sendResponse).toHaveBeenCalledWith({bookmarks: [{title: 'Bar'}]});
        });

        it('removes and reads back the bookmark for the current tab', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.bookmarks.search = jest.fn((q, cb) => cb([{id: 'b1', url: q.url}]));
            dispatch({action: 'removeBookmark'}, senderFor(12));
            expect(chrome.bookmarks.remove).toHaveBeenCalledWith('b1');

            const {sendResponse} = dispatch({action: 'getBookmark', needResponse: true}, senderFor(12));
            expect(sendResponse).toHaveBeenCalledWith({bookmarks: [{id: 'b1', url: 'https://b.example/'}]});
        });
    });

    describe('sessions', () => {
        it('saves the urls of every window, skipping new tab pages', () => {
            const {chrome, dispatch, stored} = bootstrap({browser: {settings: {sessions: {}}}});
            chrome.state.tabs = [
                {id: 1, index: 0, windowId: 1, url: 'https://keep/'},
                {id: 2, index: 1, windowId: 1, url: 'chrome://newtab/'},
                {id: 3, index: 0, windowId: 2, url: 'https://other/'},
            ];
            dispatch({action: 'createSession', name: 'work'}, senderFor(12));
            expect(stored()).toMatchObject({
                sessions: {work: {tabs: [['https://keep/'], ['https://other/']]}},
            });
        });

        it('quits after saving when asked to', () => {
            const {chrome, dispatch} = bootstrap({browser: {settings: {sessions: {}}}});
            dispatch({action: 'createSession', name: 'work', quitAfterSaved: true}, senderFor(12));
            expect(chrome.windows.remove).toHaveBeenCalled();
        });

        it('reopens the first window in place and the rest in new windows', () => {
            const {chrome, dispatch} = bootstrap({
                browser: {settings: {sessions: {work: {tabs: [['https://1/'], ['https://2/']]}}}},
            });
            dispatch({action: 'openSession', name: 'work'}, senderFor(12));
            expect(chrome.tabs.create).toHaveBeenCalledWith({url: 'https://1/', active: false, pinned: false});
            expect(chrome.windows.create).toHaveBeenCalled();
            expect(chrome.tabs.create).toHaveBeenCalledWith(
                {windowId: 2, url: 'https://2/', active: false, pinned: false});
        });

        it('ignores an unknown session name', () => {
            const {chrome, dispatch} = bootstrap({browser: {settings: {sessions: {}}}});
            dispatch({action: 'openSession', name: 'nope'}, senderFor(12));
            expect(chrome.tabs.create).not.toHaveBeenCalled();
        });

        it('deletes a session', () => {
            const {dispatch, stored} = bootstrap({
                browser: {settings: {sessions: {a: {tabs: []}, b: {tabs: []}}}},
            });
            dispatch({action: 'deleteSession', name: 'a'}, senderFor(12));
            expect(stored().sessions).toEqual({b: {tabs: []}});
        });
    });

    describe('downloads', () => {
        it('starts a download', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'download', url: 'https://f/x.zip', filename: 'x.zip', saveAs: true}, senderFor(12));
            expect(chrome.downloads.download).toHaveBeenCalledWith(
                {url: 'https://f/x.zip', filename: 'x.zip', saveAs: true});
        });

        it('lists downloads', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.downloads.search = jest.fn((q, cb) => cb([{id: 1}]));
            const {sendResponse} = dispatch({action: 'getDownloads', needResponse: true, query: {}}, senderFor(12));
            expect(sendResponse).toHaveBeenCalledWith({downloads: [{id: 1}]});
        });

        it('hides the shelf by toggling it off and on', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'closeDownloadsShelf'}, senderFor(12));
            expect(chrome.downloads.setShelfEnabled.mock.calls).toEqual([[false], [true]]);
        });

        it('erases the download history when asked', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'closeDownloadsShelf', clearHistory: true}, senderFor(12));
            expect(chrome.downloads.erase).toHaveBeenCalledWith({urlRegex: '.*'});
            expect(chrome.downloads.setShelfEnabled).not.toHaveBeenCalled();
        });
    });

    describe('proxy', () => {
        const proxySettings = {proxyMode: 'clear', proxy: [], autoproxy_hosts: []};

        it('toggles a host in and out of the autoproxy list', () => {
            let boot = bootstrap({browser: {settings: {...proxySettings, autoproxy_hosts: [[]]}}});
            let res = boot.dispatch(
                {action: 'updateProxy', needResponse: true, operation: 'toggle', host: 'a.com'}, senderFor(12));
            expect(res.sendResponse.mock.calls[0][0].autoproxy_hosts).toEqual([['a.com']]);

            boot = bootstrap({browser: {settings: {...proxySettings, autoproxy_hosts: [['a.com']]}}});
            res = boot.dispatch(
                {action: 'updateProxy', needResponse: true, operation: 'toggle', host: 'a.com'}, senderFor(12));
            expect(res.sendResponse.mock.calls[0][0].autoproxy_hosts).toEqual([[]]);
        });

        it('adds and removes several hosts at once', () => {
            let boot = bootstrap({browser: {settings: {...proxySettings, autoproxy_hosts: [[]]}}});
            let res = boot.dispatch(
                {action: 'updateProxy', needResponse: true, operation: 'add', host: 'a.com, b.com'}, senderFor(12));
            expect(res.sendResponse.mock.calls[0][0].autoproxy_hosts[0].sort()).toEqual(['a.com', 'b.com']);

            boot = bootstrap({browser: {settings: {...proxySettings, autoproxy_hosts: [['a.com', 'b.com']]}}});
            res = boot.dispatch(
                {action: 'updateProxy', needResponse: true, operation: 'remove', host: 'a.com'}, senderFor(12));
            expect(res.sendResponse.mock.calls[0][0].autoproxy_hosts).toEqual([['b.com']]);
        });

        it('replaces the whole proxy config for the set operation', () => {
            const {browser, dispatch} = bootstrap({browser: {settings: proxySettings}});
            const {sendResponse} = dispatch({
                action: 'updateProxy',
                needResponse: true,
                operation: 'set',
                mode: 'always',
                proxy: ['PROXY p:1'],
                host: [['a.com']],
            }, senderFor(12));
            expect(sendResponse.mock.calls[0][0]).toMatchObject({
                proxyMode: 'always', proxy: ['PROXY p:1'], autoproxy_hosts: [['a.com']],
            });
            expect(browser._applyProxySettings).toHaveBeenCalledTimes(2);
        });

        it('deletes a proxy/host pair by index', () => {
            const {dispatch} = bootstrap({browser: {settings: {
                proxyMode: 'byhost', proxy: ['p0', 'p1'], autoproxy_hosts: [['a'], ['b']],
            }}});
            const {sendResponse} = dispatch({
                action: 'updateProxy', needResponse: true, operation: 'deleteProxyPair', number: 0,
            }, senderFor(12));
            expect(sendResponse.mock.calls[0][0]).toMatchObject({
                proxyMode: 'byhost', proxy: ['p1'], autoproxy_hosts: [['b']],
            });
        });

        it('creates an empty host bucket for a new proxy slot', () => {
            const {dispatch} = bootstrap({browser: {settings: proxySettings}});
            const {sendResponse} = dispatch({
                action: 'updateProxy', needResponse: true, mode: 'byhost', proxy: 'PROXY p:1', host: 'a.com',
            }, senderFor(12));
            // with no explicit operation the default branch *removes* the hosts,
            // so the freshly created bucket stays empty
            expect(sendResponse.mock.calls[0][0]).toMatchObject({
                proxyMode: 'byhost', proxy: ['PROXY p:1'], autoproxy_hosts: [[]],
            });
        });

        it('proxies the current host from a keyboard command and reloads', () => {
            const {chrome} = bootstrap({browser: {settings: proxySettings}});
            chrome.commands.onCommand.fire('proxyThis');
            expect(chrome.tabs.reload).toHaveBeenCalledWith(12, {bypassCache: true});
        });
    });

    describe('local data', () => {
        it('writes an object and broadcasts the change', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'localData', data: {lastKeys: ['g', 'g']}}, senderFor(12));
            expect(chrome.storage.local.set).toHaveBeenCalledWith(
                {lastKeys: ['g', 'g']}, expect.any(Function));
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                11, {subject: 'settingsUpdated', settings: {lastKeys: ['g', 'g']}}, undefined);
        });

        it('reads keys back out', () => {
            const {chrome, dispatch} = bootstrap({chrome: {storage: {local: {lastKeys: ['x']}}}});
            const {sendResponse} = dispatch({action: 'localData', needResponse: true, data: 'lastKeys'}, senderFor(12));
            expect(chrome.storage.local.get).toHaveBeenCalledWith('lastKeys', expect.any(Function));
            expect(sendResponse).toHaveBeenCalledWith({data: {lastKeys: ['x']}});
        });
    });

    describe('removeURL', () => {
        it('removes a bookmark', () => {
            const {chrome, dispatch} = bootstrap();
            const {sendResponse} = dispatch({action: 'removeURL', needResponse: true, uid: 'Bb1'}, senderFor(12));
            expect(chrome.bookmarks.remove).toHaveBeenCalledWith('b1', expect.any(Function));
            expect(sendResponse).toHaveBeenCalledWith({response: 'Done'});
        });

        it('removes a history entry', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'removeURL', needResponse: true, uid: 'Hhttps://x/'}, senderFor(12));
            expect(chrome.history.deleteUrl).toHaveBeenCalledWith({url: 'https://x/'}, expect.any(Function));
        });

        it('closes a tab after focusing its window', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'removeURL', needResponse: true, uid: 'T2:21'}, senderFor(12));
            expect(chrome.windows.update).toHaveBeenCalledWith(2, {focused: true}, expect.any(Function));
            expect(chrome.tabs.remove).toHaveBeenCalledWith(21, expect.any(Function));
        });

        it('waits for every entry before responding', () => {
            const {dispatch} = bootstrap();
            const {sendResponse} = dispatch(
                {action: 'removeURL', needResponse: true, uid: ['Bb1', 'Bb2']}, senderFor(12));
            expect(sendResponse).toHaveBeenCalledTimes(1);
            expect(sendResponse).toHaveBeenCalledWith({response: 'Done'});
        });
    });

    describe('page capture and history pruning', () => {
        it('captures the visible tab', () => {
            const {dispatch} = bootstrap();
            const {sendResponse} = dispatch({action: 'captureVisibleTab', needResponse: true}, senderFor(12));
            expect(sendResponse).toHaveBeenCalledWith({dataUrl: 'data:image/png;base64,AAA'});
        });

        it('reports the captured image size', async () => {
            mockFetchText('img');
            global.createImageBitmap = jest.fn(() => Promise.resolve({width: 800, height: 600}));
            const {dispatch} = bootstrap();
            const {sendResponse} = dispatch({action: 'getCaptureSize', needResponse: true}, senderFor(12));
            await flushPromises();
            expect(sendResponse).toHaveBeenCalledWith({width: 800, height: 600});
        });

        it('deletes history older than the given age', () => {
            const {chrome, dispatch} = bootstrap();
            const before = new Date().getTime();
            dispatch({action: 'deleteHistoryOlderThan', days: 1, hours: 2}, senderFor(12));
            const range = chrome.history.deleteRange.mock.calls[0][0];
            expect(range.startTime).toBe(0);
            expect(range.endTime).toBeLessThanOrEqual(before - (86400 + 7200) * 1000 + 1000);
        });
    });

    describe('http requests', () => {
        it('returns the decoded response body', async () => {
            mockFetchText('hello');
            const {dispatch} = bootstrap();
            const {sendResponse} = dispatch(
                {action: 'request', needResponse: true, url: 'https://api.example/'}, senderFor(12));
            await flushPromises();
            expect(sendResponse).toHaveBeenCalledWith({text: 'hello'});
        });

        it('POSTs when data is supplied', async () => {
            const fetchMock = mockFetchText('ok');
            const {dispatch} = bootstrap();
            dispatch({action: 'request', needResponse: true, url: 'https://api.example/', data: 'body'},
                senderFor(12));
            await flushPromises();
            expect(fetchMock).toHaveBeenCalledWith('https://api.example/',
                expect.objectContaining({method: 'POST', body: 'body'}));
        });

        it('reports a transport error back to the caller', async () => {
            mockFetchFailure(new Error('boom'));
            const {dispatch} = bootstrap();
            const {sendResponse} = dispatch(
                {action: 'request', needResponse: true, url: 'https://api.example/'}, senderFor(12));
            await flushPromises();
            expect(sendResponse).toHaveBeenCalledWith({error: 'Error: boom'});
        });

        it('falls back to an empty image when the fetch fails', async () => {
            mockFetchFailure();
            const {dispatch} = bootstrap();
            const {sendResponse} = dispatch(
                {action: 'requestImage', needResponse: true, url: 'https://img.example/x.png'}, senderFor(12));
            await flushPromises();
            expect(sendResponse).toHaveBeenCalledWith({text: ''});
        });
    });

    describe('text to speech', () => {
        it('speaks the content and answers on the start event', () => {
            const {chrome, dispatch} = bootstrap();
            const {sendResponse} = dispatch(
                {action: 'read', needResponse: true, content: 'hello'}, senderFor(12));
            expect(chrome.tts.speak).toHaveBeenCalledWith('hello', expect.objectContaining({
                onEvent: expect.any(Function),
            }));

            const {onEvent} = chrome.tts.speak.mock.calls[0][1];
            onEvent({type: 'start'});
            expect(sendResponse).toHaveBeenCalledWith({ttsEvent: {type: 'start'}});
        });

        it('pushes later tts events to the tab instead of the port', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'read', needResponse: true, content: 'hello'}, senderFor(12));
            const {onEvent} = chrome.tts.speak.mock.calls[0][1];
            onEvent({type: 'end'});
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                12, {subject: 'onTtsEvent', ttsEvent: {type: 'end'}}, undefined);
        });

        it('stops reading', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'stopReading'}, senderFor(12));
            expect(chrome.tts.stop).toHaveBeenCalled();
        });
    });

    describe('clipboard', () => {
        it('writes text through the async clipboard API', () => {
            const writeText = jest.fn();
            Object.defineProperty(global.navigator, 'clipboard', {value: {writeText}, configurable: true});
            const {dispatch} = bootstrap();
            dispatch({action: 'writeClipboard', text: 'copied'}, senderFor(12));
            expect(writeText).toHaveBeenCalledWith('copied');
        });

        it('reads through the native host on Safari', () => {
            const {chrome, dispatch} = bootstrap({browser: {name: 'Safari'}});
            const {sendResponse} = dispatch({action: 'readClipboard', needResponse: true}, senderFor(12));
            expect(chrome.runtime.sendNativeMessage).toHaveBeenCalledWith(
                'application.id', {command: 'Clipboard.read'}, expect.any(Function));
            expect(sendResponse).toHaveBeenCalledWith({nativeReply: 'Clipboard.read'});
        });
    });

    describe('llm', () => {
        it('lists the built-in providers and hides the custom template', () => {
            const {dispatch} = bootstrap();
            const {sendResponse} = dispatch({action: 'getAllLlmProviders', needResponse: true}, senderFor(12));
            const {providers} = sendResponse.mock.calls[0][0];
            expect(providers).toEqual(expect.arrayContaining(['bedrock', 'ollama']));
            expect(providers).not.toContain('custom');
        });

        it('warns the page when the provider does not exist', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'llmRequest', provider: 'nope', messages: []}, senderFor(12));
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(12, expect.objectContaining({
                subject: 'llmResponse',
                chunk: expect.stringContaining('no LLM provider nope'),
            }), {frameId: 0});
        });
    });

    describe('native messaging', () => {
        it('hands the neovim server url back to the page', async () => {
            const nm = {postMessage: jest.fn()};
            const nvimServer = {instance: Promise.resolve({url: '127.0.0.1:1234/pw', nm})};
            const {dispatch} = bootstrap({browser: {nvimServer}});
            const {sendResponse} = dispatch(
                {action: 'connectNative', needResponse: true, mode: 'nvim'}, senderFor(12));
            await flushPromises();
            expect(nm.postMessage).toHaveBeenCalledWith({mode: 'nvim'});
            expect(sendResponse).toHaveBeenCalledWith({url: '127.0.0.1:1234/pw'});
        });

        it('reports a native connection failure', async () => {
            const nvimServer = {instance: Promise.reject(new Error('no nvim'))};
            const {dispatch} = bootstrap({browser: {nvimServer}});
            const {sendResponse} = dispatch({action: 'connectNative', needResponse: true}, senderFor(12));
            await flushPromises();
            expect(sendResponse).toHaveBeenCalledWith({error: new Error('no nvim')});
        });

        it('advertises neovim support in the full settings payload', () => {
            const nvimServer = {instance: Promise.resolve({})};
            const {dispatch} = bootstrap({browser: {nvimServer}});
            const {sendResponse} = dispatch({action: 'getSettings', needResponse: true}, senderFor(12));
            expect(sendResponse.mock.calls[0][0].settings.useNeovim).toBeTruthy();
        });
    });

    describe('toolbar icon', () => {
        it.each([
            ['disabled', 'icons/48-x.png'],
            ['lurking', 'icons/48-l.png'],
            ['enabled', 'icons/48.png'],
        ])('uses the %s icon', (status, path) => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'setSurfingkeysIcon', status}, senderFor(12));
            expect(chrome.action.setIcon).toHaveBeenCalledWith({path, tabId: 12});
        });

        it('uses the MV2 browserAction API when not running MV3', () => {
            const {chrome, dispatch} = bootstrap({chrome: {manifestVersion: 2}});
            dispatch({action: 'setSurfingkeysIcon', status: 'enabled'}, senderFor(12));
            expect(chrome.browserAction.setIcon).toHaveBeenCalledWith(
                {path: 'icons/48.png', tabId: 12});
            expect(chrome.action.setIcon).not.toHaveBeenCalled();
        });

        it('skips the icon API when the tab state is unchanged', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'setSurfingkeysIcon', status: 'enabled'}, senderFor(12));
            expect(chrome.action.setIcon).toHaveBeenCalledTimes(1);
            // repeated reports of the same state (e.g. every page load) are no-ops
            dispatch({action: 'setSurfingkeysIcon', status: 'enabled'}, senderFor(12));
            expect(chrome.action.setIcon).toHaveBeenCalledTimes(1);
            // a real state change still updates the icon
            dispatch({action: 'setSurfingkeysIcon', status: 'disabled'}, senderFor(12));
            expect(chrome.action.setIcon).toHaveBeenCalledTimes(2);
            expect(chrome.action.setIcon).toHaveBeenLastCalledWith({path: 'icons/48-x.png', tabId: 12});
        });

        it('tracks icons per tab', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'setSurfingkeysIcon', status: 'enabled'}, senderFor(12));
            dispatch({action: 'setSurfingkeysIcon', status: 'lurking'}, senderFor(11));
            dispatch({action: 'setSurfingkeysIcon', status: 'enabled'}, senderFor(12));
            expect(chrome.action.setIcon).toHaveBeenCalledTimes(2);
        });
    });

    describe('boot-time snippet loading', () => {
        it('injects snippets fetched from localPath into the applied settings', async () => {
            mockFetchText('api.mapkey("q", "d", () => {});');
            const {browser} = bootstrap({browser: {settings: {localPath: 'https://conf.example/sk.js'}}});
            await flushPromises();
            expect(browser._applyProxySettings).toHaveBeenCalledWith(expect.objectContaining({
                snippets: 'api.mapkey("q", "d", () => {});',
            }));
        });
    });

    describe('more tab events', () => {
        it('announces activation once a tab finishes loading', () => {
            const {chrome} = bootstrap();
            chrome.tabs.onUpdated.fire(12, {status: 'complete'}, {...TABS[1], active: true});
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(12, {subject: 'tabActivated'}, {frameId: 0});
        });

        it('stays quiet when a background tab finishes loading', () => {
            const {chrome} = bootstrap();
            chrome.tabs.onUpdated.fire(11, {status: 'complete'}, {...TABS[0], active: false});
            expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
        });

        it('activates the focused window\'s active tab', () => {
            const {chrome} = bootstrap();
            chrome.windows.onFocusChanged.fire(1);
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(12, {subject: 'tabActivated'}, {frameId: 0});
        });

        it('does nothing when the focused window has no tabs', () => {
            const {chrome} = bootstrap({chrome: {tabs: []}});
            chrome.windows.onFocusChanged.fire(1);
            expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
        });

        it.each(['onCreated', 'onDetached', 'onAttached'])(
            'refreshes tab indices on %s', (event) => {
                const {chrome, dispatch} = bootstrap();
                dispatch({action: 'updateSettings', scope: 'snippets', settings: {showTabIndices: true}}, {});
                chrome.tabs[event].fire({id: 14, index: 3, windowId: 1});
                expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                    11, {subject: 'tabIndexChange', index: 1}, {frameId: 0});
            });

        it('reports nothing for a sender that is not a tab', () => {
            const {dispatch} = bootstrap();
            const {sendResponse} = dispatch({action: 'tabURLAccessed', needResponse: true, url: 'u'}, {});
            expect(sendResponse).toHaveBeenCalledWith({});
        });

        it('survives a sync storage error while saving settings', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.runtime.lastError = {message: 'QUOTA_BYTES_PER_ITEM quota exceeded'};
            expect(() => dispatch({action: 'updateSettings', settings: {a: 1}}, senderFor(12))).not.toThrow();
            chrome.runtime.lastError = undefined;
        });
    });

    describe('tab history navigation', () => {
        const withHistory = () => {
            const boot = bootstrap();
            [11, 12, 13].forEach((tabId) => boot.chrome.tabs.onActivated.fire({tabId, windowId: 1}));
            boot.chrome.tabs.update.mockClear();
            return boot;
        };

        it('jumps to an absolute position in the tab history', () => {
            const {chrome, dispatch} = withHistory();
            dispatch({action: 'historyTab', index: 0}, senderFor(13));
            expect(chrome.tabs.update).toHaveBeenCalledWith(11, {active: true});
        });

        it('counts a negative index back from the end', () => {
            const {chrome, dispatch} = withHistory();
            dispatch({action: 'historyTab', index: -1}, senderFor(13));
            expect(chrome.tabs.update).toHaveBeenCalledWith(13, {active: true});
        });

        it('steps backward and clamps at the oldest entry', () => {
            const {chrome, dispatch} = withHistory();
            dispatch({action: 'historyTab', backward: true}, senderFor(13));
            expect(chrome.tabs.update).toHaveBeenLastCalledWith(12, {active: true});
            dispatch({action: 'historyTab', backward: true}, senderFor(12));
            dispatch({action: 'historyTab', backward: true}, senderFor(11));
            dispatch({action: 'historyTab', backward: true}, senderFor(11));
            expect(chrome.tabs.update).toHaveBeenLastCalledWith(11, {active: true});
        });

        it('steps forward and clamps at the newest entry', () => {
            const {chrome, dispatch} = withHistory();
            dispatch({action: 'historyTab', backward: false}, senderFor(13));
            expect(chrome.tabs.update).toHaveBeenLastCalledWith(13, {active: true});
        });

        it('does nothing without any history', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'historyTab', backward: true}, senderFor(12));
            expect(chrome.tabs.update).not.toHaveBeenCalled();
        });
    });

    describe('senders without a tab', () => {
        it('falls back to the active tab when stepping tabs', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'nextTab', repeats: 1}, {});
            // active tab is 12 at index 1, so next is 13
            expect(chrome.tabs.update).toHaveBeenCalledWith(13, {active: true});
        });

        it('falls back to the active tab when closing a run of tabs', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'closeTab', repeats: 1}, {});
            expect(chrome.tabs.remove).toHaveBeenCalledWith([12], expect.any(Function));
        });

        it('activates a tab in the same window directly', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'focusTab', tabId: 11, windowId: 1}, senderFor(12));
            expect(chrome.windows.update).not.toHaveBeenCalled();
            expect(chrome.tabs.update).toHaveBeenCalledWith(11, {active: true});
        });
    });

    describe('marks on the current tab', () => {
        it('restores the scroll position in place when already on the marked url', () => {
            const {chrome, dispatch} = bootstrap({
                browser: {settings: {marks: {a: {url: 'https://b.example/', scrollTop: 55}}}},
            });
            dispatch({action: 'jumpVIMark', mark: 'a'}, senderFor(12));
            expect(chrome.tabs.update).not.toHaveBeenCalled();
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                12, expect.objectContaining({subject: 'setScrollPos', scrollTop: 55}), {frameId: 0});
        });
    });

    describe('tab ordering edge cases', () => {
        it('keeps never-accessed tabs together at the end', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.state.tabs = [
                {id: 11, index: 0, windowId: 1, url: 'https://a/', title: 'A'},
                {id: 12, index: 1, windowId: 1, url: 'https://b/', title: 'B', lastAccessed: 300},
                {id: 13, index: 2, windowId: 1, url: 'https://c/', title: 'C'},
                {id: 14, index: 3, windowId: 1, url: 'https://d/', title: 'D', lastAccessed: 500},
            ];
            const {sendResponse} = dispatch({action: 'getTabs', needResponse: true, tabsThreshold: 1}, senderFor(12));
            const ids = sendResponse.mock.calls[0][0].tabs.map((t) => t.id);
            expect(ids[0]).toBe(14);
            expect(ids.slice(1).sort()).toEqual([11, 13]);
        });
    });

    describe('openLink extras', () => {
        it('drops a container id that matches the sender\'s own container on Firefox', () => {
            const {chrome, dispatch} = bootstrap({browser: {name: 'Firefox'}});
            const sender = {...senderFor(12), tab: {...TABS[1], cookieStoreId: 'c1'}};
            dispatch({action: 'openLink', url: 'https://dest/', tab: {tabbed: true, cookieStoreId: 'c1'}}, sender);
            expect(chrome.tabs.create.mock.calls[0][0].cookieStoreId).toBeUndefined();
        });

        it('queues a scroll position when navigating the current tab', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'openLink', url: 'https://dest/', tab: {}, scrollTop: 42}, senderFor(12));
            dispatch({action: 'tabURLAccessed', url: 'https://dest/', title: 'D'},
                {tab: {id: 999, index: 0, active: true}, frameId: 0, url: 'https://dest/'});
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                999, expect.objectContaining({subject: 'setScrollPos', scrollTop: 42}), {frameId: 0});
        });
    });

    describe('sessions with new tab pages open', () => {
        it('closes leftover new tab pages after restoring a session', () => {
            const {chrome, dispatch} = bootstrap({
                browser: {settings: {sessions: {work: {tabs: [['https://1/']]}}}},
            });
            chrome.state.tabs = [
                {id: 41, index: 0, windowId: 1, url: 'chrome://newtab/'},
                {id: 42, index: 1, windowId: 1, url: 'https://keep/'},
            ];
            dispatch({action: 'openSession', name: 'work'}, senderFor(12));
            expect(chrome.tabs.remove).toHaveBeenCalledWith([41]);
        });
    });

    describe('user script registration', () => {
        const snippetCode = (snippets) =>
            `import('./api.js').then((module) => {module.default("chrome-extension://surfingkeys/", ` +
            `(api, settings) => {${snippets}\n})});`;

        it('skips registration entirely when the API is unavailable', async () => {
            mockFetchText('snippets');
            const chromeMock = createChromeMock({tabs: []});
            delete chromeMock.userScripts;
            global.chrome = chromeMock;
            start(createBrowserStub());
            const sendResponse = jest.fn();
            chromeMock.runtime.onMessage.listeners[0](
                {action: 'loadSettingsFromUrl', needResponse: true, url: 'https://conf.example/sk.js'},
                senderFor(12), sendResponse);
            await flushPromises();
            expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({status: 'Succeeded'}));
        });

        it('treats a throwing userScripts getter as unavailable', () => {
            const chromeMock = createChromeMock({tabs: []});
            Object.defineProperty(chromeMock, 'userScripts', {
                get() { throw new Error('not allowed'); },
                configurable: true,
            });
            global.chrome = chromeMock;
            start(createBrowserStub());
            const sendResponse = jest.fn();
            chromeMock.runtime.onMessage.listeners[0](
                {action: 'getSettings', needResponse: true}, senderFor(12), sendResponse);
            expect(sendResponse).toHaveBeenCalledWith({settings: expect.objectContaining({
                isUserScriptsAvailable: false,
            })});
        });

        it('leaves an already up-to-date user script alone', () => {
            const {chrome, dispatch} = bootstrap();
            chrome.userScripts.getScripts = jest.fn((filter, cb) =>
                cb([{id: 'settingsSnippets', js: [{code: snippetCode('unchanged')}]}]));
            dispatch({
                action: 'updateSettings',
                needResponse: true,
                settings: {showAdvanced: true, snippets: 'unchanged'},
            }, senderFor(12));
            expect(chrome.userScripts.unregister).not.toHaveBeenCalled();
            expect(chrome.userScripts.register).not.toHaveBeenCalled();
        });

        it('logs a getScripts failure and still calls back', () => {
            const error = jest.spyOn(console, 'error').mockImplementation(() => {});
            const {chrome, dispatch} = bootstrap();
            chrome.userScripts.getScripts = jest.fn((filter, cb) => {
                chrome.runtime.lastError = {message: 'nope'};
                cb([]);
                chrome.runtime.lastError = undefined;
            });
            const {sendResponse} = dispatch({
                action: 'updateSettings',
                needResponse: true,
                settings: {showAdvanced: true, snippets: 'x'},
            }, senderFor(12));
            expect(error).toHaveBeenCalledWith(expect.stringContaining('getScripts'), expect.anything());
            expect(sendResponse).toHaveBeenCalledWith({error: ''});
            error.mockRestore();
        });

        it('logs a getScripts failure on the unregister path', () => {
            const error = jest.spyOn(console, 'error').mockImplementation(() => {});
            const {chrome, dispatch} = bootstrap();
            chrome.userScripts.getScripts = jest.fn((filter, cb) => {
                chrome.runtime.lastError = {message: 'nope'};
                cb([]);
                chrome.runtime.lastError = undefined;
            });
            dispatch({action: 'getSettings', needResponse: true}, senderFor(12));
            expect(error).toHaveBeenCalledWith(expect.stringContaining('getScripts'), expect.anything());
            error.mockRestore();
        });

        it('logs a registration failure', () => {
            const error = jest.spyOn(console, 'error').mockImplementation(() => {});
            const {chrome, dispatch} = bootstrap();
            chrome.userScripts.register = jest.fn((scripts, cb) => {
                chrome.runtime.lastError = {message: 'bad script'};
                cb();
                chrome.runtime.lastError = undefined;
            });
            dispatch({
                action: 'updateSettings',
                needResponse: true,
                settings: {showAdvanced: true, snippets: 'x'},
            }, senderFor(12));
            expect(error).toHaveBeenCalledWith(expect.stringContaining('userScripts API error'), expect.anything());
            error.mockRestore();
        });

        it('registers snippets when a full settings read has advanced mode on', () => {
            const {chrome, dispatch} = bootstrap({
                browser: {settings: {showAdvanced: true, snippets: 'api.map("a","b");'}},
            });
            dispatch({action: 'getSettings', needResponse: true}, senderFor(12));
            expect(chrome.userScripts.register).toHaveBeenCalledWith(
                [expect.objectContaining({js: [{code: snippetCode('api.map("a","b");')}]})],
                expect.any(Function));
        });
    });

    describe('llm provider configuration', () => {
        it('picks up the ollama model from snippets', () => {
            const {dispatch} = bootstrap();
            dispatch({
                action: 'updateSettings',
                scope: 'snippets',
                settings: {llm: {ollama: {model: 'llama3.2'}}},
            }, senderFor(12));
            expect(llmClients.ollama.model).toBe('llama3.2');
        });

        it('initialises the bedrock client and strips its credentials', () => {
            const init = jest.spyOn(llmClients.bedrock, 'init').mockImplementation(() => {});
            const {dispatch} = bootstrap();
            const settings = {llm: {bedrock: {
                accessKeyId: 'AKIA', secretAccessKey: 'secret', model: 'claude',
            }}};
            dispatch({action: 'updateSettings', scope: 'snippets', settings}, senderFor(12));
            expect(init).toHaveBeenCalledWith(expect.objectContaining({accessKeyId: 'AKIA'}));
            // credentials are consumed rather than echoed back
            expect(settings.llm.bedrock).toBeUndefined();
            init.mockRestore();
        });

        it('persists custom provider config for recovery after a restart', () => {
            const {chrome, dispatch} = bootstrap();
            try {
                dispatch({
                    action: 'updateSettings',
                    scope: 'snippets',
                    settings: {llm: {custom: {
                        claude: {serviceUrl: 'https://api.example', apiKey: 'k', model: 'claude-x'},
                    }}},
                }, senderFor(12));
                expect(chrome.storage.local.data._llmProviderConfig).toEqual({
                    custom: {claude: {serviceUrl: 'https://api.example', apiKey: 'k', model: 'claude-x'}},
                });
            } finally {
                delete llmClients.claude;
            }
        });

        it('persists bedrock config so the client can be re-initialised after a restart', () => {
            const init = jest.spyOn(llmClients.bedrock, 'init').mockImplementation(() => {});
            const {chrome, dispatch} = bootstrap();
            try {
                const settings = {llm: {bedrock: {
                    accessKeyId: 'AKIA', secretAccessKey: 'secret', model: 'claude',
                }}};
                dispatch({action: 'updateSettings', scope: 'snippets', settings}, senderFor(12));
                expect(chrome.storage.local.data._llmProviderConfig.bedrock).toEqual({
                    accessKeyId: 'AKIA', secretAccessKey: 'secret', model: 'claude',
                });
                // credentials are still consumed rather than echoed back to the page
                expect(settings.llm.bedrock).toBeUndefined();
            } finally {
                init.mockRestore();
            }
        });

        it('re-initialises the bedrock client from persisted config on boot', () => {
            const init = jest.spyOn(llmClients.bedrock, 'init').mockImplementation(() => {});
            try {
                bootstrap({
                    chrome: {storage: {local: {_llmProviderConfig: {
                        bedrock: {accessKeyId: 'AKIA', secretAccessKey: 'secret', model: 'claude'},
                    }}}},
                });
                expect(init).toHaveBeenCalledWith({
                    accessKeyId: 'AKIA', secretAccessKey: 'secret', model: 'claude',
                });
            } finally {
                init.mockRestore();
            }
        });

        it('re-registers custom providers from persisted config on boot', () => {
            const {dispatch} = bootstrap({
                chrome: {storage: {local: {_llmProviderConfig: {custom: {
                    claude: {serviceUrl: 'https://api.example', apiKey: 'k', model: 'claude-x'},
                }}}}},
            });
            try {
                expect(llmClients.claude).toBe(llmClients.custom);
                const {sendResponse} = dispatch({action: 'getAllLlmProviders', needResponse: true}, senderFor(12));
                expect(sendResponse.mock.calls[0][0].providers).toContain('claude');
            } finally {
                delete llmClients.claude;
            }
        });

        /*
         * The worker is woken BY the request, and reading the stored config back is
         * asynchronous, so the request arrives first. Answering it from the registry
         * as it stands at that moment is what reported "Please set up bedrock
         * correctly" for credentials the user had configured, and a custom provider
         * as not implemented, on the first chat after an idle period.
         */
        describe('a request that arrives before the stored config is read', () => {
            const STORED = {storage: {local: {_llmProviderConfig: {
                bedrock: {accessKeyId: 'AKIA', secretAccessKey: 'secret', model: 'claude'},
                custom: {claude: {serviceUrl: 'https://api.example', apiKey: 'k', model: 'claude-x'}},
            }}}, deferStorageReads: true};

            it('holds the request until the providers are back, then dispatches it', () => {
                const realCustom = llmClients.custom;
                const custom = jest.spyOn(llmClients, 'custom').mockImplementation(() => {});
                // the spy replaces the function, and registration goes through it
                llmClients.custom.register = realCustom.register;
                const {chrome, dispatch} = bootstrap({chrome: STORED});
                try {
                    dispatch({action: 'llmRequest', provider: 'claude', messages: []}, senderFor(12));

                    // nothing is registered yet, and the frame must NOT be told so
                    expect(custom).not.toHaveBeenCalled();
                    expect(chrome.tabs.sendMessage).not.toHaveBeenCalledWith(12, expect.objectContaining({
                        subject: 'llmResponse',
                    }), expect.anything());

                    chrome.flushStorageReads();

                    expect(custom).toHaveBeenCalledWith(
                        expect.objectContaining({provider: 'claude'}), expect.any(Object));
                } finally {
                    custom.mockRestore();
                    delete llmClients.claude;
                }
            });

            it('initialises bedrock before the request reaches it', () => {
                const init = jest.spyOn(llmClients.bedrock, 'init').mockImplementation(() => {});
                const bedrock = jest.spyOn(llmClients, 'bedrock').mockImplementation(() => {});
                // the spy replaces the function, so `init` has to hang off the spy too
                llmClients.bedrock.init = init;
                const {chrome, dispatch} = bootstrap({chrome: STORED});
                try {
                    dispatch({action: 'llmRequest', provider: 'bedrock', messages: []}, senderFor(12));
                    expect(bedrock).not.toHaveBeenCalled();

                    chrome.flushStorageReads();

                    expect(init).toHaveBeenCalledWith(expect.objectContaining({accessKeyId: 'AKIA'}));
                    expect(bedrock).toHaveBeenCalled();
                } finally {
                    bedrock.mockRestore();
                    init.mockRestore();
                    delete llmClients.claude;
                }
            });

            it('lists the user\'s own providers rather than the built-in ones alone', () => {
                const {chrome, dispatch} = bootstrap({chrome: STORED});
                try {
                    const {sendResponse, kept} = dispatch(
                        {action: 'getAllLlmProviders', needResponse: true}, senderFor(12));
                    // the channel is kept open instead of answering with a short list
                    expect(kept).toBe(true);
                    expect(sendResponse).not.toHaveBeenCalled();

                    chrome.flushStorageReads();

                    expect(sendResponse.mock.calls[0][0].providers).toContain('claude');
                } finally {
                    delete llmClients.claude;
                }
            });

            /*
             * A request must not be left waiting on a read that cannot happen: the
             * frontend books the shared `llmResponse` handler for its duration, and a
             * request that never completes disables every LLM feature in that frame
             * until a reload. A chrome API throws synchronously once the extension
             * context has been invalidated, so that throw releases the queue.
             */
            it('answers a request even when the config cannot be read at all', () => {
                const {chrome, dispatch} = bootstrap({chrome: {
                    storageReadThrows: new Error('Extension context invalidated'),
                }});
                dispatch({action: 'llmRequest', provider: 'nope', messages: []}, senderFor(12));

                expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(12, expect.objectContaining({
                    chunk: expect.stringContaining('no LLM provider nope'),
                }), {frameId: 0});
            });

            /*
             * The other way a read fails: accepted, then answered with `undefined` and
             * chrome.runtime.lastError instead of items. Reaching into that answer
             * throws INSIDE the storage callback, where the `try` above cannot catch it
             * and nothing is left to release the queue -- so the request would hang.
             */
            it('answers a request when the read fails instead of returning items', () => {
                const {chrome, dispatch} = bootstrap({chrome: {
                    deferStorageReads: true,
                    storageReadError: 'An unexpected error occurred',
                }});
                dispatch({action: 'llmRequest', provider: 'nope', messages: []}, senderFor(12));
                expect(chrome.tabs.sendMessage).not.toHaveBeenCalledWith(
                    12, expect.objectContaining({subject: 'llmResponse'}), expect.anything());

                chrome.flushStorageReads();

                expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(12, expect.objectContaining({
                    chunk: expect.stringContaining('no LLM provider nope'),
                }), {frameId: 0});
                expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                    12, {subject: 'llmResponse', message: {}, done: true}, {frameId: 0});
            });
        });

        /*
         * The other order, and the one a page load actually produces: the boot read is
         * issued, then a page reports what the snippets say. A read is answered from
         * the state it was ISSUED in, so that answer predates what the page just
         * persisted -- restoring on top of it would put the previous model or the
         * previous credentials back, and the request waiting on the read is dispatched
         * into exactly that.
         */
        describe('a page that reports the snippets while the read is in flight', () => {
            const snippetSettings = (llm) => ({
                action: 'updateSettings', scope: 'snippets', settings: {llm},
            });

            it('keeps the model the page reported rather than the stored one', () => {
                const init = jest.spyOn(llmClients.bedrock, 'init').mockImplementation(() => {});
                const {chrome, dispatch} = bootstrap({chrome: {
                    deferStorageReads: true,
                    storage: {local: {_llmProviderConfig: {bedrock: {
                        accessKeyId: 'AKIA', secretAccessKey: 'secret', model: 'stale-model',
                    }}}},
                }});
                try {
                    dispatch(snippetSettings({bedrock: {
                        accessKeyId: 'AKIA', secretAccessKey: 'secret', model: 'fresh-model',
                    }}), senderFor(12));
                    expect(init).toHaveBeenCalledWith(expect.objectContaining({model: 'fresh-model'}));

                    chrome.flushStorageReads();

                    // the stale answer landed and was ignored: no second init
                    expect(init).toHaveBeenCalledTimes(1);
                } finally {
                    init.mockRestore();
                }
            });

            it('still releases a request waiting on that read', () => {
                const {chrome, dispatch} = bootstrap({chrome: {deferStorageReads: true}});
                dispatch({action: 'llmRequest', provider: 'nope', messages: []}, senderFor(12));
                dispatch(snippetSettings({ollama: {model: 'llama3.2'}}), senderFor(12));
                expect(chrome.tabs.sendMessage).not.toHaveBeenCalledWith(
                    12, expect.objectContaining({subject: 'llmResponse'}), expect.anything());

                chrome.flushStorageReads();

                expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(12, expect.objectContaining({
                    chunk: expect.stringContaining('no LLM provider nope'),
                }), {frameId: 0});
            });

            /*
             * Snippets carrying no llm config say nothing about the providers stored
             * earlier -- the same reason `_persistLlmProviderConfig` leaves the stored
             * copy alone -- so such an update must not suppress the restore.
             */
            it('still restores when the snippets carry no providers at all', () => {
                const {chrome, dispatch} = bootstrap({chrome: {
                    deferStorageReads: true,
                    storage: {local: {_llmProviderConfig: {custom: {
                        claude: {serviceUrl: 'https://api.example', apiKey: 'k', model: 'claude-x'},
                    }}}},
                }});
                try {
                    dispatch({action: 'updateSettings', scope: 'snippets',
                        settings: {showTabIndices: true}}, senderFor(12));

                    chrome.flushStorageReads();

                    expect(llmClients.claude).toBe(llmClients.custom);
                } finally {
                    delete llmClients.claude;
                }
            });
        });

        it('streams chunks and the final message back to the requesting frame', () => {
            const {chrome, dispatch} = bootstrap();
            llmClients.faux = (message, {onChunk, onComplete}) => {
                onChunk('partial ');
                onComplete({role: 'assistant', content: [{type: 'text', text: 'done'}]});
            };
            try {
                dispatch({action: 'llmRequest', provider: 'faux', messages: []}, senderFor(12));
                expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                    12, {subject: 'llmResponse', chunk: 'partial '}, {frameId: 0});
                expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(12, {
                    subject: 'llmResponse',
                    message: {role: 'assistant', content: [{type: 'text', text: 'done'}]},
                    done: true,
                }, {frameId: 0});
            } finally {
                delete llmClients.faux;
            }
        });

        it('leaves non-text content blocks untouched', () => {
            const {chrome, dispatch} = bootstrap();
            llmClients.faux = (message, {onComplete}) => {
                onComplete({content: [{type: 'image', source: 'x'}]});
            };
            try {
                dispatch({action: 'llmRequest', provider: 'faux', messages: []}, senderFor(12));
                expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(12, expect.objectContaining({
                    message: {content: [{type: 'image', source: 'x'}]},
                }), {frameId: 0});
            } finally {
                delete llmClients.faux;
            }
        });

        it('routes the reply through runtime messaging for a Safari extension page', () => {
            const {chrome, dispatch} = bootstrap({browser: {name: 'Safari'}});
            llmClients.faux = (message, {onChunk}) => onChunk('hi');
            try {
                dispatch({action: 'llmRequest', provider: 'faux', messages: []},
                    {tab: {id: 12}, frameId: 0, origin: 'chrome-extension://surfingkeys'});
                expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
                    {subject: 'llmResponse', chunk: 'hi'});
                expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
            } finally {
                delete llmClients.faux;
            }
        });

        /*
         * Requests overlap: a provider streams for as long as the model takes, and a
         * chat in one tab does not stop the user asking in another (nor do two frames
         * waking this worker together, which queue behind the provider read). Each
         * reply has to reach the frame that ASKED -- one answer arriving in the wrong
         * tab is also an asking frame left hanging on a reply it never gets, with its
         * `llmResponse` booking held until a reload.
         */
        it('streams each of two overlapping requests back to its own frame', () => {
            const {chrome, dispatch} = bootstrap();
            const turns = [];
            llmClients.faux = (message, callbacks) => turns.push(callbacks);
            try {
                dispatch({action: 'llmRequest', provider: 'faux', messages: []}, senderFor(11));
                dispatch({action: 'llmRequest', provider: 'faux', messages: []}, senderFor(12));
                expect(turns).toHaveLength(2);

                // the FIRST request answers after the second has been accepted
                turns[0].onChunk('for eleven');
                turns[0].onComplete({content: [{type: 'text', text: 'eleven done'}]});
                turns[1].onChunk('for twelve');

                expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                    11, {subject: 'llmResponse', chunk: 'for eleven'}, {frameId: 0});
                expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(11, {
                    subject: 'llmResponse',
                    message: {content: [{type: 'text', text: 'eleven done'}]},
                    done: true,
                }, {frameId: 0});
                expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                    12, {subject: 'llmResponse', chunk: 'for twelve'}, {frameId: 0});
                // nothing meant for one tab was delivered to the other
                const routed = chrome.tabs.sendMessage.mock.calls
                    .filter((c) => c[1] && c[1].subject === 'llmResponse')
                    .map((c) => [c[0], c[1].chunk || c[1].message]);
                expect(routed).toEqual([
                    [11, 'for eleven'],
                    [11, {content: [{type: 'text', text: 'eleven done'}]}],
                    [12, 'for twelve'],
                ]);
            } finally {
                delete llmClients.faux;
            }
        });

        // the same two frames, both queued behind the boot read: whichever asked last
        // must not become the destination of the one that asked first
        it('keeps the frames apart when both requests waited for the provider read', () => {
            const {chrome, dispatch} = bootstrap({chrome: {deferStorageReads: true}});
            const turns = [];
            llmClients.faux = (message, callbacks) => turns.push(callbacks);
            try {
                dispatch({action: 'llmRequest', provider: 'faux', messages: []}, senderFor(11));
                dispatch({action: 'llmRequest', provider: 'faux', messages: []}, senderFor(12));
                expect(turns).toHaveLength(0);

                chrome.flushStorageReads();

                expect(turns).toHaveLength(2);
                turns[0].onChunk('for eleven');
                turns[1].onChunk('for twelve');
                expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                    11, {subject: 'llmResponse', chunk: 'for eleven'}, {frameId: 0});
                expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                    12, {subject: 'llmResponse', chunk: 'for twelve'}, {frameId: 0});
            } finally {
                delete llmClients.faux;
            }
        });
    });

    describe('image requests', () => {
        it('re-encodes the fetched image as a data url', async () => {
            mockFetchText('binary');
            global.createImageBitmap = jest.fn(() => Promise.resolve({width: 2, height: 2}));
            global.OffscreenCanvas = jest.fn(function OffscreenCanvasStub(width, height) {
                this.width = width;
                this.height = height;
                this.getContext = () => ({drawImage: jest.fn()});
                this.convertToBlob = () => Promise.resolve(new Blob(['png'], {type: 'image/png'}));
            });
            const {dispatch} = bootstrap();
            const {sendResponse} = dispatch(
                {action: 'requestImage', needResponse: true, url: 'https://img.example/x.png'}, senderFor(12));
            await flushPromises();
            expect(global.OffscreenCanvas).toHaveBeenCalledWith(2, 2);
            // FileReader delivers onload on a later task than the promise chain
            await flushPromises();
            expect(sendResponse).toHaveBeenCalledWith({text: expect.stringContaining('data:')});
        });
    });

    describe('frame discovery', () => {
        it('injects a probe that degrades to frame 0', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch({action: 'nextFrame', frameId: 'f1'}, senderFor(12));
            const injection = chrome.scripting.executeScript.mock.calls[0][0];
            expect(injection.target).toEqual({allFrames: true, tabId: 12});
            // getFrameId only exists inside a Surfingkeys content script
            expect(injection.func()).toBe(0);
        });
    });

    describe('tab history housekeeping', () => {
        it('forgets a closed tab from the history', () => {
            const {chrome, dispatch} = bootstrap();
            [11, 12, 13].forEach((tabId) => chrome.tabs.onActivated.fire({tabId, windowId: 1}));
            chrome.tabs.onRemoved.fire(12);
            chrome.tabs.update.mockClear();

            // with 12 gone the history is [11, 13], so "last tab" is 11
            dispatch({action: 'goToLastTab'}, senderFor(13));
            expect(chrome.tabs.update).toHaveBeenCalledWith(11, {active: true});
        });

        it('keeps at most ten entries', () => {
            const {chrome, dispatch} = bootstrap();
            for (let tabId = 100; tabId < 113; tabId++) {
                chrome.tabs.onActivated.fire({tabId, windowId: 1});
            }
            chrome.tabs.update.mockClear();
            // the oldest entries were shifted out, so index 0 is no longer tab 100
            dispatch({action: 'historyTab', index: 0}, senderFor(12));
            expect(chrome.tabs.update).not.toHaveBeenCalledWith(100, {active: true});
            expect(chrome.tabs.update).toHaveBeenCalledTimes(1);
        });
    });

    describe('llm text decoding', () => {
        it('passes through a chunk that is not latin1-encoded utf8', () => {
            const {chrome, dispatch} = bootstrap();
            // decodeURIComponent(escape(...)) throws on this, so toUTF8 must fall back
            llmClients.faux = (message, {onChunk}) => onChunk('caf\xe9');
            try {
                dispatch({action: 'llmRequest', provider: 'faux', messages: []}, senderFor(12));
                expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                    12, {subject: 'llmResponse', chunk: 'caf\xe9'}, {frameId: 0});
            } finally {
                delete llmClients.faux;
            }
        });

        it('repairs a latin1-mangled utf8 chunk', () => {
            const {chrome, dispatch} = bootstrap();
            llmClients.faux = (message, {onChunk}) => onChunk('caf\xc3\xa9');
            try {
                dispatch({action: 'llmRequest', provider: 'faux', messages: []}, senderFor(12));
                expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
                    12, {subject: 'llmResponse', chunk: 'café'}, {frameId: 0});
            } finally {
                delete llmClients.faux;
            }
        });
    });
    /*
     * Stopping a chat mid-answer: llmchat.js `stopTurn` -> `llmAbort` -> the function
     * the provider returned. A stub provider stands in for a real one, since what is
     * under test is the bookkeeping around it rather than any provider's stream: what
     * gets cancelled, and what the frame hears afterwards.
     */
    describe('aborting an llm request', () => {
        const request = (requestId) => (
            {action: 'llmRequest', provider: 'faux', requestId, messages: []});
        const llmReplies = (chrome) => chrome.tabs.sendMessage.mock.calls
            .filter((c) => c[1] && c[1].subject === 'llmResponse');

        let faux;
        beforeEach(() => {
            // one record per request, since a frame's requests come one after another
            // and each returns a canceller of its own
            faux = jest.fn((message, opts) => {
                const abort = jest.fn();
                faux.requests.push({requestId: message.requestId, opts, abort});
                return abort;
            });
            faux.requests = [];
            llmClients.faux = faux;
        });
        afterEach(() => {
            delete llmClients.faux;
        });

        it('cancels the connection the frame has in flight', () => {
            const {dispatch} = bootstrap();
            dispatch(request(1), senderFor(12));

            dispatch({action: 'llmAbort', requestId: 1}, senderFor(12));

            expect(faux.requests[0].abort).toHaveBeenCalled();
        });

        /*
         * Cancelling a fetch does not stop it reporting -- the rejection reaches
         * `fail`, which sends a chunk and a completion. Those must not reach the frame:
         * by the time they arrive it may have asked something new and booked
         * `llmResponse` again, and nothing in a reply says which request it answers, so
         * they would land in the answer to the new question and release its booking
         * early.
         */
        it('silences a cancelled request instead of letting its reply land', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch(request(1), senderFor(12));
            dispatch({action: 'llmAbort', requestId: 1}, senderFor(12));

            faux.requests[0].opts.onChunk('half an answer');
            faux.requests[0].opts.onComplete({role: 'assistant', content: 'half an answer'});

            expect(llmReplies(chrome)).toHaveLength(0);
        });

        /*
         * An abort names the request it was sent for, and one naming a request this
         * frame is no longer running does nothing. Cancelling the wrong one would be
         * unrecoverable: it is silenced by the rule above, so the frame would wait for
         * an answer that never comes, holding the shared booking, with every LLM
         * feature in it dead until a reload.
         */
        it('ignores an abort that names a request the frame is no longer running', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch(request(1), senderFor(12));
            dispatch({action: 'llmAbort', requestId: 1}, senderFor(12));
            // the user asks something else, and the stopped turn's abort is delivered
            // only now
            dispatch(request(2), senderFor(12));
            dispatch({action: 'llmAbort', requestId: 1}, senderFor(12));

            const asked = faux.requests[1];
            expect(asked.abort).not.toHaveBeenCalled();
            asked.opts.onComplete({role: 'assistant', content: 'the answer'});
            expect(llmReplies(chrome)).toHaveLength(1);
        });

        it('cancels only the frame that asked', () => {
            const {dispatch} = bootstrap();
            dispatch(request(1), senderFor(11));
            dispatch(request(1), senderFor(12));

            dispatch({action: 'llmAbort', requestId: 1}, senderFor(11));

            expect(faux.requests[0].abort).toHaveBeenCalled();
            expect(faux.requests[1].abort).not.toHaveBeenCalled();
        });

        /*
         * A request stopped while it is still queued behind the boot-time config read
         * (see whenLlmProvidersReady) has nothing to cancel yet, so not starting it is
         * the cancellation.
         */
        it('never starts a request stopped while queued behind the config read', () => {
            const {chrome, dispatch} = bootstrap({chrome: {deferStorageReads: true}});
            dispatch(request(1), senderFor(12));
            dispatch({action: 'llmAbort', requestId: 1}, senderFor(12));

            chrome.flushStorageReads();

            expect(faux).not.toHaveBeenCalled();
            expect(llmReplies(chrome)).toHaveLength(0);
        });

        // an abort races a reply that was already on its way, and the caller cannot
        // know which won
        it('does nothing when the frame has nothing in flight', () => {
            const {chrome, dispatch} = bootstrap();
            dispatch(request(1), senderFor(12));
            faux.requests[0].opts.onComplete({role: 'assistant', content: 'the answer'});

            expect(() => dispatch({action: 'llmAbort', requestId: 1}, senderFor(12))).not.toThrow();
            expect(faux.requests[0].abort).not.toHaveBeenCalled();
            expect(llmReplies(chrome)).toHaveLength(1);
        });
    });
});
