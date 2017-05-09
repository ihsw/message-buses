export interface ISubscribeOptions {
  queue: string;
  callback: ISubscribeCallback;
  timeoutInMs: number;
  timeoutCallback: ISubscribeTimeoutCallback;
}

export interface ISubscribeCallback {
  (msg: string, sId: number): void;
}

export interface ISubscribeTimeoutCallback {
  (sId: number): void;
}

export interface IMessageDriver {
  subscribe(opts: ISubscribeOptions);
  unsubscribe(sId: number);
  publish(queue: string, message: string);
  lastMessage(queue: string): Promise<string>;
}
