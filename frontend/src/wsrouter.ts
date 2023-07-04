import Logger from './logger';

enum MessageType {
  // Call-reply
  CALL,
  REPLY,
  ERROR,
  // Pub/sub
  // SUBSCRIBE,
  // UNSUBSCRIBE,
  // PUBLISH
}

interface CallMessage {
  type: MessageType.CALL;
  args: any[];
  route: string;
  id: number;
  // TODO implement this
  // skipResponse?: boolean;
}

interface ReplyMessage {
  type: MessageType.REPLY;
  result: any;
  id: number;
}

interface ErrorMessage {
  type: MessageType.ERROR;
  error: any;
  id: number;
}

type Message = CallMessage | ReplyMessage | ErrorMessage;

// Helper to resolve a promise from the outside
interface PromiseResolver<T> {
  resolve: (res: T) => void;
  reject: (error: string) => void;
  promise: Promise<T>;
}

class WSRouter extends Logger {
  routes: Map<string, (...args: any) => any> = new Map();
  runningCalls: Map<number, PromiseResolver<any>> = new Map();
  ws?: WebSocket;
  // Used to map results and errors to calls
  reqId: number = 0;
  constructor() {
    super('WSRouter');
  }

  connect() {
    this.ws = new WebSocket('ws://127.0.0.1:1337/ws');

    this.ws.addEventListener('message', this.onMessage.bind(this));
    this.ws.addEventListener('close', this.onError.bind(this));
    this.ws.addEventListener('message', this.onError.bind(this));
  }

  createPromiseResolver<T>(): PromiseResolver<T> {
    let resolver: PromiseResolver<T>;
    const promise = new Promise<T>((resolve, reject) => {
      resolver = {
        promise,
        resolve,
        reject,
      };
      this.debug('Created new PromiseResolver');
    });
    this.debug('Returning new PromiseResolver');
    // The promise will always run first
    // @ts-expect-error 2454
    return resolver;
  }

  write(data: Message) {
    this.ws?.send(JSON.stringify(data));
  }

  addRoute(name: string, route: (args: any) => any) {
    this.routes.set(name, route);
  }

  removeRoute(name: string) {
    this.routes.delete(name);
  }

  async onMessage(msg: MessageEvent) {
    this.debug('WS Message', msg);
    try {
      const data = JSON.parse(msg.data) as Message;
      switch (data.type) {
        case MessageType.CALL:
          if (this.routes.has(data.route)) {
            try {
              const res = await this.routes.get(data.route)!(...data.args);
              this.write({ type: MessageType.REPLY, id: data.id, result: res });
              this.debug(`Started JS call ${data.route} ID ${data.id}`);
            } catch (e) {
              await this.write({ type: MessageType.ERROR, id: data.id, error: (e as Error)?.stack || e });
            }
          } else {
            await this.write({ type: MessageType.ERROR, id: data.id, error: 'Route does not exist.' });
          }
          break;

        case MessageType.REPLY:
          if (this.runningCalls.has(data.id)) {
            this.runningCalls.get(data.id)!.resolve(data.result);
            this.runningCalls.delete(data.id);
            this.debug(`Resolved PY call ${data.id} with value`, data.result);
          }
          break;

        case MessageType.ERROR:
          if (this.runningCalls.has(data.id)) {
            this.runningCalls.get(data.id)!.reject(data.error);
            this.runningCalls.delete(data.id);
            this.debug(`Errored PY call ${data.id} with error`, data.error);
          }
          break;

        default:
          this.error('Unknown message type', data);
          break;
      }
    } catch (e) {
      this.error('Error parsing WebSocket message', e);
    }
    this.call<[number, number], string>('methodName', 1, 2);
  }

  call<Args extends any[] = any[], Return = void>(route: string, ...args: Args): Promise<Return> {
    const resolver = this.createPromiseResolver<Return>();

    const id = ++this.reqId;

    this.runningCalls.set(id, resolver);

    this.write({ type: MessageType.CALL, route, args, id });

    return resolver.promise;
  }

  onError(error: any) {
    this.error('WS ERROR', error);
  }
}
