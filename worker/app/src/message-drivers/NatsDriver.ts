import * as NATS from "nats";
import * as NSS from "node-nats-streaming";

import { IMessageDriver, ISubscribeOptions, ISubscribePersistOptions } from "./IMessageDriver";

export const GetDriver = async (name: string, clusterId: string, env: any): Promise<NatsDriver> => {
  return new Promise<NatsDriver>((resolve) => {
    // parsing env vars
    const natsHost = env["NATS_HOST"];
    const natsPort = Number(env["NATS_PORT"]);

    // connecting to nats
    const natsClient = NATS.connect(<NATS.ClientOpts>{
      encoding: "binary",
      name: name,
      url: `nats://${natsHost}:${natsPort}`
    });

    // connecting to nss
    const nssClient = NSS.connect(clusterId, name, <NSS.StanOptions>{ nc: natsClient });
    nssClient.on("connect", () => resolve(new NatsDriver(natsClient, nssClient)));
  });
};

export class NatsDriver implements IMessageDriver {
  natsClient: NATS.Client;
  nssClient: NSS.Stan;

  constructor(natsClient: NATS.Client, nssClient: NSS.Stan) {
    this.natsClient = natsClient;
    this.nssClient = nssClient;
  }

  subscribe(opts: ISubscribeOptions) {
    const sId = this.natsClient.subscribe(opts.queue, (msg) => opts.callback(msg, sId));

    if (opts.timeoutInMs) {
      const cb = opts.timeoutCallback ? opts.timeoutCallback : () => { return; };
      this.natsClient.timeout(sId, opts.timeoutInMs, 0, cb);
    }
  }

  subscribePersist(opts: ISubscribePersistOptions) {
    const subscribeOpts = this.nssClient.subscriptionOptions();
    const subscription = this.nssClient.subscribe(opts.queue, `${opts.queue}.workers`, subscribeOpts);

    let tId;
    if (opts.timeoutInMs) {
      const cb = opts.timeoutCallback ? opts.timeoutCallback : () => { return; };
      tId = setTimeout(() => cb, opts.timeoutInMs);
    }

    subscription.on("message", (msg: NSS.Message) => {
      if (tId) {
        clearTimeout(tId);
      }

      // resolving the message data
      let result: string;
      if (msg.getData() instanceof Buffer) {
        result = msg.getData().toString();
      } else {
        result = <string>msg.getData();
      }

      opts.callback(result);
    });
  }

  unsubscribe(sId: number) {
    this.natsClient.unsubscribe(sId);
  }

  publish(queue: string, message: string | Buffer) {
    this.natsClient.publish(queue, message);
  }

  publishPersist(queue: string, message: string): Promise<string> {
    return new Promise<string>((resolve) => {
      const guid = this.nssClient.publish(queue, message);
      resolve(guid);
    });
  }

  lastPersistMessage(queue: string): Promise<string> {
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
    });
  }
}
