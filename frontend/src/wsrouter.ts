import { sleep } from '@decky/ui';

import Logger from './logger';

declare global {
  export var DeckyBackend: WSRouter;
}

enum MessageType {
  ERROR = -1,
  // Call-reply, Frontend (CALL) -> Backend (REPLY|DISCARD) -> Frontend (RECEIVED_RESPONSE) -> Backend
  CALL = 0,
  REPLY = 1,
  DISCARD = 2,
  RECEIVED_RESPONSE = 3,
  // Call-reply sync on connection lost,
  //   Frontend (FULL_SYNC) -> Backend (REPLY|DISCARD...) -> Frontend (RECEIVED_RESPONSE...) -> Backend
  FULL_SYNC = 4,
  // Pub/Sub, Backend -> Frontend
  EVENT = 5,
}

interface CallMessage {
  type: MessageType.CALL;
  args: any[];
  route: string;
  id: number;
}

interface ReplyMessage {
  type: MessageType.REPLY;
  result: any;
  id: number;
}

interface DiscardMessage {
  type: MessageType.DISCARD;
  id: number;
}

interface ReceivedResponseMessage {
  type: MessageType.RECEIVED_RESPONSE;
  id: number;
}

interface FullSyncMessage {
  type: MessageType.FULL_SYNC;
  messages: CallMessage[];
}

interface ErrorMessage {
  type: MessageType.ERROR;
  error: { name: string; error: string; traceback: string | null };
  id: number;
}

/**
 * An error from a python call
 */
export class PyError extends Error {
  pythonTraceback: string | null;

  constructor(name: string, error: string, traceback: string | null) {
    super(error);
    this.name = `Python ${name}`;
    if (traceback) {
      // traceback will always start with `Traceback (most recent call last):`
      // so this will make it say `Python Traceback (most recent call last):` after the JS callback
      this.stack = this.stack + '\n\nPython ' + traceback;
    }
    this.pythonTraceback = traceback;
  }
}

interface EventMessage {
  type: MessageType.EVENT;
  event: string;
  args: any;
}

type MessageToBackend = CallMessage | ReceivedResponseMessage | FullSyncMessage;
type MessageFromBackend = ReplyMessage | ErrorMessage | DiscardMessage | EventMessage;

// Helper to resolve a promise from the outside
interface PromiseResolver<T> {
  resolve: (res: T) => void;
  reject: (error: PyError) => void;
  promise: Promise<T>;
  message: CallMessage;
}

export class WSRouter extends Logger {
  runningCalls: Map<number, PromiseResolver<any>> = new Map();
  eventListeners: Map<string, Set<(...args: any) => any>> = new Map();
  ws?: WebSocket;
  // Used to map results and errors to calls
  reqId: number = 0;
  constructor() {
    super('WSRouter');
  }

  connect() {
    return new Promise<void>((resolve) => {
      // Auth is a query param as JS WebSocket doesn't support headers
      this.ws = new WebSocket(`ws://127.0.0.1:1337/ws?auth=${deckyAuthToken}`);

      this.ws.addEventListener('open', () => {
        this.debug('WS Connected');
        resolve();

        // Synchronize frontend and backend by forwarding all the running calls again
        // and letting backend reply to them accordingly.
        const messages = Array.from(this.runningCalls.values()).map((resolver) => resolver.message);
        this.write({ type: MessageType.FULL_SYNC, messages });
      });
      this.ws.addEventListener('message', this.onMessage.bind(this));
      this.ws.addEventListener('close', this.onError.bind(this));
    });
  }

  createPromiseResolver<T>(message: CallMessage): PromiseResolver<T> {
    let resolver: Partial<PromiseResolver<T>> = { message };
    const promise = new Promise<T>((resolve, reject) => {
      resolver.resolve = resolve;
      resolver.reject = reject;
    });
    resolver.promise = promise;
    return resolver as PromiseResolver<T>;
  }

  addEventListener(event: string, listener: (...args: any) => any) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set([listener]));
    } else {
      this.eventListeners.get(event)?.add(listener);
    }
    return listener;
  }

  removeEventListener(event: string, listener: (...args: any) => any) {
    if (this.eventListeners.has(event)) {
      const set = this.eventListeners.get(event);
      set?.delete(listener);
      if (set?.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  async onMessage(msg: MessageEvent) {
    try {
      const data = JSON.parse(msg.data) as MessageFromBackend;
      switch (data.type) {
        case MessageType.REPLY:
          if (this.runningCalls.has(data.id)) {
            this.runningCalls.get(data.id)!.resolve(data.result);
            this.runningCalls.delete(data.id);
            this.debug(`[${data.id}] Resolved PY call with value`, data.result);
          }

          this.write({ type: MessageType.RECEIVED_RESPONSE, id: data.id });
          break;

        case MessageType.ERROR:
          if (this.runningCalls.has(data.id)) {
            let err = new PyError(data.error.name, data.error.error, data.error.traceback);
            this.runningCalls.get(data.id)!.reject(err);
            this.runningCalls.delete(data.id);
            this.debug(`[${data.id}] Rejected PY call with error`, data.error);
          }

          this.write({ type: MessageType.RECEIVED_RESPONSE, id: data.id });
          break;

        case MessageType.DISCARD:
          if (this.runningCalls.has(data.id)) {
            // We are explicitly not resolving the promise here as this message
            // is only received (at the moment) when plugin is being unloaded and
            // the promise should be garbage-collected, unless the plugin is doing
            // very bad things!
            this.runningCalls.delete(data.id);
            this.debug(`[${data.id}] Discarding PY call`);
          }

          this.write({ type: MessageType.RECEIVED_RESPONSE, id: data.id });
          break;

        case MessageType.EVENT:
          this.debug(`Recieved event ${data.event} with args`, data.args);
          if (this.eventListeners.has(data.event)) {
            for (const listener of this.eventListeners.get(data.event)!) {
              (async () => {
                try {
                  await listener(...data.args);
                } catch (e) {
                  this.error(`error in event ${data.event}`, e, listener);
                }
              })();
            }
          } else {
            this.warn(`event ${data.event} has no listeners`);
          }
          break;

        default:
          this.error('Unknown message type', data);
          break;
      }
    } catch (e) {
      this.error('Error parsing WebSocket message', e);
    }
  }

  // this.call<[number, number], string>('methodName', 1, 2);
  call<Args extends any[] = [], Return = void>(route: string, ...args: Args): Promise<Return> {
    const id = ++this.reqId;
    const resolver = this.createPromiseResolver<Return>({ type: MessageType.CALL, route, args, id });
    this.runningCalls.set(id, resolver);

    this.debug(`[${id}] Calling PY method ${route} with args`, args);
    this.write(resolver.message);

    return resolver.promise;
  }

  callable<Args extends any[] = [], Return = void>(route: string): (...args: Args) => Promise<Return> {
    return (...args) => this.call<Args, Return>(route, ...args);
  }

  async onError(error: any) {
    this.error('WS DISCONNECTED', error);
    await sleep(5000);
    await this.connect();
  }

  private write(data: MessageToBackend) {
    // In case the message is discarded here:
    //   - CallMessage will be resent during FULL_SYNC
    //   - Backend cleanup via missed ReceivedReplyMessage will be done during FULL_SYNC
    //   - FullSyncMessage will be resent during FULL_SYNC
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws?.send(JSON.stringify(data));
    }
  }
}
