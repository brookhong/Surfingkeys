import puppeteer, { Browser, Page } from 'puppeteer';
import { DIST_DIR } from '../utils';

describe('Screen', () => {
    jest.setTimeout(30000);

    let browser: Browser;
    let page: Page;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: false,
            slowMo: 10,
            args: [
                `--disable-extensions-except=${DIST_DIR}/test`,
                `--load-extension=${DIST_DIR}/test`,
                `--user-data-dir=${DIST_DIR}/testdata`,
            ],
        });
    });

    afterAll(async () => {
        await browser.close();
    });

    beforeEach(async () => {
        page = await browser.newPage();

        await page.setViewport({
            width: 300,
            height: 200,
            deviceScaleFactor: 2,
        });

        await page.goto(`chrome-extension://aajlcoiaogpknhgninhopncaldipjdnp/pages/neovim.html`);
        await page.waitForSelector('input');
    });

    afterEach(async () => {
        await page.close();
    });

    it('match snapshot', async () => {
        await page.keyboard.type('iHello');
        await page.keyboard.press('Escape');

        const image = await page.screenshot({path: `${DIST_DIR}/testdata/screen-test-ts-screen-match-snapshot-1-snap.png`});
        expect(image).toMatchImageSnapshot();
    });

    it('redraw screen on default_colors_set', async () => {
        await page.keyboard.type(':u0');
        await page.keyboard.press('Enter');
        await page.keyboard.type(':colorscheme desert');
        await page.keyboard.press('Enter');

        const image = await page.screenshot({path: `${DIST_DIR}/testdata/screen-test-ts-screen-redraw-screen-on-default-colors-set-1-snap.png`});
        expect(image).toMatchImageSnapshot();
    });

    describe('undercurl', () => {
        test('show undercurl behind the text', async () => {
            await page.keyboard.type(':u0');
            await page.keyboard.press('Enter');
            await page.keyboard.type(':set filetype=javascript');
            await page.keyboard.press('Enter');
            await page.keyboard.press('Enter');
            await page.keyboard.type(':syntax on');
            await page.keyboard.press('Enter');
            await page.keyboard.type(':hi Comment gui=undercurl guifg=white guisp=red');
            await page.keyboard.press('Enter');
            await page.keyboard.type('i// Hey!');

            const image = await page.screenshot({path: `${DIST_DIR}/testdata/screen-test-ts-screen-undercurl-show-undercurl-behind-the-text-1-snap.png`});
            expect(image).toMatchImageSnapshot();
        });
    });
});
