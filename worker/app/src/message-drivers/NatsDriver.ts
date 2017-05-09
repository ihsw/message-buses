import * as NATS from "nats";
import * as NSS from "node-nats-streaming";
import { IMessageDriver, ISubscribeOptions } from "./IMessageDriver";

export class NatsDriver implements IMessageDriver {
  natsClient: NATS.Client;
  nssClient: NSS.Stan;

  constructor(natsClient: NATS.Client, nssClient: NSS.Stan) {
    this.natsClient = natsClient;
    this.nssClient = nssClient;
  }

  subscribe(opts: ISubscribeOptions) {
    const sId = this.natsClient.subscribe(opts.queue, (msg) => opts.callback(msg, sId));
    this.natsClient.timeout(sId, opts.timeoutInMs, 0, () => opts.timeoutCallback);
  }

  unsubscribe(sId: number) {
    this.natsClient.unsubscribe(sId);
  }

  publish(queue: string, message: string | Buffer) {
    this.natsClient.publish(queue, message);
  }

  lastMessage(queue: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const opts = this.nssClient.subscriptionOptions().setStartWithLastReceived();
      const subscription = this.nssClient.subscribe(queue, `${queue}.workers`, opts);
      const tId = setTimeout(() => reject(new Error("Subscription timeout!")), 2 * 1000);
      subscription.on("message", (msg: NSS.Message) => {
        clearTimeout(tId);
        subscription.unsubscribe();

        // resolving the message data
        let result: string;
        if (msg.getData() instanceof Buffer) {
          result = msg.getData().toString();
        } else {
          result = <string>msg.getData();
        }
        
        resolve(result);
      });
      subscription.on("error", (err) => {
        clearTimeout(err);
        reject(err);
      });
    });
  }
}
