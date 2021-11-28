type BooleanSetting = 0 | 1;

/* eslint-disable camelcase */

import type { EventEmitter } from 'events';
import type TypedEventEmitter from 'strict-event-emitter-types';

// Only use relative imports here because https://github.com/microsoft/TypeScript/issues/32999#issuecomment-523558695
// TODO: Bundle .d.ts or something
import type {
  UiEvents as UiEventsOriginal,
  NvimCommands as NvimCommandsOriginal,
} from './__generated__/types';
import { nvimCommandNames } from './__generated__/constants';

export type RequestMessage = [0, number, string, any[]];
export type ResponseMessage = [1, number, any, any];
export type NotificationMessage = [2, string, any[]];

export type MessageType = RequestMessage | ResponseMessage | NotificationMessage;
export type ReadCallback = (message: MessageType) => void;
export type OnCloseCallback = () => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Args = any[];

export type Listener = (...args: Args) => void;

/**
 * Remote transport between server or main and renderer.
 * Use emitter events (`on`, `once` etc) for receiving message, and `send` to send message to other side.
 */
export type Transport = EventEmitter & {
  /**
   * Send message to remote
   */
  send: (channel: string, ...args: Args) => void;
};

// Manual refine of the auto-generated UiEvents
// More info: https://neovim.io/doc/user/ui.html

export type ModeInfo = {
  cursor_shape: 'block' | 'horizontal' | 'vertical';
  cell_percentage: number;
  blinkwait: number;
  blinkon: number;
  blinkoff: number;
  attr_id: number;
  attr_id_lm: number;
  short_name: string; // TODO: union
  name: string; // TODO: union
  mouse_shape: number;
};

// TODO: refine this type as a union of `[option, value]` with the correct value type for each option.
export type OptionSet = [
  option:
    | 'arabicshape'
    | 'ambiwidth'
    | 'emoji'
    | 'guifont'
    | 'guifontwide'
    | 'linespace'
    | 'mousefocus'
    | 'pumblend'
    | 'showtabline'
    | 'termguicolors'
    | 'rgb'
    | 'ext_cmdline'
    | 'ext_popupmenu'
    | 'ext_tabline'
    | 'ext_wildmenu'
    | 'ext_messages'
    | 'ext_linegrid'
    | 'ext_multigrid'
    | 'ext_hlstate'
    | 'ext_termcolors',
  value: boolean | string,
];

export type HighlightAttrs = {
  foreground?: number;
  background?: number;
  special?: number;
  reverse?: boolean;
  standout?: boolean;
  italic?: boolean;
  bold?: boolean;
  underline?: boolean;
  undercurl?: boolean;
  strikethrough?: boolean;
  blend?: number;
};

export type Cell = [text: string, hl_id?: number, repeat?: number];

type UiEventsPatch = {
  mode_info_set: [enabled: boolean, cursor_styles: ModeInfo[]];
  option_set: OptionSet;
  hl_attr_define: [id: number, rgb_attrs: HighlightAttrs, cterm_attrs: HighlightAttrs, info: []];
  grid_line: [grid: number, row: number, col_start: number, cells: Cell[]];
};

export type UiEvents = Omit<UiEventsOriginal, keyof UiEventsPatch> & UiEventsPatch;

export type UiEventsHandlers = {
  [Key in keyof UiEvents]: (params: Array<UiEvents[Key]>) => void;
};

type UiEventsArgsByKey = {
  [Key in keyof UiEvents]: [Key, ...Array<UiEvents[Key]>];
};

export type UiEventsArgs = Array<UiEventsArgsByKey[keyof UiEventsArgsByKey]>;

export interface NvimEvents {
  redraw: (args: UiEventsArgs) => void;

  close: () => void;

  [x: string]: (...args: any[]) => void;
}

type NvimCommandsPatch = {
  nvim_get_mode: () => { mode: string };
};

export type NvimCommands = Omit<NvimCommandsOriginal, keyof NvimCommandsPatch> & NvimCommandsPatch;

type NvimCommandsMethods = {
  [K in keyof typeof nvimCommandNames]: <
    Return = ReturnType<NvimCommands[typeof nvimCommandNames[K]]>
  >(
    ...args: Parameters<NvimCommands[typeof nvimCommandNames[K]]>
  ) => Promise<Return>;
};
export type NvimInterface = TypedEventEmitter<EventEmitter, NvimEvents> & NvimCommandsMethods;

export type Settings = {
  element?: HTMLDivElement,
  bold: BooleanSetting;
  italic: BooleanSetting;
  underline: BooleanSetting;
  undercurl: BooleanSetting;
  strikethrough: BooleanSetting;
  fontfamily: string;
  fontsize: string; // TODO: number
  lineheight: string; // TODO: number
  letterspacing: string; // TODO: number
};
