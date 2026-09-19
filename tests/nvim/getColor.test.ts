import { getColor } from 'src/nvim/lib/getColor';

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
