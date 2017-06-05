import * as process from "process";

import * as amqplib from "amqplib";

import AbstractMessageDriver from "./AbstractMessageDriver";
import {
  IMessageDriver,
  ISubscribeOptions,
  ISubscribePersistOptions,
  IUnsubscribeCallback
} from "./IMessageDriver";

export class RabbitDriver extends AbstractMessageDriver implements IMessageDriver {
  rabbitClient: amqplib.Connection;

  constructor(rabbitClient: amqplib.Connection) {
    super();

    this.rabbitClient = rabbitClient;
  }

  subscribe(): IUnsubscribeCallback {
    return () => { return };
  }

  publish(): Promise<void> {
    return Promise.resolve();
  }

  subscribePersist(): IUnsubscribeCallback {
    return () => { return };
  }

  subscribePersistFromBeginning(): IUnsubscribeCallback {
    return () => { return; };
  }

  publishPersist(): Promise<string> {
    return Promise.resolve("");
  }

  lastPersistMessage(): Promise<string> {
    return Promise.resolve("");
  }
}
