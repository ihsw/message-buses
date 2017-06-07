import { MetricsCollector } from "../lib/MetricsCollector";

export interface ISubscribeOptions {
  queue: string;
  callback: ISubscribeCallback;
  timeoutInMs?: number;
  timeoutCallback?: ISubscribeTimeoutCallback;
  parallel?: boolean;
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

export interface IGetDriver {
  (name: string, env: any): Promise<IMessageDriver>;
}

export interface IMessageDriver {
  metricsCollector: MetricsCollector;

  subscribe(opts: ISubscribeOptions): IUnsubscribeCallback;
  publish(queue: string, message: string): Promise<void>;

  subscribePersist(opts: ISubscribePersistOptions): IUnsubscribeCallback;
  subscribePersistFromBeginning(opts: ISubscribePersistOptions): IUnsubscribeCallback;
  publishPersist(queue: string, message: string): Promise<string>;
  lastPersistMessage(queue: string): Promise<string>;
}
