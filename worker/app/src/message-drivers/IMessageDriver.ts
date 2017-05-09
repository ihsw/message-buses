export interface ISubscribeOptions {
  queue: string;
  callback: ISubscribeCallback;
  timeoutInMs?: number;
  timeoutCallback?: ISubscribeTimeoutCallback;
}

export interface ISubscribeCallback {
  (msg: string, sId: number): void;
}

export interface ISubscribePersistOptions extends ISubscribeOptions {
  callback: ISubscribePersistCallback;
}

export interface ISubscribePersistCallback {
  (msg: string): void;
}

export interface ISubscribeTimeoutCallback {
  (sId?: number): void;
}

export interface IMessageDriver {
  subscribe(opts: ISubscribeOptions);
  unsubscribe(sId: number);
  publish(queue: string, message: string);

  subscribePersist(opts: ISubscribePersistOptions);
  publishPersist(queue: string, message: string): Promise<string>;
  lastPersistMessage(queue: string): Promise<string>;
}
