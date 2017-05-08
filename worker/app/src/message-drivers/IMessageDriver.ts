export interface ISubscribeOptions {
  queue: string;
  callback: ISubscribeCallback;
  timeoutInMs: number;
  timeoutCallback: ISubscribeTimeoutCallback;
}

export interface ISubscribeCallback {
  (msg: string | Buffer): void;
}

export interface ISubscribeTimeoutCallback {
  (): void;
}

export interface IMessageDriver {
  subscribe(opts: ISubscribeOptions);
  publish(queue: string, message: string | Buffer);
}
