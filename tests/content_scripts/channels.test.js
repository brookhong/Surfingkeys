/*
 * SurfingKeys' internal channels are DOM events on the document the visited page
 * also owns, and the page can dispatch and listen to any event name it can write
 * down. These are about the name being one it cannot write down: an api channel a
 * page can name is a page that can call clipboard:read and feedkeys.
 */
describe('channel names', () => {
    // A document counts as an extension page when its url sits under getURL("/"), so
    // pointing getURL at the jsdom document's own origin is what that looks like from
    // inside the module.
    const chromeStub = (extensionRoot = 'chrome-extension://surfingkeys/') => ({
        runtime: {
            getURL: (path) => `${extensionRoot}${path.replace(/^\//, '')}`,
            onMessage: {addListener: jest.fn()},
            sendMessage: () => {},
        },
    });

    // Fresh module instances, so each load draws its own scope the way a new
    // document does.
    const load = (chrome = chromeStub()) => {
        global.chrome = chrome;
        let loaded;
        jest.isolateModules(() => {
            loaded = {
                ...require('../../src/content_scripts/common/runtime.js'),
                initSKFunctionListener:
                    require('../../src/content_scripts/common/utils.js').initSKFunctionListener,
            };
        });
        return loaded;
    };

    it('does not answer the channel name a page script can write down', () => {
        const {initSKFunctionListener, dispatchSKEvent} = load();
        const read = jest.fn();
        initSKFunctionListener('api', {'clipboard:read': read});

        document.dispatchEvent(new CustomEvent('surfingkeys:api', {detail: ['clipboard:read']}));
        expect(read).not.toHaveBeenCalled();

        dispatchSKEvent('api', ['clipboard:read']);
        expect(read).toHaveBeenCalled();
    });

    it('draws a different scope for every document', () => {
        const first = load().skChannelScope();
        const second = load().skChannelScope();
        expect(first).toMatch(/^[0-9a-f]{32}$/);
        expect(second).toMatch(/^[0-9a-f]{32}$/);
        expect(first).not.toBe(second);
    });

    it('leaves the name bare in an extension document', () => {
        // options.html, markdown.html and neovim.html each load content.js next to
        // their own bundle, and the two only meet on a name both can derive.
        const {skChannelScope, skEventName} = load(chromeStub('http://localhost/'));
        expect(skChannelScope()).toBe('');
        expect(skEventName('defaultSettingsLoaded')).toBe('surfingkeys:defaultSettingsLoaded');
    });

    it('lets a world that was told the scope reach the same channel', () => {
        // What a Chrome MV3 user script does: it shares the document but not the
        // module state, so it fetches the content script's scope through the
        // background.
        const page = load();
        const handled = jest.fn();
        page.initSKFunctionListener('api', {map: handled});

        const userScriptWorld = load();
        userScriptWorld.setChannelScope(page.skChannelScope());
        userScriptWorld.dispatchSKEvent('api', ['map', 'a', 'b']);
        expect(handled).toHaveBeenCalledWith('a', 'b');
    });
});

/*
 * Whether a world is a receiving end for background messages at all. Every world of
 * a document is dispatched the same message, and one that returns without answering
 * closes the reply port for the world that would have answered, so a world with
 * nothing to answer with must not be listening.
 */
describe('background message listener', () => {
    const load = () => {
        global.chrome = {
            runtime: {
                getURL: (path) => `chrome-extension://surfingkeys/${path.replace(/^\//, '')}`,
                onMessage: {addListener: jest.fn()},
                sendMessage: () => {},
            },
        };
        let loaded;
        jest.isolateModules(() => {
            loaded = require('../../src/content_scripts/common/runtime.js');
        });
        return {...loaded, addListener: global.chrome.runtime.onMessage.addListener};
    };

    it('is not registered by a world that handles nothing', () => {
        const {addListener} = load();
        expect(addListener).not.toHaveBeenCalled();
    });

    it('is registered as soon as there is something to answer', () => {
        const {runtime, addListener} = load();
        runtime.on('getChannelScope', () => {});
        expect(addListener).toHaveBeenCalledTimes(1);
    });

    it('is registered once however many handlers arrive', () => {
        const {runtime, addListener} = load();
        runtime.on('settingsUpdated', () => {});
        runtime.on('tabActivated', () => {});
        expect(runtime.bookMessage('llmResponse', () => {})).toBe(true);
        expect(addListener).toHaveBeenCalledTimes(1);
    });

    it('answers a booked message and ignores one it holds no handler for', () => {
        const {runtime, addListener} = load();
        const answer = jest.fn();
        runtime.on('getChannelScope', (msg, sender, response) => response({scope: 'abc'}));
        const listener = addListener.mock.calls[0][0];

        listener({subject: 'getChannelScope'}, {}, answer);
        expect(answer).toHaveBeenCalledWith({scope: 'abc'});

        // Silence here is the reason the listener must not exist in a world that
        // would only ever be silent.
        answer.mockClear();
        listener({subject: 'somethingElse'}, {}, answer);
        expect(answer).not.toHaveBeenCalled();
    });
});

/*
 * The world holding a Chrome MV3 user's snippets. It reaches the content script only
 * over the scoped channels, so it can neither speak nor be spoken to until it has
 * fetched the scope, which makes starting the snippets a handshake.
 */
describe('user script world', () => {
    const RETRY = 100;
    const TIMEOUT = 1000;

    // Successive replies to getChannelScope, in order. The real one comes from the
    // content script sharing this document, relayed by the background.
    const loadUserScript = (replies) => {
        const asked = [];
        global.chrome = {
            runtime: {
                getURL: (path) => `chrome-extension://surfingkeys/${path.replace(/^\//, '')}`,
                onMessage: {addListener: jest.fn()},
                sendMessage: (args, cb) => {
                    asked.push(args);
                    cb(replies.shift());
                },
            },
        };
        let mod;
        jest.isolateModules(() => {
            mod = require('../../src/user_scripts/index.js');
        });
        return {start: mod.default, asked, addListener: global.chrome.runtime.onMessage.addListener};
    };

    const listensOn = (scope) => {
        const announced = jest.fn();
        document.addEventListener(`surfingkeys:${scope}:userScriptListening`, announced);
        return announced;
    };

    const runUserScript = (scope) => document.dispatchEvent(
        new CustomEvent(`surfingkeys:${scope}:user`, {detail: ['runUserScript']}));

    it('announces itself and leaves the start to the content script', () => {
        const {start} = loadUserScript([{scope: 'one'}]);
        const announced = listensOn('one');
        const snippets = jest.fn();

        start('chrome-extension://surfingkeys/', snippets);
        expect(announced).toHaveBeenCalled();
        // The content script's own settings would otherwise land on top of whatever
        // the snippets set, so when to start them is its call, not this world's.
        expect(snippets).not.toHaveBeenCalled();

        runUserScript('one');
        expect(snippets).toHaveBeenCalled();
    });

    it('cannot be started on a name page script can write down', () => {
        const {start} = loadUserScript([{scope: 'two'}]);
        const snippets = jest.fn();
        start('chrome-extension://surfingkeys/', snippets);

        document.dispatchEvent(new CustomEvent('surfingkeys:user', {detail: ['runUserScript']}));
        expect(snippets).not.toHaveBeenCalled();
    });

    it('never becomes a receiving end that could eat its own reply', () => {
        // The scope it asks for is answered by the content script in this same
        // document, and every world of a document is dispatched that message. A
        // listener here holds no handler for it, so if Chrome dispatches this world
        // first it closes the reply port and the answer never arrives -- at random,
        // since that order is not guaranteed.
        const {start, addListener} = loadUserScript([{scope: 'four'}]);
        start('chrome-extension://surfingkeys/', () => {});
        expect(addListener).not.toHaveBeenCalled();
    });

    it('says it is waiting on the first failure, then keeps asking', () => {
        jest.useFakeTimers();
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const {start, asked} = loadUserScript([{error: 'no receiving end'}, {scope: 'three'}]);
        const announced = listensOn('three');

        start('chrome-extension://surfingkeys/', () => {});
        expect(announced).not.toHaveBeenCalled();
        // Reported straight away: the budget below takes twenty seconds to run out,
        // and until it does nothing else says the snippets have not started.
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('no receiving end'));

        jest.advanceTimersByTime(RETRY);
        expect(announced).toHaveBeenCalled();
        expect(asked).toHaveLength(2);
        warn.mockRestore();
        jest.useRealTimers();
    });

    it('asks again when the send is swallowed and no reply ever comes', () => {
        jest.useFakeTimers();
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        // RUNTIME reports a failed send by dispatching a front event, which in this
        // world is named after a scope nothing has adopted, so it lands nowhere and
        // the callback never runs. Only the timer gets the snippets moving again.
        const {start, asked} = loadUserScript([]);
        global.chrome.runtime.sendMessage = (args) => {
            asked.push(args);
            if (asked.length > 1) {
                throw new Error('should not reach here');
            }
        };
        const announced = listensOn('five');

        start('chrome-extension://surfingkeys/', () => {});
        expect(asked).toHaveLength(1);

        global.chrome.runtime.sendMessage = (args, cb) => {
            asked.push(args);
            cb({scope: 'five'});
        };
        jest.advanceTimersByTime(TIMEOUT + RETRY);
        expect(asked).toHaveLength(2);
        expect(announced).toHaveBeenCalled();
        warn.mockRestore();
        jest.useRealTimers();
    });

    it('stops at once on a reason asking again cannot change', () => {
        jest.useFakeTimers();
        const error = jest.spyOn(console, 'error').mockImplementation(() => {});
        const {start, asked} = loadUserScript([{error: 'no frame to ask', terminal: true}]);

        start('chrome-extension://surfingkeys/', () => {});
        jest.advanceTimersByTime(RETRY * 30);

        expect(asked).toHaveLength(1);
        expect(error).toHaveBeenCalledWith(expect.stringContaining('no frame to ask'));
        error.mockRestore();
        jest.useRealTimers();
    });

    it('says so when no scope ever arrives, once on the way and once at the end', () => {
        jest.useFakeTimers();
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const error = jest.spyOn(console, 'error').mockImplementation(() => {});
        const {start, asked} = loadUserScript(
            new Array(40).fill(0).map(() => ({error: 'no receiving end'})));

        start('chrome-extension://surfingkeys/', () => {});
        jest.advanceTimersByTime(RETRY * 30);

        // Nothing else reports this, and the symptom is every mapping in the
        // snippets silently doing nothing.
        expect(error).toHaveBeenCalledWith(expect.stringContaining('no receiving end'));
        // Not once per ask.
        expect(warn).toHaveBeenCalledTimes(1);
        expect(asked.length).toBeLessThan(40);
        warn.mockRestore();
        error.mockRestore();
        jest.useRealTimers();
    });
});

/*
 * The content script's half of that handshake. It holds the scope and decides when
 * the snippets run, so it must wait for both its own settings and the user script,
 * in whichever order they arrive.
 */
describe('content script side of the handshake', () => {
    // The whole content script, loaded for real; only the extension APIs it reaches
    // are stubbed. manifestVersion picks the build: a user script asks for the scope
    // on chromium (MV3) and exists nowhere else.
    const loadContentScript = (manifestVersion = 3) => {
        let replyWithSettings = () => {};
        const store = {get: (keys, cb) => cb && cb({}), set: (items, cb) => cb && cb()};
        global.chrome = {
            runtime: {
                getURL: (path) => `chrome-extension://surfingkeys/${path.replace(/^\//, '')}`,
                getManifest: () => ({manifest_version: manifestVersion}),
                onMessage: {addListener: jest.fn()},
                sendMessage: (args, cb) => {
                    if (!cb) {
                        return;
                    }
                    if (args.action === 'getSettings') {
                        // held, so a test can put the stored settings either side of
                        // the user script's announcement
                        replyWithSettings = () => cb({settings: {}});
                    } else if (args.action === 'getState') {
                        cb({state: 'enabled'});
                    } else {
                        cb({index: 0});
                    }
                },
            },
            storage: {local: store, sync: store},
        };
        let content, channels;
        jest.isolateModules(() => {
            content = require('../../src/content_scripts/content.js');
            channels = require('../../src/content_scripts/common/runtime.js');
        });
        const scope = channels.skChannelScope();
        const started = [];
        document.addEventListener(`surfingkeys:${scope}:user`,
            (evt) => started.push(evt.detail));
        return {
            scope,
            started,
            addListener: global.chrome.runtime.onMessage.addListener,
            start: () => content.start({usePdfViewer: () => {}, readText: () => {}}),
            settingsArrive: () => replyWithSettings(),
            announce: (name = `surfingkeys:${scope}:userScriptListening`) =>
                document.dispatchEvent(new CustomEvent(name)),
        };
    };

    it('waits for the settings when the user script announces itself first', () => {
        const {start, announce, settingsArrive, started} = loadContentScript();
        start();

        announce();
        // Starting here would let this frame's stored values land on top of whatever
        // the snippets set.
        expect(started).toEqual([]);

        settingsArrive();
        expect(started).toEqual([['runUserScript']]);
    });

    it('waits for the user script when the settings arrive first', () => {
        const {start, announce, settingsArrive, started} = loadContentScript();
        start();

        settingsArrive();
        // Nothing in that world can hear this channel until it has the scope, so a
        // start dispatched now would be dropped and the snippets never run.
        expect(started).toEqual([]);

        announce();
        expect(started).toEqual([['runUserScript']]);
    });

    it('starts the snippets once however often it is announced', () => {
        const {start, announce, settingsArrive, started} = loadContentScript();
        start();
        settingsArrive();
        announce();
        announce();
        expect(started).toEqual([['runUserScript']]);
    });

    it('cannot be triggered on the name page script can write down', () => {
        const {start, announce, settingsArrive, started} = loadContentScript();
        start();
        settingsArrive();

        announce('surfingkeys:userScriptListening');
        expect(started).toEqual([]);
    });

    it('answers the scope of its own document', () => {
        const {addListener, scope} = loadContentScript();
        // Registered at load, before any mode boots: the user script asks in whichever
        // frame it runs in, and a frame's modes only boot on first focus or keystroke.
        const listener = addListener.mock.calls[0][0];
        const response = jest.fn();

        listener({subject: 'getChannelScope'}, {}, response);
        expect(response).toHaveBeenCalledWith({scope});
        expect(scope).toMatch(/^[0-9a-f]{32}$/);
    });

    it('is no receiving end at all where nothing can ask', async () => {
        // No user scripts outside the chromium build, so a frame there would become a
        // receiving end for background messages purely to answer a question nobody
        // asks.
        const {start, addListener} = loadContentScript(2);
        expect(addListener).not.toHaveBeenCalled();

        start();
        await Promise.resolve();
        const response = jest.fn();
        addListener.mock.calls[0][0]({subject: 'getChannelScope'}, {}, response);
        expect(response).not.toHaveBeenCalled();
    });
});
