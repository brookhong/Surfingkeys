describe('normal mode', () => {
    let insert, normal, runtime, Mode;

    beforeAll(async () => {
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

        runtime = require('src/content_scripts/common/runtime.js').runtime;
        Mode = require('src/content_scripts/common/mode.js').default;
        Mode.init();
        insert = require('src/content_scripts/common/insert.js').default();
        normal = require('src/content_scripts/common/normal.js').default(insert);
    });

    test("normal /", async () => {
        normal.enter();
        await new Promise((r) => {
            document.addEventListener("surfingkeys:front", function(evt) {
                if (evt.detail.length && evt.detail[0] === "openFinder") {
                    r(evt);
                }
            });
            document.body.dispatchEvent(new KeyboardEvent('keydown',{'key':'/'}));
        });
    });

    test("normal enter", async () => {
        normal.captureElement = jest.fn();
        normal.enter();
        document.body.dispatchEvent(new KeyboardEvent('keydown', {'key': 'y'}));
        document.body.dispatchEvent(new KeyboardEvent('keydown', {'key': 'G'}));
        expect(normal.captureElement).toHaveBeenCalledTimes(1);

        document.body.dispatchEvent(new KeyboardEvent('keydown', {'key': 'y'}));
        document.body.dispatchEvent(new KeyboardEvent('keydown', {'key': 'G'}));
        expect(normal.captureElement).toHaveBeenCalledTimes(2);
    });

    test("normal once", async () => {
        normal.captureElement = jest.fn();
        normal.once();
        document.body.dispatchEvent(new KeyboardEvent('keydown', {'key': 'y'}));
        document.body.dispatchEvent(new KeyboardEvent('keydown', {'key': 'G'}));
        expect(normal.captureElement).toHaveBeenCalledTimes(1);

        // the 2nd yG won't trigger action.
        document.body.dispatchEvent(new KeyboardEvent('keydown', {'key': 'y'}));
        document.body.dispatchEvent(new KeyboardEvent('keydown', {'key': 'G'}));
        expect(normal.captureElement).toHaveBeenCalledTimes(1);
    });

    test("normal mouse up", async () => {
        runtime.conf.mouseSelectToQuery = [ "http://localhost" ];
        await new Promise((r) => {
            document.addEventListener("surfingkeys:front", function(evt) {
                if (evt.detail.length && evt.detail[0] === "querySelectedWord") {
                    r(evt);
                }
            });
            document.body.dispatchEvent(new MouseEvent('mouseup', {
                bubbles: true,
                cancelable: true,
                view: window,
                button: 0
            }));
        });
    });
});
