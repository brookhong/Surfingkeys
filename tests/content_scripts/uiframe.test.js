describe('uiframe.js', () => {
    let uiframe;

    beforeAll(async () => {
        global.chrome = {
            runtime: {
                sendMessage: (args, callback) => {
                    if (args.action === "getSettings") {
                        callback({settings});
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
        uiframe = require('src/content_scripts/uiframe.js');
    });

    it("", () => {
        uiframe.default();
    });
});
