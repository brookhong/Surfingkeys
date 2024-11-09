const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.resolve(__dirname, '../../src/pages/markdown.html'), 'utf8');
import { waitForEvent } from '../utils';

describe('markdown viewer', () => {
    let dispatchSKEvent, createClipboard, createInsert, createNormal,
        createHints, createVisual, createFront, createAPI, createDefaultMappings;

    let normal, clipboard, api, Mode;

    beforeAll(async () => {
        const navigator = { userAgent: "Chrome", platform: "Mac" };
        Object.defineProperty(window, 'navigator', {
            value: navigator,
            writable: true
        });

        global.chrome = {
            runtime: {
                getURL: jest.fn(),
                sendMessage: jest.fn(),
                onMessage: {
                    addListener: jest.fn()
                }
            },
            storage: {
                local: {
                    get: jest.fn()
                }
            }
        }
        global.DOMRect = jest.fn();
        window.focus = jest.fn();
        document.documentElement.innerHTML = html.toString();

        dispatchSKEvent = require('src/content_scripts/common/runtime.js').dispatchSKEvent;
        createClipboard = require('src/content_scripts/common/clipboard.js').default;
        Mode = require('src/content_scripts/common/mode.js').default;
        createInsert = require('src/content_scripts/common/insert.js').default;
        createNormal = require('src/content_scripts/common/normal.js').default;
        createHints = require('src/content_scripts/common/hints.js').default;
        createVisual = require('src/content_scripts/common/visual.js').default;
        createFront = require('src/content_scripts/front.js').default;
        createAPI = require('src/content_scripts/common/api.js').default;
        createDefaultMappings = require('src/content_scripts/common/default.js').default;
        require('src/content_scripts/markdown');

        Mode.init();
        document.scrollingElement = {};
        clipboard = createClipboard();
        const insert = createInsert();
        normal = createNormal(insert);
        normal.enter();
        const hints = createHints(insert, normal);
        const visual = createVisual(clipboard, hints);
        const front = createFront(insert, normal, hints, visual);
        api = createAPI(clipboard, insert, normal, hints, visual, front, {});
        createDefaultMappings(api, clipboard, insert, normal, hints, visual, front);
    });

    test("verify local shortcuts for markdown preview", async () => {
        document.execCommand = jest.fn();

        expect(normal.mappings.find('of')).toBe(undefined);
        expect(document.execCommand).toHaveBeenCalledTimes(0);

        await waitForEvent(document, "surfingkeys:defaultSettingsLoaded", () => {
            return true;
        }, () => {
            dispatchSKEvent('defaultSettingsLoaded', {normal, api});
        });

        expect(normal.mappings.find('of').meta.word).toBe('of');
        expect(document.execCommand).toHaveBeenCalledTimes(1);
    });

    test("render markdown from clipboard", async () => {
        jest.spyOn(clipboard, 'read').mockImplementationOnce((onReady) => {
            onReady({data: "* [github](https://github.com)\n* [google](https://google.com)"});
        });
        await waitForEvent(document, "surfingkeys:defaultSettingsLoaded", () => {
            return true;
        }, () => {
            dispatchSKEvent('defaultSettingsLoaded', {normal, api});
        });
        const links = document.querySelectorAll("a");
        expect(links.length).toBe(2);
        expect(links[0].href).toBe("https://github.com/");
    });

    test("follow links generated from markdown", async () => {
        jest.spyOn(clipboard, 'read').mockImplementationOnce((onReady) => {
            onReady({data: "* [github](https://github.com)\n* [google](https://google.com)"});
        });
        await waitForEvent(document, "surfingkeys:defaultSettingsLoaded", () => {
            return true;
        }, () => {
            dispatchSKEvent('defaultSettingsLoaded', {normal, api});
        });

        const links = document.querySelectorAll("a");
        links.forEach((l, i) => {
            l.getBoundingClientRect = jest.fn(() => {
                return { width: 100, height: 10, top: 100 * i, left: 0, bottom: 0, right: 0 };
            });
        });
        document.elementFromPoint = jest.fn(() => {
            return null;
        });
        expect(document.querySelector("div.surfingkeys_hints_host")).toBe(null);

        document.body.dispatchEvent(new KeyboardEvent('keydown', {'key': 'f'}));
        const hint_labels = document.querySelector("div.surfingkeys_hints_host").shadowRoot.querySelectorAll("section>div");
        expect(hint_labels.length).toBe(2);
        expect(hint_labels[0].label).toBe("A");
        expect(hint_labels[1].label).toBe("S");
    });
});
