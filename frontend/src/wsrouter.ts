import Logger from './logger';

enum MessageType {
  CALL,
  REPLY,
  ERROR,
}

class WSRouter extends Logger {
  routes: Map<string, (args: any) => any> = new Map();
  ws?: WebSocket;
  constructor() {
    super('WSRouter');
  }

  connect() {
    this.ws = new WebSocket('ws://127.0.0.1:1337/ws');

    this.ws.addEventListener('message', this.onMessage.bind(this));
    this.ws.addEventListener('close', this.onError.bind(this));
    this.ws.addEventListener('message', this.onError.bind(this));
  }

  onMessage() {}

  onError() {}
}
