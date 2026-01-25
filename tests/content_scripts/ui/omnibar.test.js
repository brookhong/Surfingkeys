const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.resolve(__dirname, '../../../src/content_scripts/ui/frontend.html'), 'utf8');

import KeyboardUtils from 'src/content_scripts/common/keyboardUtils';

describe('ui omnibar', () => {

    let Mode, createOmnibar, omnibar, Front;
    beforeAll(async () => {
        global.chrome = {
            runtime: {
                sendMessage: jest.fn(),
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
        window.focus = jest.fn();
        window.postMessage({surfingkeys_frontend_data: { action: "initFrontend", origin: document.location.origin }}, document.location.origin);

        document.documentElement.innerHTML = html.toString();
        createOmnibar = require('src/content_scripts/ui/omnibar').default;
        Mode = require('src/content_scripts/common/mode').default;
        Front = require('src/content_scripts/ui/frontend').default;

        const elmOmnibar = document.querySelector("#sk_omnibar");
        elmOmnibar.innerHTML = `
    <style></style>
    <div id="sk_omnibarSearchArea">
        <span class="prompt">
            <span class="separator">➤</span>
        </span>
        <input placeholder="">
        <span class="resultPage">
        </span>
    </div>
    <div id="sk_omnibarSearchResult">
        <ul>
            <li class="focused">
                <div class="title">🔖 WebAssembly - "Hello World" </div>
                <div class="url">https://www.tutorialspoint.com/webassembly/webassembly_hello_world.htm</div>
            </li>
            <li>
                <div class="title">🔖 From JavaScript to WebAssembly in three steps </div>
                <div class="url">https://engineering.q42.nl/webassembly/</div>
            </li>
            <li>
                <div class="title">🔥 GitHub </div>
                <div class="url">https://github.com/</div>
            </li>
        </ul>
    </div>
        `;
        elmOmnibar.querySelector('#sk_omnibarSearchResult>ul>li.focused').url = "https://www.tutorialspoint.com/webassembly/webassembly_hello_world.htm";
        document.body.appendChild(elmOmnibar);
        omnibar = createOmnibar(Front);
    });

    test('edit focus item in omnibar with editor', async () => {
        Front.showEditor = jest.fn();
        Mode.handleMapKey.call(omnibar, {
            sk_keyName: KeyboardUtils.encodeKeystroke("<Ctrl-i>")
        });
        await new Promise((r) => setTimeout(r, 100));
        expect(Front.showEditor).toHaveBeenCalledTimes(1);
    });

    test("toggle Omnibar's position", async () => {
        const elmOmnibarClass = document.getElementById("sk_omnibar").classList;
        window.postMessage({surfingkeys_frontend_data: { action: "openOmnibar", type: "URLs", extra: "getAllSites" }}, document.location.origin);
        await new Promise((r) => setTimeout(r, 100));
        expect(elmOmnibarClass.value).toContain('sk_omnibar_middle');
        Mode.handleMapKey.call(omnibar, {
            sk_keyName: KeyboardUtils.encodeKeystroke("<Ctrl-j>")
        });
        await new Promise((r) => setTimeout(r, 100));
        expect(elmOmnibarClass.value).toContain('sk_omnibar_bottom');
    });
});
