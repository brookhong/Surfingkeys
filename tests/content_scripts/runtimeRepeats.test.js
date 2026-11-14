describe('repeat counts across the user-script boundary', () => {
    const load = (snippets) => {
        let content, userScript;
        const sent = [];
        global.chrome = {
            runtime: {
                getURL: (path) => `chrome-extension://surfingkeys/${path.replace(/^\//, '')}`,
                onMessage: {addListener: jest.fn()},
                sendMessage: (args, cb) => {
                    sent.push({...args});
                    if (args.action === 'getChannelScope') {
                        cb({scope: content.skChannelScope()});
                    } else if (cb) {
                        cb({answer: 42});
                    }
                },
            },
        };
        jest.isolateModules(() => {
            content = require('../../src/content_scripts/common/runtime.js');
            content.Mode = require('../../src/content_scripts/common/mode.js').default;
            const Trie = require('../../src/content_scripts/common/trie.js').default;
            const mode = () => {
                const mappings = new Trie();
                return {mappings, map_node: mappings, repeats: ''};
            };
            content.normal = mode();
            content.insert = mode();
            content.visual = mode();
            content.scrollRepeats = [];
            content.normal.scroll = jest.fn(() => {
                content.scrollRepeats.push(content.RUNTIME.repeats);
                content.RUNTIME.repeats = 0;
            });
            const createAPI = require('../../src/content_scripts/common/api.js').default;
            createAPI({}, content.insert, content.normal, {}, content.visual, {}, {});
        });
        jest.isolateModules(() => {
            userScript = require('../../src/user_scripts/index.js').default;
        });
        let api;
        userScript('chrome-extension://surfingkeys/', (userAPI) => {
            api = userAPI;
            snippets(api);
        });
        content.dispatchSKEvent('user', ['runUserScript']);
        const press = (keys, mode = content.normal) => {
            for (const key of keys) {
                content.Mode.handleMapKey.call(mode, {sk_keyName: key});
            }
        };
        const actions = () => sent.filter(({action}) => ['closeTab', 'moveTab'].includes(action));
        return {...content, api, sent, press, actions};
    };

    const tabMappings = (api) => {
        api.mapkey('x', '#3Close current tab', () => api.RUNTIME('closeTab'));
        api.mapkey('>>', '#3Move current tab right', () => api.RUNTIME('moveTab', {step: 1}));
    };

    it.each(['x', '>>'])('sends the first %s command with one repeat after every page load', (keys) => {
        for (let page = 0; page < 2; page++) {
            const {press, actions} = load(tabMappings);
            press(keys);
            expect(actions()).toHaveLength(1);
            expect(actions()[0].repeats).toBe(1);
        }
    });

    it('does not need a move command to prime closing', () => {
        const {press, actions} = load(tabMappings);
        press('>>x');
        expect(actions()).toEqual([
            {action: 'moveTab', step: 1, repeats: 1, needResponse: false},
            {action: 'closeTab', repeats: 1, needResponse: false},
        ]);
    });

    it.each(['3x', '3>>'])('sends %s once with the entire repeat count', (keys) => {
        const {press, actions} = load(tabMappings);
        press(keys);
        expect(actions()).toHaveLength(1);
        expect(actions()[0].repeats).toBe(3);
    });

    it('does not leak a numeric prefix into the next command', () => {
        const {press, actions} = load(tabMappings);
        press('3>>x');
        expect(actions().map(({repeats}) => repeats)).toEqual([3, 1]);
    });

    it('still repeats foreground-only custom callbacks', () => {
        const counts = [];
        const {press} = load((api) => {
            api.mapkey('a', '#14Record repeat count', () => counts.push(api.RUNTIME.repeats));
        });
        press('3a');
        expect(counts).toEqual([3, 2, 1]);
    });

    it('shares repeat consumption with content-script actions', () => {
        const {press, normal, RUNTIME, scrollRepeats} = load((api) => {
            api.mapkey('j', '#2Scroll down', () => api.Normal.scroll('down'));
        });
        press('3j');
        expect(normal.scroll).toHaveBeenCalledTimes(1);
        expect(scrollRepeats).toEqual([3]);
        expect(RUNTIME.repeats).toBeLessThanOrEqual(0);
    });

    it('shares explicit changes to the public repeat count', () => {
        const {press, actions} = load((api) => {
            api.mapkey('x', '#3Close two tabs', () => {
                api.RUNTIME.repeats = 2;
                api.RUNTIME('closeTab');
            });
        });
        press('x');
        expect(actions()).toEqual([{action: 'closeTab', repeats: 2, needResponse: false}]);
    });

    it.each(['insert', 'visual'])('supports runtime commands in %s mappings', (modeName) => {
        const {press, actions, ...content} = load((api) => {
            const mapkey = modeName === 'insert' ? api.imapkey : api.vmapkey;
            mapkey('x', '#3Close current tab', () => api.RUNTIME('closeTab'));
        });
        press('x', content[modeName]);
        expect(actions()).toEqual([{action: 'closeTab', repeats: 1, needResponse: false}]);
    });

    it('preserves parameter-taking normal mappings', () => {
        const parameters = [];
        const {press, actions} = load((api) => {
            api.mapkey('m', '#3Close on x', (key) => {
                parameters.push(key);
                api.RUNTIME('closeTab');
            });
        });
        press('mx');
        expect(parameters).toEqual(['x']);
        expect(actions()).toEqual([{action: 'closeTab', repeats: 1, needResponse: false}]);
    });

    it('keeps runtime response callbacks working', () => {
        const response = jest.fn();
        const {press} = load((api) => {
            api.mapkey('a', '#14Read tabs', () => api.RUNTIME('getTabs', {}, response));
        });
        press('a');
        expect(response).toHaveBeenCalledWith({answer: 42});
    });
});
