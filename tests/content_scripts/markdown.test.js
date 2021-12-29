const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.resolve(__dirname, '../../src/pages/markdown.html'), 'utf8');

describe('markdown viewer', () => {
    let dispatchSKEvent, createClipboard, createInsert, createNormal,
        createHints, createVisual, createFront, createAPI;

    beforeAll(async () => {
        const navigator = { userAgent: "Chrome", platform: "Mac" };
        Object.defineProperty(window, 'navigator', {
            value: navigator,
            writable: true
        });

        global.chrome = {
            runtime: {
                sendMessage: jest.fn(),
                onMessage: {
                    addListener: jest.fn()
                }
            },
            extension: {
                getURL: jest.fn()
            }
        }
        global.DOMRect = jest.fn();
        window.focus = jest.fn();
        document.documentElement.innerHTML = html.toString();

        dispatchSKEvent = require('src/content_scripts/common/runtime.js').dispatchSKEvent;
        createClipboard = require('src/content_scripts/common/clipboard.js').default;
        createInsert = require('src/content_scripts/common/insert.js').default;
        createNormal = require('src/content_scripts/common/normal.js').default;
        createHints = require('src/content_scripts/common/hints.js').default;
        createVisual = require('src/content_scripts/common/visual.js').default;
        createFront = require('src/content_scripts/front.js').default;
        createAPI = require('src/content_scripts/common/api.js').default;
        require('src/content_scripts/markdown');
    });

    test("view a local file", async () => {
        document.scrollingElement = {};
        document.execCommand = jest.fn();

        const clipboard = createClipboard();
        const insert = createInsert();
        const normal = createNormal(insert);
        const hints = createHints(insert, normal);
        const visual = createVisual(clipboard, hints);
        const front = createFront(insert, normal, hints, visual);
        const api = createAPI(clipboard, insert, normal, hints, visual, front, {});

        expect(normal.mappings.find('of')).toBe(undefined);
        expect(document.execCommand).toHaveBeenCalledTimes(0);

        dispatchSKEvent('defaultSettingsLoaded', {normal, api});
        await new Promise((r) => setTimeout(r, 100));

        expect(normal.mappings.find('of').meta.word).toBe('of');
        expect(document.execCommand).toHaveBeenCalledTimes(1);

        normal.feedkeys('of');
        await new Promise((r) => setTimeout(r, 100));
    });
});
