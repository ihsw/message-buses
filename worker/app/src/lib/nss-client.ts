import * as NATS from "nats";
import * as NSS from "node-nats-streaming";

export default class {
  natsClient: NATS.Client;
  client: NSS.Stan;
  clusterId: string;
  clientId: string;

  constructor(natsClient: NATS.Client, clusterId: string, clientId: string) {
    this.natsClient = natsClient;
    this.clusterId = clusterId;
    this.clientId = clientId;
  }

  connect(): Promise<void> {
    return new Promise<void>((resolve) => {
      const client = NSS.connect( this.clusterId, this.clientId, <NSS.StanOptions>{ nc: this.natsClient });
      client.on("connect", () => {
        this.client = client;
        resolve();
      });
    });
  }

  close(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.client.close();
      this.client.on("close", resolve);
    });
  }

  publish(subject: string, data: string | Buffer): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.client.publish(subject, data, (err, guid) => {
        if (err) {
          return reject(err);
        }

        resolve(guid);
      });
    });
  }

  lastMessage(subject: string, queueGroup: string): Promise<NSS.Message> {
    return new Promise<NSS.Message>((resolve, reject) => {
      const opts = this.client.subscriptionOptions().setStartWithLastReceived();
      const subscription = this.client.subscribe(subject, queueGroup, opts);
      const tId = setTimeout(() => reject(new Error("Subscription timeout!")), 2 * 1000);
      subscription.on("message", (msg: NSS.Message) => {
        clearTimeout(tId);
        resolve(msg);

        subscription.unsubscribe();
      });
      subscription.on("error", (err) => {
        clearTimeout(err);
        reject(err);
      });
    });
  }
}
