import {
    createElementWithContent,
    locateFocusNode,
    scrollIntoViewIfNeeded,
    setSanitizedContent,
} from './utils';
import Mode from './mode';
import KeyboardUtils from '../common/keyboardUtils';
import Trie from '../common/trie';

class CursorPrompt {
    #suppressKeyup = false;

    constructor(renderer, picker, fetcher) {
        this.element = createElementWithContent('div', '', {class: "sk_cursor_prompt", style: "display: block; opacity: 1;"});
        this.renderer = renderer;
        this.picker = picker;
        this.fetcher = fetcher;
        this.initMode();
    }

    initMode() {
        const mode = new Mode("CursorPrompt");

        mode.addEventListener('keydown', function(event) {
            if (event.sk_keyName.length) {
                Mode.handleMapKey.call(mode, event);
            }
            event.sk_suppressed = true;
        });
        mode.addEventListener('keyup', this.onKeyUp.bind(this));

        mode.mappings = new Trie();
        mode.map_node = mode.mappings;

        mode.mappings.add(KeyboardUtils.encodeKeystroke("<Esc>"), {
            code: this.close.bind(this)
        });
        mode.mappings.add(KeyboardUtils.encodeKeystroke("<Enter>"), {
            code: this.onEnter.bind(this)
        });
        mode.mappings.add(KeyboardUtils.encodeKeystroke("<Tab>"), {
            code: this.rotate.bind(this, false)
        });
        mode.mappings.add(KeyboardUtils.encodeKeystroke("<Shift-Tab>"), {
            code: this.rotate.bind(this, true)
        });
        this.mode = mode;
    }

    activate(parentElement, data, threshold, insertOffset) {
        this.insertOffset = insertOffset || 0;
        this.threshold = threshold || 0;
        this.parentElement = parentElement;
        this.isNativeInput = (parentElement.selectionStart !== undefined && parentElement.value !== undefined);
        let value = "";
        [value, this.matchStart] = this.#getValueAndSelectionStart();
        this.activator = value[this.matchStart - 1];

        if (data && data.length) {
            this.data = data;
        }

        if (this.data) {
            this.#render();
        } else if (this.fetcher) {
            this.fetcher.then((res) => {
                this.data = res;
                this.#render();
            });
        }

        this.#suppressKeyup = false;

        this.mode.enter();
    }

    rotate(backward) {
        const items = Array.from(this.element.children);
        if (items.length === 1) {
            this.onEnter();
            return;
        }
        const si = this.element.querySelector('div.selected');
        const ci = (items.indexOf(si) + (backward ? -1 : 1)) % items.length;
        si.classList.remove('selected');
        items[ci].classList.add('selected');
        this.#suppressKeyup = true;
    }

    onEnter() {
        const d = this.picker(this.element.querySelector("div.selected"));
        const newPos = this.matchStart + d.length;

        if (this.isNativeInput) {
            const val = this.parentElement.value;
            this.parentElement.value = val.substr(0, this.matchStart + this.insertOffset) + d + val.substr(this.parentElement.selectionStart);
            this.parentElement.setSelectionRange(newPos, newPos);
        } else {
            // for contenteditable div
            const selection = document.getSelection(), val = selection.focusNode.data;
            selection.focusNode.data = val.substr(0, this.matchStart + this.insertOffset) + d + val.substr(selection.focusOffset);
            selection.setPosition(selection.focusNode, newPos);
        }

        this.close();
        this.matchStart = -1;
    }

    #getValueAndSelectionStart() {
        if (this.isNativeInput) {
            return [this.parentElement.value, this.parentElement.selectionStart];
        } else {
            // for contenteditable div
            const selection = document.getSelection();
            return [selection.focusNode.data, selection.focusOffset];
        }
    }

    onKeyUp(event) {
        if (!this.#suppressKeyup && this.matchStart !== -1) {
            let [v, ss] = this.#getValueAndSelectionStart();
            if (ss < this.matchStart || v[this.matchStart - 1] !== this.activator) {
                this.element.remove();
            } else {
                this.#render();
            }
        }
        this.#suppressKeyup = false;
    }

    close() {
        this.element.remove();
        this.mode.exit();
    }

    #render() {
        let query = "";
        if (this.isNativeInput) {
            query = this.parentElement.value.substr(this.matchStart, this.parentElement.selectionStart - this.matchStart);
        } else {
            // for contenteditable div
            const selection = document.getSelection();
            query = selection.focusNode.data.substr(this.matchStart, selection.focusOffset - this.matchStart);
        }
        if (query.length < this.threshold || query[0] === " ") {
            this.element.remove();
        } else {
            const choices = this.data.filter(function(c) {
                return c.indexOf(query) !== -1;
            }).slice(0, 5).map(this.renderer).join("");

            if (choices === "") {
                this.element.remove();
            } else {
                setSanitizedContent(this.element, choices);
                document.body.append(this.element);
                this.element.firstElementChild.classList.add("selected");
                const br = this.isNativeInput ? this.#getCursorPixelPos(this.parentElement) : locateFocusNode(document.getSelection());
                let top = br.top + br.height + 4;
                this.element.style.borderRadius = "0px 0px 4px 4px";
                if (window.innerHeight - top < this.element.offsetHeight) {
                    top = br.top - this.element.offsetHeight;
                    this.element.style.borderRadius = "4px 4px 0px 0px";
                }

                this.element.style.position = "fixed";
                this.element.style.top = top + "px";
                this.element.style.left = br.left + "px";
            }
        }

    }

    #getCursorPixelPos(input) {
        var css = getComputedStyle(input),
            br = input.getBoundingClientRect(),
            mask = document.createElement("div"),
            span = document.createElement("span");
        mask.style.font = css.font;
        mask.style.position = "fixed";
        setSanitizedContent(mask, input.value);
        mask.style.left = (input.clientLeft + br.left) + "px";
        mask.style.top = (input.clientTop + br.top) + "px";
        mask.style.color = "red";
        mask.style.overflow = "scroll";
        mask.style.visibility = "hidden";
        mask.style.whiteSpace = "pre-wrap";
        mask.style.padding = css.padding;
        mask.style.width = css.width;
        mask.style.height = css.height;
        span.innerText = "I";

        var pos = input.selectionStart;
        if (pos === input.value.length) {
            mask.appendChild(span);
        } else {
            var fp = mask.childNodes[0].splitText(pos);
            mask.insertBefore(span, fp);
        }
        document.body.appendChild(mask);
        scrollIntoViewIfNeeded(span);

        br = span.getBoundingClientRect();

        mask.remove();
        return br;
    }

}
export default CursorPrompt;
