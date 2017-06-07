import * as amqplib from "amqplib";

import AbstractMessageDriver from "./AbstractMessageDriver";
import {
  IGetDriver,
  IMessageDriver,
  IUnsubscribeCallback
} from "./IMessageDriver";

export const GetDriver: IGetDriver = async (vhost: string, env: any): Promise<RabbitDriver> => {
  return new RabbitDriver(await amqplib.connect(
    `amqp://${env["RABBIT_HOST"]}:${env["RABBIT_PORT"]}/${vhost}`
  ));
};

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
