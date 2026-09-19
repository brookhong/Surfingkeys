/* eslint-disable no-bitwise */

/**
 * Get color by number, for example hex number `0xFF0000` becomes `rgb(255,0,0)`
 * @param color Color in number
 * @param defaultColor Use default color if color is undefined or -1
 */
export const getColor = (color: number | undefined, defaultColor?: string): string | undefined => {
  if (typeof color !== 'number' || color === -1) return defaultColor;
  return `rgb(${(color >> 16) & 0xff},${(color >> 8) & 0xff},${color & 0xff})`;
};
