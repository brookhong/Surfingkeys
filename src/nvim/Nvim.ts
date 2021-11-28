import { EventEmitter } from 'events';

import type { Transport, MessageType, NvimInterface } from './types';
import { nvimCommandNames } from './__generated__/constants';
import WebSocketTransport from './transport/websocket';

const NvimEventEmitter = (EventEmitter as unknown) as { new (): NvimInterface };

class Nvim extends NvimEventEmitter {
    private requestId = 0;
    private connectedUrl: String;

    private requestPromises: Record<
        string,
        { resolve: (result: any) => void; reject: (error: any) => void } > = {};

    constructor() {
        super();
        this.connectedUrl = "";
        this.on('newListener', (eventName: string) => {
            if (
                !this.listenerCount(eventName) &&
                !['close', 'newListener', 'removeListener'].includes(eventName) &&
                !eventName.startsWith('nvim:')
            ) {
                this.subscribe(eventName);
            }
        });

        this.on('removeListener', (eventName: string) => {
            if (
                !this.listenerCount(eventName) &&
                !['close', 'newListener', 'removeListener'].includes(eventName) &&
                !eventName.startsWith('nvim:')
            ) {
                this.unsubscribe(eventName);
            }
        });
    }

    connect(url: string, onconnected?: () => void): void {
        if (this.connectedUrl === url) {
            this.emit('nvim:connectExisting');
            if (onconnected) {
                onconnected();
            }
            return;
        }

        const transport = new WebSocketTransport (url);

        transport.on('nvim:data', (params: MessageType) => {
            if (params[0] === 0) {
                // eslint-disable-next-line no-console
                console.error('Unsupported request type', ...params);
            } else if (params[0] === 1) {
                this.handleResponse(params[1], params[2], params[3]);
            } else if (params[0] === 2) {
                this.emit(params[1], params[2]);
            }
        });

        transport.on('nvim:open', () => {
            this.connectedUrl = url;
            this.emit('nvim:open');
            if (onconnected) {
                onconnected();
            }
        });
        transport.on('nvim:close', () => {
            this.connectedUrl = "";
            this.emit('nvim:close');
        });
        transport.on('nvim:connection_failed', () => {
            this.emit('nvim:connection_failed');
        });

        (Object.keys(nvimCommandNames) as Array<keyof typeof nvimCommandNames>).forEach(
            (commandName) => {
                (this as any)[commandName] = (...params: any[]) =>
                    this.request(transport, nvimCommandNames[commandName], params);
            },
        );
    }

    request<R = void>(transport: Transport, command: string, params: any[] = []): Promise<R> {
        this.requestId += 1;
        transport.send('nvim:write', this.requestId, command, params);
        return new Promise((resolve, reject) => {
            this.requestPromises[this.requestId] = {
                resolve,
                reject,
            };
        });
    }

    private handleResponse(id: number, error: Error, result?: any): void {
        if (this.requestPromises[id]) {
            if (error) {
                this.requestPromises[id].reject(error);
            } else {
                this.requestPromises[id].resolve(result);
            }
            delete this.requestPromises[id];
        }
    }

    /**
     * Fetch current mode from nvim, leaves only first letter to match groups of modes.
     * https://neovim.io/doc/user/eval.html#mode()
     */
    getShortMode = async (): Promise<string> => {
        const { mode } = await this.getMode();
        return mode.replace('CTRL-', '')[0];
    };
}

export default Nvim;
