import MockTrie from '../../src/content_scripts/common/trie';
import KeyboardUtils from '../../src/content_scripts/common/keyboardUtils';
import { waitForEvent } from '../utils';

describe('content.js', () => {
    let content, settings;
    let mockHalfPageUp = () => {},
        mockHalfPageDown = () => {},
        mockClosePage = () => {};
    const mockBrowser = {
        usePdfViewer: jest.fn(),
        readText: jest.fn()
    };

    const loadDOMContent = async () => {
        await waitForEvent(document, "DOMContentLoaded", () => {
            return true;
        }, () => {
            document.dispatchEvent(new Event("DOMContentLoaded", {
                bubbles: true,
                cancelable: true
            }));
        });
    };

    beforeAll(async () => {
        global.chrome = {
            runtime: {
                sendMessage: (args, callback) => {
                    if (args.action === "getSettings") {
                        callback({settings});
                    } else if (args.action === "tabURLAccessed") {
                        callback({active: true, index: 1});
                    }
                },
                getURL: (path) => {
                    return path;
                },
                onMessage: {
                    addListener: jest.fn()
                }
            },
            storage: {
                local: {
                    get: jest.fn()
                }
            },
            extension: {
                getURL: jest.fn()
            }
        }
        global.DOMRect = jest.fn();

        content = require('src/content_scripts/content.js');
    });

    test("content start", async () => {
        settings = {
        };
        const modes = content.start(mockBrowser);

        loadDOMContent();
        expect(modes.normal.mappings.find('e').meta.annotation).toBe("Scroll half page up");
        expect(modes.normal.mappings.find('d').meta.annotation).toBe("Scroll half page down");
        expect(modes.normal.mappings.find(';e').meta.annotation).toBe("Edit Settings");
    });

    test("content start with custom basic mappings", async () => {
        // the basicMappings setting will swap `e` and `d`, and remove `;x`.
        settings = {
            basicMappings: {
                "e": "d",
                "d": "e",
                ";e": ""
            }
        };
        const modes = content.start(mockBrowser);
        loadDOMContent();
        expect(modes.normal.mappings.find('d').meta.annotation).toBe("Scroll half page up");
        expect(modes.normal.mappings.find('e').meta.annotation).toBe("Scroll half page down");
        expect(modes.normal.mappings.find(';e')).toBe(undefined);
    });

    test("content start with custom snippets", async () => {
        settings = {
            showAdvanced: true,
            snippets: 'api.map("e", "d");api.unmap("d")'
        };
        const modes = content.start(mockBrowser);
        loadDOMContent();
        expect(modes.normal.mappings.find('e').meta.annotation).toBe("Scroll half page down");
        expect(modes.normal.mappings.find('d')).toBe(undefined);
    });

    test("content start with custom invalid snippets", async () => {
        settings = {
            showAdvanced: true,
            snippets: 'map("e", "d");unmap("d")'
        };
        await new Promise((r) => {
            // listener on surfingkeys:showPopup must be added before content.start
            document.addEventListener("surfingkeys:showPopup", function(evt) {
                expect(evt.detail[0]).toBe("[SurfingKeys] Error found in settings: ReferenceError: map is not defined");
                r(evt);
            }, {once: true});

            content.start(mockBrowser);
            loadDOMContent();
        });
    });

    test("verify unmapAllExcept", async () => {
        settings = {
            showAdvanced: true,
            snippets: 'api.unmapAllExcept([";e"])'
        };
        const modes = content.start(mockBrowser);
        loadDOMContent();
        expect(modes.normal.mappings.find('e')).toBe(undefined);
        expect(modes.normal.mappings.find('d')).toBe(undefined);
        expect(modes.normal.mappings.find(';e').meta.annotation).toBe("Edit Settings");
    });

    test("verify mapkey with double space", async () => {
        settings = {
            showAdvanced: true,
            snippets: "api.mapkey('<Space><Space>', 'Test double space', function() { api.Front.showPopup('afdfd'); });"
        };
        const modes = content.start(mockBrowser);
        modes.front.attach();
        modes.normal.__trust_all_events__ = true;

        loadDOMContent();

        const bound = modes.normal.mappings.find(KeyboardUtils.encodeKeystroke("<Space><Space>"));
        expect(bound.meta.annotation).toBe("Test double space");

        await new Promise((r) => {
            document.addEventListener("surfingkeys:showKeystroke", function(evt) {
                expect(evt.detail[0]).toBe(KeyboardUtils.encodeKeystroke("<Space>"));
                r(evt);
            }, {once: true});

            // press space
            const spaceKey = new KeyboardEvent('keydown', {isTrusted: true, 'keyCode': 32});
            document.body.dispatchEvent(spaceKey);
        });
    });
});
