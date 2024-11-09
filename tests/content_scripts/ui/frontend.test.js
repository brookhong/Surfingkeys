const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.resolve(__dirname, '../../../src/content_scripts/ui/frontend.html'), 'utf8');

import { waitForEvent } from '../../utils';

describe('ui front', () => {

    let Front;

    beforeAll(async () => {
        global.chrome = {
            runtime: {
                onMessage: {
                    addListener: jest.fn()
                },
                getURL: jest.fn()
            },
            storage: {
                local: {
                    get: jest.fn()
                }
            }
        }
        global.DOMRect = jest.fn();
        document.documentElement.innerHTML = html.toString();
        Front = require('src/content_scripts/ui/frontend');

        window.focus = jest.fn();
        document.dispatchEvent = jest.fn();
        await waitForEvent(window, "message", (_msg) => {
            return _msg.surfingkeys_uihost_data && _msg.surfingkeys_uihost_data.action === "initFrontendAck";
        }, () => {
            window.postMessage({surfingkeys_frontend_data: { action: "initFrontend", ack: true, origin: document.location.origin }}, document.location.origin);
        });
    });

    test('show omnibar', async () => {
        const elmOmnibarStyle = document.getElementById("sk_omnibar").style;
        expect(elmOmnibarStyle).toHaveProperty('display', 'none');
        await waitForEvent(window, "message", (_msg) => {
            return _msg.surfingkeys_uihost_data && _msg.surfingkeys_uihost_data.action === "setFrontFrame";
        }, () => {
            window.postMessage({surfingkeys_frontend_data: { action: "openOmnibar", type: "SearchEngine", extra: "b" }}, document.location.origin);
        });
        expect(elmOmnibarStyle).not.toHaveProperty('display', 'none');
    });
});
