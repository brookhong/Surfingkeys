import { getColor, getColorNum } from 'src/nvim/lib/getColor';

describe('getColor', () => {
  test('0 is black', () => {
    expect(getColor(0)).toBe('rgb(0,0,0)');
  });

  test('0xffffff is white', () => {
    expect(getColor(0xffffff)).toBe('rgb(255,255,255)');
  });

  test('0x333333 is gray', () => {
    expect(getColor(0x333333)).toBe('rgb(51,51,51)');
  });

  test('0x003300 is rgb(0,51,0)', () => {
    expect(getColor(0x003300)).toBe('rgb(0,51,0)');
  });
});

describe('getColorNum', () => {
  test('rgb(0, 0, 0) is 0', () => {
    expect(getColorNum('rgb(0,0,0)')).toBe(0);
  });

  test('rgb(255,255,255) is 0xffffff', () => {
    expect(getColorNum('rgb(255,255,255)')).toBe(0xffffff);
  });

  test('rgb(51,51,51) is 0x333333', () => {
    expect(getColorNum('rgb(51,51,51)')).toBe(0x333333);
  });

  test('rgb(0,51,0) is 0x00ff00', () => {
    expect(getColorNum('rgb(0,51,0)')).toBe(0x003300);
  });

  test('returns undefined for undefined param', () => {
    expect(getColorNum()).toBeUndefined();
  });
});
