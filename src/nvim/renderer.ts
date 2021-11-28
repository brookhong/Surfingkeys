import Nvim from './Nvim';

import { Settings } from './types';

import initScreen from './screen';
import initKeyboard from './input/keyboard';
import initMouse from './input/mouse';
import hideMouseCursor from './features/hideMouseCursor';

const getDefaultSettings = (): Settings => ({
    bold: 1,
    italic: 1,
    underline: 1,
    undercurl: 1,
    strikethrough: 1,
    fontfamily: 'monospace',
    fontsize: '12',
    lineheight: '1.25',
    letterspacing: '0',
});

type Renderer = {
    nvim: Nvim,
    destroy: () => void;
};

/**
 * Browser renderer
 */
const renderer = (element?: HTMLDivElement): Promise<Renderer> => {
    return new Promise((resolve, reject) => {
        const nvim = new Nvim();
        const settings = getDefaultSettings();
        settings.element = element;
        const screen = initScreen({ nvim, settings });
        const keyboard = initKeyboard({ nvim, screen });
        const mouse = initMouse({ nvim, screen });

        const attach = () => {
            screen.uiAttach();
            keyboard.attach();
            mouse.attach();
        };
        nvim.on('nvim:open', attach);
        nvim.on('nvim:connectExisting', attach);

        const destroy = () => {
            screen.uiDetach();
            keyboard.detach();
            mouse.detach();
        };

        hideMouseCursor();
        resolve({nvim, destroy});
    });
};

export default renderer;
export {
    getDefaultSettings
};
