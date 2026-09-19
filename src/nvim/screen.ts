import { throttle, isFinite, isEqual } from 'lodash';

import { getColor } from './lib/getColor';

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
    char?: string | null;
    hlId?: number;
};

const DEFAULT_FONT_FAMILY = 'monospace';

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

    // 2D canvas rendering. The grid is painted directly into gridCanvas; the
    // cursor gets its own small canvas (see initCursor) so blinking never has to
    // touch the grid.
    let gridCanvas: HTMLCanvasElement;
    let gridCtx: CanvasRenderingContext2D;
    let cursorCanvas: HTMLCanvasElement;
    let cursorCtx: CanvasRenderingContext2D;

    // Glyph bitmaps keyed by "char:hlId", shared between the grid and the cursor
    // (which reuses the same bitmap under its own inverted hlId).
    let glyphCache: Map<string, ImageBitmap> = new Map();

    // Rows touched since the last paint. Painting is deferred to the next
    // `flush` UI event (see redrawCmd.flush) to match nvim's own redraw batching:
    // a batch's grid_line/grid_scroll calls should land on screen together, not
    // one row at a time.
    let dirtyRows: Set<number> = new Set();
    let paintScheduled = false;

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

        cursorCanvas = document.createElement('canvas');
        cursorCanvas.style.position = 'absolute';
        cursorCanvas.style.top = '0';
        // Sized and positioned once charWidth/charHeight are known, in
        // measureCharSize: like the grid's glyph bitmaps, this canvas is 3 cells
        // wide so an italic tail or wide-char overhang renders the same way.
        cursorCtx = cursorCanvas.getContext('2d', { alpha: true }) as CanvasRenderingContext2D;
        cursorEl.appendChild(cursorCanvas);

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

        // Init canvas for text and backgrounds
        const { width, height } = windowPixelSize();
        gridCanvas = document.createElement('canvas');
        gridCanvas.width = width;
        gridCanvas.height = height;
        gridCtx = gridCanvas.getContext('2d', { alpha: true }) as CanvasRenderingContext2D;

        screenEl.appendChild(gridCanvas);
        screenContainer.appendChild(screenEl);

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
            cursorCanvas.width = charWidth * 3;
            cursorCanvas.height = charHeight;
            cursorCanvas.style.left = `${-charWidth}px`;
            cursorEl.style.width = `${charWidth}px`;
            cursorEl.style.height = `${charHeight}px`;

            if (charCanvas) {
                charCanvas.width = charWidth * 3;
                charCanvas.height = charHeight;
            }
        }
        screenEl.removeChild(char);
    };

    const font = (p: CalculatedProps) =>
        [p.hiItalic ? 'italic' : '', p.hiBold ? 'bold' : '', `${scaledFontSize()}px`, fontFamily].join(
            ' ',
        );

    const getCharBitmap = (char: string, props: CalculatedProps): ImageBitmap => {
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

        // transferToImageBitmap() resets charCanvas back to transparent, which is
        // why nothing here clears it first -- a future change that reads from
        // charCanvas without transferring it out would leave stale pixels behind.
        return charCanvas.transferToImageBitmap();
    };

    const getGlyph = (char: string, hlId: number): ImageBitmap => {
        const key = `${char}:${hlId}`;
        let bitmap = glyphCache.get(key);
        if (!bitmap) {
            const props = highlightTable[hlId].calculated as CalculatedProps;
            bitmap = getCharBitmap(char, props);
            glyphCache.set(key, bitmap);
        }
        return bitmap;
    };

    const clearGlyphCache = () => {
        glyphCache.forEach((bitmap) => bitmap.close());
        glyphCache.clear();
    };

    const initChar = (i: number, j: number) => {
        if (!chars[i]) chars[i] = [];
        if (!chars[i][j]) {
            chars[i][j] = {};
        }
    };

    const printChar = (i: number, j: number, char: string, hlId: number) => {
        initChar(i, j);
        chars[i][j].char = char;
        chars[i][j].hlId = hlId;
        dirtyRows.add(i);
    };

    // A cell counts as "printed" (has something to draw) once it has both a char
    // (grid_clear sets this to null to blank a cell) and a finite hlId.
    const isPrinted = (cell: Char | undefined): cell is Char & { char: string; hlId: number } =>
        !!cell && cell.char !== null && cell.char !== undefined && isFinite(cell.hlId);

    const paintRow = (i: number) => {
        if (!chars[i]) return;
        const y = i * charHeight;
        gridCtx.clearRect(0, y, gridCanvas.width, charHeight);

        // Backgrounds first, in their own pass: glyph bitmaps are 3 cells wide so
        // an italic tail or wide-char overhang can spill into the next column: if
        // that column's background were painted after its own glyph, the pass
        // order would be right for its own cell but a LATER column's background
        // would still erase the EARLIER column's overhang. Painting every
        // background before any glyph avoids that regardless of column order.
        for (let j = 0; j <= cols; j += 1) {
            const cell = chars[i][j];
            if (!isPrinted(cell)) continue;
            const bgColor = highlightTable[cell.hlId]?.calculated?.bgColor;
            if (cell.hlId !== 0 && bgColor && bgColor !== highlightTable[0]?.calculated?.bgColor) {
                gridCtx.fillStyle = bgColor;
                const isLastCol = j === cols - 1;
                gridCtx.fillRect(j * charWidth, y, isLastCol ? charWidth * 2 : charWidth, charHeight);
            }
        }

        for (let j = 0; j <= cols; j += 1) {
            const cell = chars[i][j];
            if (!isPrinted(cell)) continue;
            const bitmap = getGlyph(cell.char, cell.hlId);
            gridCtx.drawImage(bitmap, (j - 1) * charWidth, y);
        }
    };

    const paintDirtyRows = () => {
        paintScheduled = false;
        const toPaint = dirtyRows;
        dirtyRows = new Set();
        toPaint.forEach((i) => paintRow(i));
    };

    const schedulePaint = () => {
        if (paintScheduled || dirtyRows.size === 0) return;
        paintScheduled = true;
        requestAnimationFrame(paintDirtyRows);
    };

    const invalidateAll = () => {
        dirtyRows = new Set();
        for (let i = 0; i <= rows; i += 1) dirtyRows.add(i);
    };

    const cursorBlinkOn = () => {
        cursorCanvas.style.visibility = 'visible';
    };

    const cursorBlinkOff = () => {
        cursorCanvas.style.visibility = 'hidden';
    };

    const cursorBlink = ({
        blinkon,
        blinkoff,
        blinkwait,
    }: { blinkon?: number; blinkoff?: number; blinkwait?: number } = {}) => {
        cursorCanvas.style.visibility = 'visible';

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
        cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
    };

    const redrawCursor = () => {
        const m = modeInfoSet && modeInfoSet[mode];
        cursorBlink(m);

        if (!m) return;
        // TODO: check if cursor changed (char, hlId, etc)
        clearCursor();

        const hlId = m.attr_id === 0 ? -1 : m.attr_id;
        const bgColor = highlightTable[hlId]?.calculated?.bgColor;
        cursorCtx.fillStyle = bgColor as string;

        // The cursor canvas is 3 cells wide (see initCursor); its middle third,
        // at local x=charWidth, is the actual cursor cell -- the same offset the
        // grid uses when it blits a 3-wide glyph bitmap at (j-1)*charWidth.
        if (m.cursor_shape === 'block') {
            cursorChar = chars[cursorPosition[0]][cursorPosition[1]].char || ' ';
            cursorCtx.fillRect(charWidth, 0, charWidth, charHeight);
            const bitmap = getGlyph(cursorChar, hlId);
            cursorCtx.drawImage(bitmap, 0, 0);
        } else if (m.cursor_shape === 'vertical') {
            const curWidth = m.cell_percentage
                ? Math.max(scale, Math.round((charWidth / 100) * m.cell_percentage))
                : scale;
            cursorCtx.fillRect(charWidth, 0, curWidth, charHeight);
        } else if (m.cursor_shape === 'horizontal') {
            const curHeight = m.cell_percentage
                ? Math.max(scale, Math.round((charHeight / 100) * m.cell_percentage))
                : scale;
            cursorCtx.fillRect(charWidth, charHeight - curHeight, charWidth, curHeight);
        }
    };

    const repositionCursor = (newCursor: [number, number]): void => {
        if (newCursor) cursorPosition = newCursor;
        const left = cursorPosition[1] * charWidth;
        const top = cursorPosition[0] * charHeight;
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

        clearGlyphCache();
        invalidateAll();
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
            schedulePaint();
        },

        grid_resize: (props) => {
            /* eslint-disable prefer-destructuring */
            cols = props[0][1];
            rows = props[0][2];
            /* eslint-enable prefer-destructuring */

            if (cols * charWidth > gridCanvas.width || rows * charHeight > gridCanvas.height) {
                // Add extra column on the right to fill it with adjacent color to have a nice right border
                const width = cols * charWidth;
                const height = rows * charHeight;

                // Assigning width/height also clears the canvas, which is why the
                // repaint below has to cover every row, not just the new ones.
                gridCanvas.width = width;
                gridCanvas.height = height;
                invalidateAll();
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
            for (let i = 0; i <= rows; i += 1) {
                if (!chars[i]) chars[i] = [];
                for (let j = 0; j <= cols; j += 1) {
                    initChar(i, j);
                    chars[i][j].char = null;
                }
            }
            // Clear the pixels directly rather than deferring to the next flush:
            // the model is already blank, so there is nothing a dirty-row repaint
            // would add, and leaving old pixels up until flush would show a stale
            // frame in the meantime.
            gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
            dirtyRows = new Set();
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
            // Settle any rows already marked dirty before touching pixels
            // directly below: blitting a block that includes an unpainted row
            // would carry whatever was on screen from BEFORE this batch, not
            // what the model (about to be swapped) currently says.
            if (dirtyRows.size > 0) paintDirtyRows();

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
                }
            }

            if (left === 0 && right === cols) {
                // Full-width scroll: one self-copy blit reproduces the swap above
                // on screen without repainting any glyphs.
                const n = Math.abs(scrollCount);
                const blitHeight = (bottom - top - n) * charHeight;
                const sourceY = (scrollCount > 0 ? top + scrollCount : top) * charHeight;
                const destY = (scrollCount > 0 ? top : top - scrollCount) * charHeight;
                gridCtx.drawImage(
                    gridCanvas,
                    0, sourceY, gridCanvas.width, blitHeight,
                    0, destY, gridCanvas.width, blitHeight,
                );
            } else {
                // Partial-width scroll: nvim rarely sends this for a single
                // ext_linegrid grid. Correctness over speed here -- just repaint
                // the moved rows normally instead of blitting one column range.
                for (
                    let i = scrollCount > 0 ? top : bottom - 1;
                    scrollCount > 0 ? i <= bottom - scrollCount - 1 : i >= top - scrollCount;
                    i += scrollCount > 0 ? 1 : -1
                ) {
                    dirtyRows.add(i);
                }
            }

            // Rows uncovered by the scroll no longer correspond to real content;
            // blank them in the model too, not just on screen. The old
            // sprite-based renderer only hid these cells and left their stale
            // .char/.hlId in place, relying on nvim always following up with a
            // grid_line to refill them -- true in practice, but a latent bug
            // waiting for a redraw path that doesn't.
            const exposedStart = scrollCount > 0 ? bottom - scrollCount : top;
            const exposedEnd = scrollCount > 0 ? bottom - 1 : top - scrollCount - 1;
            for (let i = exposedStart; i <= exposedEnd; i += 1) {
                for (let j = left; j <= right - 1; j += 1) {
                    initChar(i, j);
                    chars[i][j].char = null;
                }
                dirtyRows.add(i);
            }
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
            clearGlyphCache();
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
