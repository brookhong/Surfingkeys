import { EventEmitter } from 'events';
import initRenderer, { getDefaultSettings } from 'src/nvim/renderer';

import initScreen from 'src/nvim/screen';
import initKeyboard from 'src/nvim/input/keyboard';
import initMouse from 'src/nvim/input/mouse';
import hideMouseCursor from 'src/nvim/features/hideMouseCursor';
import type { Args } from 'src/nvim/types';

const mockTransport = new EventEmitter();

jest.mock('src/nvim/transport/websocket', () => () => mockTransport);

const mockNvim = new EventEmitter();
jest.mock('src/nvim/Nvim', () => () => mockNvim);
jest.mock('src/nvim/screen', () => jest.fn(() => 'fakeScreen'));
jest.mock('src/nvim/input/keyboard', () => jest.fn());
jest.mock('src/nvim/input/mouse', () => jest.fn());
jest.mock('src/nvim/features/hideMouseCursor', () => jest.fn());

describe('renderer', () => {
    const settings = getDefaultSettings();

    beforeEach(() => {
        mockTransport.removeAllListeners();
        initRenderer();
    });

    test('init screen', () => {
        expect(initScreen).toHaveBeenCalledWith({
            nvim: mockNvim,
            settings,
        });
    });

    test('init keyboard', () => {
        expect(initKeyboard).toHaveBeenCalledWith({
            nvim: mockNvim,
            screen: 'fakeScreen',
        });
    });

    test('init mouse', () => {
        expect(initMouse).toHaveBeenCalledWith({
            nvim: mockNvim,
            screen: 'fakeScreen',
        });
    });

    test('init hideMouseCursor', () => {
        expect(hideMouseCursor).toHaveBeenCalledWith();
    });
});
