import * as amqplib from "amqplib";

import AbstractMessageDriver from "./AbstractMessageDriver";
import {
  IGetDriver,
  IMessageDriver,
  IUnsubscribeCallback,
  ISubscribeOptions
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

  subscribe(opts: ISubscribeOptions): IUnsubscribeCallback {
    this.rabbitClient.createChannel()
      .then((channel) => {
        channel.assertQueue(opts.queue);
        channel.consume(opts.queue, (msg) => {
          opts.callback(msg.content.toString());
          channel.ack(msg);
        });
      });
    
    return () => { return; };
  }

  async publish(queue: string, message: string): Promise<void> {
    const channel = await this.rabbitClient.createChannel();
    await channel.assertQueue(queue);
    channel.sendToQueue(queue, Buffer.from(message));
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
