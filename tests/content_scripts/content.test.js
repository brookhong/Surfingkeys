import MockTrie from '../../src/content_scripts/common/trie';

describe('content.js', () => {
    let content, settings, mockNormal;
    let mockHalfPageUp = () => {},
        mockHalfPageDown = () => {},
        mockClosePage = () => {};
    const mockBrowser = {
        usePdfViewer: jest.fn(),
        readText: jest.fn()
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
                getURL: jest.fn(),
                onMessage: {
                    addListener: jest.fn()
                }
            },
            extension: {
                getURL: jest.fn()
            }
        }
        global.DOMRect = jest.fn();

        jest.mock('../../src/content_scripts/common/normal.js', () => (insert) => {
            mockNormal = {
                enter: jest.fn(),
                mappings: new MockTrie()
            }
            mockNormal.mappings.add('e', {
                code: mockHalfPageUp
            });
            mockNormal.mappings.add('d', {
                code: mockHalfPageDown
            });
            mockNormal.mappings.add(';x', {
                code: mockClosePage
            });
            return mockNormal;
        });
        content = require('src/content_scripts/content.js');
    });

    test("content start", async () => {
        settings = {
        };
        content.start(mockBrowser);
        await new Promise((r) => {
            document.addEventListener("DOMContentLoaded", function(evt) {
                expect(mockNormal.mappings.find('e').meta.code).toBe(mockHalfPageUp);
                expect(mockNormal.mappings.find('d').meta.code).toBe(mockHalfPageDown);
                expect(mockNormal.mappings.find(';x').meta.code).toBe(mockClosePage);
                r(evt);
            }, {once: true});
            document.dispatchEvent(new Event("DOMContentLoaded", {
                bubbles: true,
                cancelable: true
            }));
        });
    });

    test("content start with custom basic mappings", async () => {
        // the basicMappings setting will swap `e` and `d`, and remove `;x`.
        settings = {
            basicMappings: {
                "e": "d",
                "d": "e",
                ";x": ""
            }
        };
        content.start(mockBrowser);
        await new Promise((r) => {
            document.addEventListener("DOMContentLoaded", function(evt) {
                expect(mockNormal.mappings.find('e').meta.code).toBe(mockHalfPageDown);
                expect(mockNormal.mappings.find('d').meta.code).toBe(mockHalfPageUp);
                expect(mockNormal.mappings.find(';x')).toBe(undefined);
                r(evt);
            }, {once: true});
            document.dispatchEvent(new Event("DOMContentLoaded", {
                bubbles: true,
                cancelable: true
            }));
        });
    });

    test("content start with custom snippets", async () => {
        settings = {
            showAdvanced: true,
            snippets: 'api.map("e", "d");api.unmap("d")'
        };
        content.start(mockBrowser);
        await new Promise((r) => {
            document.addEventListener("DOMContentLoaded", function(evt) {
                expect(mockNormal.mappings.find('e').meta.code).toBe(mockHalfPageDown);
                expect(mockNormal.mappings.find('d')).toBe(undefined);
                r(evt);
            }, {once: true});
            document.dispatchEvent(new Event("DOMContentLoaded", {
                bubbles: true,
                cancelable: true
            }));
        });
    });

    test("content start with custom invalid snippets", async () => {
        settings = {
            showAdvanced: true,
            snippets: 'map("e", "d");unmap("d")'
        };
        await new Promise((r) => {
            // listener on surfingkeys:showPopup must be added before content.start
            document.addEventListener("surfingkeys:showPopup", function(evt) {
                expect(evt.detail[0]).toBe("Error found in settings: ReferenceError: map is not defined");
                r(evt);
            }, {once: true});

            content.start(mockBrowser);

            document.addEventListener("DOMContentLoaded", function(evt) {
                expect(mockNormal.mappings.find('e').meta.code).toBe(mockHalfPageUp);
                expect(mockNormal.mappings.find('d').meta.code).toBe(mockHalfPageDown);
            }, {once: true});
            document.dispatchEvent(new Event("DOMContentLoaded", {
                bubbles: true,
                cancelable: true
            }));
        });
    });
});
