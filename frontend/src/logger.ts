export const log = (name: string, ...args: any[]) => {
  console.log(
    `%c Decky %c ${name} %c`,
    'background: #16a085; color: black;',
    'background: #1abc9c; color: black;',
    'background: transparent;',
    ...args,
  );
};

export const error = (name: string, ...args: any[]) => {
  console.log(
    `%c Decky %c ${name} %c`,
    'background: #16a085; color: black;',
    'background: #FF0000;',
    'background: transparent;',
    ...args,
  );
};

class Logger {
  constructor(private name: string) {
    this.name = name;
  }

  log(...args: any[]) {
    log(this.name, ...args);
  }

  debug(...args: any[]) {
    log(this.name, ...args);
  }
}

export default Logger;
