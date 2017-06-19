import * as amqplib from "amqplib";

import AbstractMessageDriver from "./AbstractMessageDriver";
import {
  IGetDriver,
  IMessageDriver,
  IUnsubscribeOptions,
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

  async subscribe(opts: ISubscribeOptions): Promise<IUnsubscribeOptions> {
    const channel = await this.rabbitClient.createChannel();

    // asserting that the queue exists
    channel.assertQueue(opts.queue);

    // optionally setting up a timeout callback
    let tId;
    if (opts.timeoutInMs) {
      const timeoutCallback = opts.timeoutCallback ? opts.timeoutCallback : () => { return; };
      tId = setTimeout(timeoutCallback, opts.timeoutInMs);
    }

    // waiting for messages to come in
    channel.consume(opts.queue, (msg) => {
      // halting on null message, where the channel has been closed
      if (msg === null) {
        return;
      }

      // optionally clearing the timeout callback
      if (tId) {
        clearTimeout(tId);
        tId = null;
      }

      // calling the receipt callback and acking the message
      opts.callback(msg.content.toString());
      channel.ack(msg);
    });

    return <IUnsubscribeOptions>{
      unsubscribe: () => new Promise<void>((resolve, reject) =>
        channel.deleteQueue(opts.queue).then(() => resolve()).catch(reject)
      )
    };
  }

  async publish(queue: string, message: string): Promise<void> {
    const channel = await this.rabbitClient.createChannel();
    await channel.assertQueue(queue);
    channel.sendToQueue(queue, Buffer.from(message));
  }

  subscribePersist(): IUnsubscribeOptions {
    return <IUnsubscribeOptions>{ unsubscribe: () => Promise.resolve() };
  }

  subscribePersistFromBeginning(): IUnsubscribeOptions {
    return <IUnsubscribeOptions>{ unsubscribe: () => Promise.resolve() };
  }

  publishPersist(): Promise<string> {
    return Promise.resolve("");
  }

  lastPersistMessage(): Promise<string> {
    return Promise.resolve("");
  }
}
