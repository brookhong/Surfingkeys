/* eslint-disable no-bitwise */

import { memoize } from 'lodash';

/**
 * Get color by number, for example hex number `0xFF0000` becomes `rgb(255,0,0)`
 * @param color Color in number
 * @param defaultColor Use default color if color is undefined or -1
 */
export const getColor = (color: number | undefined, defaultColor?: string): string | undefined => {
  if (typeof color !== 'number' || color === -1) return defaultColor;
  return `rgb(${(color >> 16) & 0xff},${(color >> 8) & 0xff},${color & 0xff})`;
};

/**
 * Get color number from string, for example `rgb(255,0,0)` becomes `0xFF0000`
 * @param color Color in rgb string
 */
export const getColorNum = memoize((color?: string): number | undefined => {
  if (color) {
    const [r, g, b] = color
      .replace(/([^0-9,])/g, '')
      .split(',')
      .map((s) => parseInt(s, 10));
    return (r << 16) + (g << 8) + b;
  }
  return undefined;
});
