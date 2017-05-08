import * as NATS from "nats";
import { IMessageDriver, ISubscribeOptions } from "./IMessageDriver";

export class NatsDriver implements IMessageDriver {
  client: NATS.Client;

  constructor(client: NATS.Client) {
    this.client = client;
  }

  subscribe(opts: ISubscribeOptions) {
    const sId = this.client.subscribe(opts.queue, opts.callback);
    this.client.timeout(sId, opts.timeoutInMs, 0, () => opts.timeoutCallback);
  }

  publish(queue: string, message: string | Buffer) {
    this.client.publish(queue, message);
  }
}
