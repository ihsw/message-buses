import { InfluxDB } from "influx";

export interface ISubscribeOptions {
  queue: string;
  callback: ISubscribeCallback;
  timeoutInMs?: number;
  timeoutCallback?: ISubscribeTimeoutCallback;
}

export interface ISubscribeCallback {
  (msg: string): void;
}

export interface ISubscribePersistOptions extends ISubscribeOptions {
  callback: ISubscribePersistCallback;
}

export interface ISubscribePersistCallback {
  (msg: string): void;
}

export interface ISubscribeTimeoutCallback {
  (): void;
}

export interface IUnsubscribeCallback {
  (): void;
}

export interface IMessageDriver {
  influx: InfluxDB;

  subscribe(opts: ISubscribeOptions): IUnsubscribeCallback;
  publish(queue: string, message: string): Promise<void>;

  subscribePersist(opts: ISubscribePersistOptions): IUnsubscribeCallback;
  subscribePersistFromBeginning(opts: ISubscribePersistOptions): IUnsubscribeCallback;
  publishPersist(queue: string, message: string): Promise<string>;
  lastPersistMessage(queue: string): Promise<string>;
}
