/**
 * Hides mouse cursor when you start typing. Shows it again when you move mouse.
 */
function showCursor() {
  document.body.style.cursor = 'auto';
  document.addEventListener('keydown', hideCursor); // eslint-disable-line no-use-before-define
  document.removeEventListener('mousemove', showCursor);
}

function hideCursor(): void {
  document.body.style.cursor = 'none';
  document.addEventListener('mousemove', showCursor);
  document.removeEventListener('keydown', hideCursor);
}

export default hideCursor;
