import { EventEmitter } from 'events';
import type { Transport, Args } from 'src/nvim/types';
import { encode, decodeMulti } from "@msgpack/msgpack";

class WebSocketTransport extends EventEmitter implements Transport {
    socket: WebSocket;
    buffer: Uint8Array;
    open: boolean;

    constructor(url: string) {
        super();

        this.buffer = new Uint8Array();
        this.socket = new WebSocket(`ws://${url}`);
        this.open = false;

        this.socket.onmessage = async ({ data }) => {
            const newBuf = await data.arrayBuffer();
            const newData = new Uint8Array(newBuf);
            const prev = this.buffer;
            this.buffer = new Uint8Array(prev.byteLength + newData.byteLength);
            this.buffer.set(prev);
            this.buffer.set(newData, prev.length);
            try {
                for (const item of decodeMulti(this.buffer)) {
                    // console.log('nvim:data', item);
                    this.emit('nvim:data', item);
                }
                this.buffer = new Uint8Array();
            } catch (e) {
                // this exception is ok, since some packages are too large
                // to be received all in one time.
            }
        };
        this.socket.onopen = () => {
            this.open = true;
            this.emit('nvim:open');
        };
        this.socket.onclose = () => {
            if (this.open) {
                this.emit('nvim:close');
            } else {
                this.emit('nvim:connection_failed');
            }
        };
    }

    send(channel: string, ...args: Args): void {
        if (channel === 'nvim:write') {
            const req = [0, ...args];
            // console.log(channel, req);
            if (this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(encode(req));
            } else if (this.open) {
                this.open = false;
                this.emit('nvim:close');
            }
        }
    }

    close(): void {
        this.socket.close();
    }
}

export default WebSocketTransport;
