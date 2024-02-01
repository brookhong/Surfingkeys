import { throttle, isFinite, isEqual } from 'lodash';

import { getColor, getColorNum } from './lib/getColor';

import * as PIXI from './lib/pixi';

import type { Settings } from './types';
import type Nvim from './Nvim';
import type {
    UiEventsHandlers,
        UiEventsArgs,
        ModeInfo,
        HighlightAttrs,
} from './types';

export type Screen = {
    uiAttach: () => void;
    uiDetach: () => void;
    screenCoords: (width: number, height: number) => [number, number];
    getCursorElement: () => HTMLDivElement;
};

type CalculatedProps = {
    bgColor: string;
    fgColor: string;
    spColor?: string;
    hiItalic: boolean;
    hiBold: boolean;
    hiUnderline: boolean;
    hiUndercurl: boolean;
    hiStrikethrough: boolean;
};

type HighlightProps = {
    calculated?: CalculatedProps;
    value?: HighlightAttrs;
};

type HighlightTable = Record<number, HighlightProps>;

type Char = {
    sprite: PIXI.Sprite;
    bg: PIXI.Sprite;
    char?: string | null;
    hlId?: number;
};

const DEFAULT_FONT_FAMILY = 'monospace';

PIXI.extensions.add(PIXI.BatchRenderer, PIXI.TickerPlugin);

const screen = ({
    settings,
    nvim,
}: {
    settings: Settings;
    nvim: Nvim;
}): Screen => {
    let screenContainer: HTMLDivElement;
    let cursorEl: HTMLDivElement;
    let screenEl: HTMLDivElement;

    let cursorPosition: [number, number] = [0, 0];
    let cursorChar: string;

    let startCursorBlinkOnTimeout: NodeJS.Timeout | null;
    let startCursorBlinkOffTimeout: NodeJS.Timeout | null;
    let blinkOnCursorBlinkInterval: NodeJS.Timeout | null;
    let blinkOffCursorBlinkInterval: NodeJS.Timeout | null;

    let scale: number;
    let charWidth: number;
    let charHeight: number;

    let fontFamily = DEFAULT_FONT_FAMILY;
    let fontSize = 12;
    let lineHeight = 1.25;
    let letterSpacing = 0;

    const defaultFgColor = 'rgb(255,255,255)';
    const defaultBgColor = 'rgb(0,0,0)';
    const defaultSpColor = 'rgb(255,255,255)';

    let cols: number;
    let rows: number;

    let modeInfoSet: Record<string, ModeInfo>;
    let mode: string;

    let showBold = true;
    let showItalic = true;
    let showUnderline = true;
    let showUndercurl = true;
    let showStrikethrough = true;

    const charCanvas = new OffscreenCanvas(1, 1);
    const charCtx = charCanvas.getContext('2d', { alpha: true }) as OffscreenCanvasRenderingContext2D;

    const chars: Char[][] = [];

    const highlightTable: HighlightTable = {
        '0': {
            calculated: {
                bgColor: defaultBgColor,
                fgColor: defaultFgColor,
                spColor: defaultSpColor,
                hiItalic: false,
                hiBold: false,
                hiUnderline: false,
                hiUndercurl: false,
                hiStrikethrough: false,
            },
        },
        // Inverted default color for cursor
        '-1': {
            calculated: {
                bgColor: defaultFgColor,
                fgColor: defaultBgColor,
                spColor: defaultSpColor,
                hiItalic: false,
                hiBold: false,
                hiUnderline: false,
                hiUndercurl: false,
                hiStrikethrough: false,
            },
        },
    };

    // WebGL
    let stage: PIXI.Container;
    let renderer: PIXI.Renderer;
    let charsContainer: PIXI.Container;
    let bgContainer: PIXI.Container;
    let cursorContainer: PIXI.Container;
    let cursorSprite: PIXI.Sprite;
    let cursorBg: PIXI.Graphics;

    let needRerender = false;
    const TARGET_FPS = 60;

    const getCursorElement = (): HTMLDivElement => cursorEl;

    const windowPixelSize = () => ({
        width: screenContainer.clientWidth * window.devicePixelRatio,
        height: screenContainer.clientHeight * window.devicePixelRatio,
    });

    const initCursor = () => {
        cursorEl = document.createElement('div');
        cursorEl.style.position = 'absolute';
        cursorEl.style.zIndex = '100';
        cursorEl.style.top = '0';
        cursorEl.style.left = '0';
        screenEl.appendChild(cursorEl);
    };

    const createScreenContainer = () => {
        screenContainer = document.createElement('div');
        document.body.appendChild(screenContainer);

        screenContainer.id = 'nvimScreenContainer';
        screenContainer.style.position = 'absolute';
        screenContainer.style.left = '0%';
        screenContainer.style.top = '0%';
        screenContainer.style.width = '100%';
        screenContainer.style.height = '100%';
        screenContainer.style.transformOrigin = '0 0';
    };

    const initScreen = () => {
        screenEl = document.createElement('div');

        if (settings.element) {
            screenContainer = settings.element;
            screenEl.style.boxShadow = "rgba(0, 0, 0, 0.8) 0px 2px 10px";
        } else {
            createScreenContainer();
        }

        screenEl.style.overflow = 'hidden';

        // Init WebGL for text
        const pixi = new PIXI.Application({
            backgroundAlpha: 0,
            autoStart: false,
            ...windowPixelSize(),
        });

        screenEl.appendChild((pixi.view as unknown) as Node);

        screenContainer.appendChild(screenEl);

        stage = pixi.stage;
        renderer = pixi.renderer as PIXI.Renderer;
        pixi.ticker.stop();

        charsContainer = new PIXI.Container();
        bgContainer = new PIXI.Container();
        cursorContainer = new PIXI.Container();
        cursorSprite = new PIXI.Sprite();
        cursorBg = new PIXI.Graphics();

        stage.addChild(bgContainer);
        stage.addChild(charsContainer);
        stage.addChild(cursorContainer);
        cursorContainer.addChild(cursorBg);
        cursorContainer.addChild(cursorSprite);

        // Init screen for background
        screenEl.style.width = `${windowPixelSize().width}px`;
        screenEl.style.height = `${windowPixelSize().height}px`;
    };

    const scaledLetterSpacing = () => {
        if (letterSpacing === 0) {
            return letterSpacing;
        }
        return letterSpacing > 0
            ? Math.floor(letterSpacing / window.devicePixelRatio)
            : Math.ceil(letterSpacing / window.devicePixelRatio);
    };

    const scaledFontSize = () => fontSize * scale;

    const measureCharSize = () => {
        const char = document.createElement('span');
        char.innerHTML = '0';
        char.style.fontFamily = fontFamily;
        char.style.fontSize = `${scaledFontSize()}px`;
        char.style.lineHeight = `${Math.round(scaledFontSize() * lineHeight)}px`;
        char.style.position = 'absolute';
        char.style.left = '-1000px';
        char.style.top = '0';
        screenEl.appendChild(char);

        const oldCharWidth = charWidth;
        const oldCharHeight = charHeight;
        charWidth = Math.max(char.offsetWidth + scaledLetterSpacing(), 1);
        charHeight = char.offsetHeight;
        if (oldCharWidth !== charWidth || oldCharHeight !== charHeight) {
            cursorSprite.x = -charWidth;
            cursorEl.style.width = `${charWidth}px`;
            cursorEl.style.height = `${charHeight}px`;

            if (charCanvas) {
                charCanvas.width = charWidth * 3;
                charCanvas.height = charHeight;
            }

            PIXI.clearTextureCache();
        }
        screenEl.removeChild(char);
    };

    const font = (p: CalculatedProps) =>
        [p.hiItalic ? 'italic' : '', p.hiBold ? 'bold' : '', `${scaledFontSize()}px`, fontFamily].join(
            ' ',
        );

    const getCharBitmap = (char: string, props: CalculatedProps) => {
        if (props.hiUndercurl) {
            charCtx.strokeStyle = props.spColor as string;
            charCtx.lineWidth = scaledFontSize() * 0.08;
            const x = charWidth;
            const y = charHeight - (scaledFontSize() * 0.08) / 2;
            const h = charHeight * 0.2; // Height of the wave
            charCtx.beginPath();
            charCtx.moveTo(x, y);
            charCtx.bezierCurveTo(x + x / 4, y, x + x / 4, y - h / 2, x + x / 2, y - h / 2);
            charCtx.bezierCurveTo(x + (x / 4) * 3, y - h / 2, x + (x / 4) * 3, y, x + x, y);
            charCtx.stroke();
        }

        charCtx.fillStyle = props.fgColor;
        charCtx.font = font(props);
        charCtx.textAlign = 'left';
        charCtx.textBaseline = 'middle';
        if (char) {
            charCtx.fillText(
                char,
                Math.round(scaledLetterSpacing() / 2) + charWidth,
                Math.round(charHeight / 2),
            );
        }

        if (props.hiUnderline) {
            charCtx.strokeStyle = props.fgColor;
            charCtx.lineWidth = scale;
            charCtx.beginPath();
            charCtx.moveTo(charWidth, charHeight - scale);
            charCtx.lineTo(charWidth * 2, charHeight - scale);
            charCtx.stroke();
        }

        if (props.hiStrikethrough) {
            charCtx.strokeStyle = props.fgColor;
            charCtx.lineWidth = scale;
            charCtx.beginPath();
            charCtx.moveTo(charWidth, charHeight * 0.5);
            charCtx.lineTo(charWidth * 2, charHeight * 0.5);
            charCtx.stroke();
        }

        return charCanvas.transferToImageBitmap();
    };

    const getCharTexture = (char: string, hlId: number) => {
        const key = `${char}:${hlId}`;
        if (!PIXI.TextureCache[key]) {
            const props = highlightTable[hlId].calculated;
            // @ts-expect-error getCharBitmap returns ImageBitmap that can be used as texture
            PIXI.Texture.addToCache(PIXI.Texture.from(getCharBitmap(char, props)), key);
        }
        return PIXI.Texture.from(key);
    };

    const getBgTexture = (bgColor: string, j: number) => {
        const isLastCol = j === cols - 1;
        const key = `bg:${bgColor}:${isLastCol}`;
        if (!PIXI.TextureCache[key]) {
            charCtx.fillStyle = bgColor;
            if (isLastCol) {
                charCtx.fillRect(0, 0, charWidth * 2, charHeight);
            } else {
                charCtx.fillRect(0, 0, charWidth, charHeight);
            }

            PIXI.Texture.addToCache(PIXI.Texture.from(charCanvas.transferToImageBitmap()), key);
        }
        return PIXI.Texture.from(key);
    };

    const initChar = (i: number, j: number) => {
        if (!chars[i]) chars[i] = [];
        if (!chars[i][j]) {
            chars[i][j] = {
                sprite: new PIXI.Sprite(),
                bg: new PIXI.Sprite(),
            };
            charsContainer.addChild(chars[i][j].sprite);
            bgContainer.addChild(chars[i][j].bg);
        }
    };

    const printChar = (i: number, j: number, char: string, hlId: number) => {
        initChar(i, j);

        // Print char
        chars[i][j].char = char;
        chars[i][j].hlId = hlId;
        chars[i][j].sprite.texture = getCharTexture(char, hlId);
        chars[i][j].sprite.position.set((j - 1) * charWidth, i * charHeight);
        chars[i][j].sprite.visible = true;

        // Draw bg
        chars[i][j].bg.position.set(j * charWidth, i * charHeight);
        const bgColor = highlightTable[hlId]?.calculated?.bgColor;
        if (hlId !== 0 && bgColor && bgColor !== highlightTable[0]?.calculated?.bgColor) {
            chars[i][j].bg.texture = getBgTexture(bgColor, j);
            chars[i][j].bg.visible = true;
        } else {
            chars[i][j].bg.visible = false;
        }
    };

    const cursorBlinkOn = () => {
        cursorContainer.visible = true;
        renderer.render(stage);
    };

    const cursorBlinkOff = () => {
        cursorContainer.visible = false;
        renderer.render(stage);
    };

    const cursorBlink = ({
        blinkon,
        blinkoff,
        blinkwait,
    }: { blinkon?: number; blinkoff?: number; blinkwait?: number } = {}) => {
        cursorContainer.visible = true;

        if (startCursorBlinkOnTimeout) clearTimeout(startCursorBlinkOnTimeout);
        if (startCursorBlinkOffTimeout) clearTimeout(startCursorBlinkOffTimeout);
        if (blinkOnCursorBlinkInterval) clearInterval(blinkOnCursorBlinkInterval);
        if (blinkOffCursorBlinkInterval) clearInterval(blinkOffCursorBlinkInterval);

        startCursorBlinkOnTimeout = null;
        startCursorBlinkOffTimeout = null;
        blinkOnCursorBlinkInterval = null;
        blinkOffCursorBlinkInterval = null;

        if (blinkoff && blinkon) {
            startCursorBlinkOffTimeout = setTimeout(() => {
                cursorBlinkOff();
                blinkOffCursorBlinkInterval = setInterval(cursorBlinkOff, blinkoff + blinkon);

                startCursorBlinkOnTimeout = setTimeout(() => {
                    cursorBlinkOn();
                    blinkOnCursorBlinkInterval = setInterval(cursorBlinkOn, blinkoff + blinkon);
                }, blinkoff);
            }, blinkwait);
        }
    };

    const clearCursor = () => {
        cursorBg.clear();
        cursorSprite.visible = false;
    };

    const redrawCursor = () => {
        const m = modeInfoSet && modeInfoSet[mode];
        cursorBlink(m);

        if (!m) return;
        // TODO: check if cursor changed (char, hlId, etc)
        clearCursor();

        const hlId = m.attr_id === 0 ? -1 : m.attr_id;
        cursorBg.beginFill(getColorNum(highlightTable[hlId]?.calculated?.bgColor));

        if (m.cursor_shape === 'block') {
            cursorChar = chars[cursorPosition[0]][cursorPosition[1]].char || ' ';
            cursorSprite.texture = getCharTexture(cursorChar, hlId);
            cursorBg.drawRect(0, 0, charWidth, charHeight);
            cursorSprite.visible = true;
        } else if (m.cursor_shape === 'vertical') {
            const curWidth = m.cell_percentage
                ? Math.max(scale, Math.round((charWidth / 100) * m.cell_percentage))
                : scale;
            cursorBg.drawRect(0, 0, curWidth, charHeight);
        } else if (m.cursor_shape === 'horizontal') {
            const curHeight = m.cell_percentage
                ? Math.max(scale, Math.round((charHeight / 100) * m.cell_percentage))
                : scale;
            cursorBg.drawRect(0, charHeight - curHeight, charWidth, curHeight);
        }
        needRerender = true;
    };

    const repositionCursor = (newCursor: [number, number]): void => {
        if (newCursor) cursorPosition = newCursor;
        const left = cursorPosition[1] * charWidth;
        const top = cursorPosition[0] * charHeight;
        cursorContainer.position.set(left, top);
        cursorEl.style.transform = `translate(${left}px, ${top}px)`;
        redrawCursor();
    };

    const optionSet = {
        guifont: (newFont: string) => {
            const [newFontFamily, newFontSize] = newFont.trim().split(':h');
            if (newFontFamily && newFontFamily !== '') {
                applySetting(['fontfamily', newFontFamily.replace(/_/g, '\\ ')]);
                if (newFontSize && newFontFamily !== '') {
                    applySetting(['fontsize', newFontSize]);
                }
            }
        },
    };

    const reprintAllChars = () => {
        if (highlightTable[0]?.calculated?.bgColor) {
            screenEl.style.background = highlightTable[0].calculated.bgColor;
        }

        PIXI.clearTextureCache();
        for (let i = 0; i <= rows; i += 1) {
            for (let j = 0; j <= cols; j += 1) {
                initChar(i, j);
                const { char, hlId } = chars[i][j];
                if (char && isFinite(hlId)) {
                    printChar(i, j, char, hlId as number);
                }
            }
        }
        needRerender = true;
    };

    const recalculateHighlightTable = () => {
        ((Object.keys(highlightTable) as unknown) as number[]).forEach((id) => {
            if (id > 0) {
                const {
                    foreground,
                    background,
                    special,
                    reverse,
                    standout,
                    italic,
                    bold,
                    underline,
                    undercurl,
                    strikethrough,
                } = highlightTable[id].value || {};
                const r = reverse || standout;
                const fg = getColor(foreground, highlightTable[0]?.calculated?.fgColor) as string;
                const bg = getColor(background, highlightTable[0]?.calculated?.bgColor) as string;
                const sp = getColor(special, highlightTable[0]?.calculated?.spColor) as string;

                highlightTable[(id as unknown) as number].calculated = {
                    fgColor: r ? bg : fg,
                    bgColor: r ? fg : bg,
                    spColor: sp,
                    hiItalic: showItalic && !!italic,
                    hiBold: showBold && !!bold,
                    hiUnderline: showUnderline && !!underline,
                    hiUndercurl: showUndercurl && !!undercurl,
                    hiStrikethrough: showStrikethrough && !!strikethrough,
                };
            }
        });
        reprintAllChars();
    };

    const rerender = throttle(() => {
        renderer.render(stage);
    }, 1000 / TARGET_FPS);

    const rerenderIfNeeded = () => {
        if (needRerender) {
            needRerender = false;
            rerender();
        }
    };

    // https://github.com/neovim/neovim/blob/master/runtime/doc/ui.txt
    const redrawCmd: Partial<UiEventsHandlers> = {
        set_title: () => {
            /* empty */
        },
        set_icon: () => {
            /* empty */
        },

        win_viewport: () => {
            /* empty */
        },

        mode_info_set: (props) => {
            modeInfoSet = props[0][1].reduce((r, modeInfo) => ({ ...r, [modeInfo.name]: modeInfo }), {});
            redrawCursor();
        },

        option_set: (options) => {
            options.forEach(([option, value]) => {
                // @ts-expect-error TODO
                if (optionSet[option]) {
                    // @ts-expect-error TODO
                    optionSet[option](value);
                } else {
                    // console.warn('Unknown option', option, value); // eslint-disable-line no-console
                }
            });
        },

        mode_change: (modes) => {
            [mode] = modes[modes.length - 1];
            redrawCursor();
        },

        mouse_on: () => {
            /* empty */
        },
        mouse_off: () => {
            /* empty */
        },

        busy_start: () => {
            /* empty */
        },
        busy_stop: () => {
            /* empty */
        },

        suspend: () => {
            /* empty */
        },

        update_menu: () => {
            /* empty */
        },

        bell: () => {
            /* empty */
        },
        visual_bell: () => {
            /* empty */
        },

        hl_group_set: () => {
            /* empty */
        },

        flush: () => {
            rerenderIfNeeded();
        },

        grid_resize: (props) => {
            /* eslint-disable prefer-destructuring */
            cols = props[0][1];
            rows = props[0][2];
            /* eslint-enable prefer-destructuring */

            if (cols * charWidth > renderer.width || rows * charHeight > renderer.height) {
                // Add extra column on the right to fill it with adjacent color to have a nice right border
                const width = cols * charWidth;
                const height = rows * charHeight;

                renderer.resize(width, height);
                needRerender = true;
            }
            screenEl.style.width = `${windowPixelSize().width}px`;
            screenEl.style.height = `${windowPixelSize().height}px`;
        },

        default_colors_set: (props) => {
            const [foreground, background, special] = props[props.length - 1];

            const calculated = {
                bgColor: getColor(background, defaultBgColor) as string,
                fgColor: getColor(foreground, defaultFgColor) as string,
                spColor: getColor(special, defaultSpColor),
                hiItalic: false,
                hiBold: false,
                hiUnderline: false,
                hiUndercurl: false,
                hiStrikethrough: false,
            };
            if (!highlightTable[0] || !isEqual(highlightTable[0].calculated, calculated)) {
                highlightTable[0] = { calculated };
                highlightTable[-1] = {
                    calculated: {
                        ...calculated,
                        bgColor: getColor(foreground, defaultFgColor) as string,
                        fgColor: getColor(background, defaultBgColor) as string,
                    },
                };
                recalculateHighlightTable();
            }
        },

        hl_attr_define: (props) => {
            props.forEach(([id, value]) => {
                highlightTable[id] = {
                    value,
                };
            });
            recalculateHighlightTable();
        },

        grid_line: (props) => {
            for (let gridKey = 0, gridLength = props.length; gridKey < gridLength; gridKey += 1) {
                const row = props[gridKey][1];
                const col = props[gridKey][2];
                const cells = props[gridKey][3];

                let lineLength = 0;
                let currentHlId = 0;

                for (let cellKey = 0, cellsLength = cells.length; cellKey < cellsLength; cellKey += 1) {
                    const [char, hlId, length = 1] = cells[cellKey];
                    if (hlId !== undefined && isFinite(hlId)) {
                        currentHlId = hlId;
                    }
                    for (let j = 0; j < length; j += 1) {
                        printChar(row, col + lineLength + j, char, currentHlId);
                    }
                    lineLength += length;
                }
            }
            needRerender = true;
            if (
                chars[cursorPosition[0]] &&
                chars[cursorPosition[0]][cursorPosition[1]] &&
                cursorChar !== chars[cursorPosition[0]][cursorPosition[1]].char
            ) {
                redrawCursor();
            }
        },

        grid_clear: () => {
            cursorPosition = [0, 0];
            charsContainer.children.forEach((c) => {
                c.visible = false; // eslint-disable-line no-param-reassign
            });
            bgContainer.children.forEach((c) => {
                c.visible = false; // eslint-disable-line no-param-reassign
            });
            for (let i = 0; i <= rows; i += 1) {
                if (!chars[i]) chars[i] = [];
                for (let j = 0; j <= cols; j += 1) {
                    initChar(i, j);
                    chars[i][j].char = null;
                }
            }
            needRerender = true;
        },

        grid_destroy: () => {
            /* empty */
        },

        grid_cursor_goto: ([[_, ...newCursor]]) => {
            repositionCursor(newCursor);

            // Temporary workaround to fix cursor position in terminal mode. Nvim API does not send the very last cursor
            // position in terminal on redraw, but when you send any command to nvim, it redraws it correctly. Need to
            // investigate it and find a better permanent fix. Maybe this is a bug in nvim and then
            // TODO: file a ticket to nvim.
            nvim.getMode();
        },

        grid_scroll: ([[_grid, top, bottom, left, right, scrollCount]]) => {
            for (
                let i = scrollCount > 0 ? top : bottom - 1;
                scrollCount > 0 ? i <= bottom - scrollCount - 1 : i >= top - scrollCount;
                i += scrollCount > 0 ? 1 : -1
            ) {
                for (let j = left; j <= right - 1; j += 1) {
                    const sourceI = i + scrollCount;

                    initChar(i, j);
                    initChar(sourceI, j);

                    // Swap char to scroll to destination
                    [chars[i][j], chars[sourceI][j]] = [chars[sourceI][j], chars[i][j]];

                    // Update scrolled char sprite position
                    if (chars[i][j].sprite) {
                        chars[i][j].sprite.y = i * charHeight;
                        chars[i][j].bg.y = i * charHeight;
                    }

                    // Clear and reposition old char
                    if (chars[sourceI][j].sprite) {
                        chars[sourceI][j].sprite.visible = false;
                        chars[sourceI][j].bg.visible = false;
                        chars[sourceI][j].sprite.y = sourceI * charHeight;
                        chars[sourceI][j].bg.y = sourceI * charHeight;
                    }
                }
            }
            needRerender = true;
        },
    };

    const handleSet = {
        fontfamily: (newFontFamily: string) => {
            fontFamily = `${newFontFamily}, ${DEFAULT_FONT_FAMILY}`;
        },

        fontsize: (newFontSize: string) => {
            fontSize = parseInt(newFontSize, 10);
        },

        letterspacing: (newLetterSpacing: string) => {
            letterSpacing = parseInt(newLetterSpacing, 10);
        },

        lineheight: (newLineHeight: string) => {
            lineHeight = parseFloat(newLineHeight);
        },

        bold: (value: boolean) => {
            showBold = value;
        },

        italic: (value: boolean) => {
            showItalic = value;
        },

        underline: (value: boolean) => {
            showUnderline = value;
        },

        undercurl: (value: boolean) => {
            showUndercurl = value;
        },

        strikethrough: (value: boolean) => {
            showStrikethrough = value;
        },
    };

    const redraw = (args: UiEventsArgs) => {
        args.forEach(([cmd, ...props]) => {
            const command = redrawCmd[cmd];
            if (command) {
                // @ts-expect-error TODO: find the way to type it without errors
                command(props);
            } else {
                console.warn('Unknown redraw command', cmd, props); // eslint-disable-line no-console
            }
        });
    };

    const setScale = () => {
        scale = window.devicePixelRatio;
        screenContainer.style.transform = `scale(${1 / scale})`;
        screenContainer.style.transformOrigin = '0 0';

        // Detect when you drag between retina/non-retina displays
        window.matchMedia('screen and (min-resolution: 2dppx)').addListener(async () => {
            setScale();
            measureCharSize();
            await nvim.uiTryResize(cols, rows);
        });
    };

    /**
     * Return grid [col, row] coordinates by pixel coordinates.
     */
    const screenCoords = (width: number, height: number): [number, number] => {
        return [Math.floor((width * scale) / charWidth), Math.floor((height * scale) / charHeight)];
    };

    const resize = (forceRedraw = false) => {
        const [newCols, newRows] = screenCoords(screenContainer.clientWidth, screenContainer.clientHeight);
        if (newCols !== cols || newRows !== rows || forceRedraw) {
            if (newCols === 0 || newRows === 0) {
                // Retry 100ms later
                setTimeout(() => {
                    resize(forceRedraw);
                }, 100);
            } else {
                cols = newCols;
                rows = newRows;
                nvim.uiTryResize(cols, rows);
            }
        }
    };

    const throttledResize = throttle(() => resize(), 1000 / TARGET_FPS);

    const uiAttach = () => {
        let [c, r] = screenCoords(screenContainer.clientWidth, screenContainer.clientHeight);
        cols = c || cols;
        rows = r || rows;
        nvim.uiAttach(cols, rows, { ext_linegrid: true });
        window.addEventListener(
            'resize',
            throttledResize
        );
        nvim.on('redraw', redraw);
    };

    const uiDetach = () => {
        nvim.off('redraw', redraw);
        nvim.uiDetach();
        window.removeEventListener(
            'resize',
            throttledResize
        );
    };

    const updateSettings = (newSettings: Settings, isInitial = false) => {
        let requireRedraw = isInitial;
        let requireRecalculateHighlight = false;
        const requireRedrawProps = [
            'fontfamily',
            'fontsize',
            'letterspacing',
            'lineheight',
            'bold',
            'italic',
            'underline',
            'undercurl',
            'strikethrough',
        ];

        const requireRecalculateHighlightProps = [
            'bold',
            'italic',
            'underline',
            'undercurl',
            'strikethrough',
        ];

        Object.keys(newSettings).forEach((key) => {
            // @ts-expect-error TODO
            if (handleSet[key]) {
                requireRedraw = requireRedraw || requireRedrawProps.includes(key);
                requireRecalculateHighlight =
                    requireRecalculateHighlight || requireRecalculateHighlightProps.includes(key);
                // @ts-expect-error TODO
                handleSet[key](newSettings[key]);
            }
        });

        if (requireRecalculateHighlight && !isInitial) {
            recalculateHighlightTable();
        }

        if (requireRedraw) {
            measureCharSize();
            PIXI.clearTextureCache();
            if (!isInitial) {
                resize(true);
            }
        }
    };

    initScreen();
    initCursor();
    setScale();

    let newSettings: Partial<Settings> = {};
    const applySetting = <K extends keyof Settings>([option, props]: [K, Settings[K]]) => {
        if (props !== null) {
            newSettings[option] = props;
            settings = {
                ...settings,
                ...newSettings,
            };
            updateSettings(settings);
        }
    };
    updateSettings(settings, true);

    return {
        uiAttach,
        uiDetach,
        screenCoords,
        getCursorElement,
    };
};

export default screen;
