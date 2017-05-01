import * as NATS from "nats";
import * as Stan from "node-nats-streaming";

export default class {
  natsClient: NATS.Client;
  client: Stan.Stan;
  clusterId: string;
  clientId: string;

  constructor(natsClient: NATS.Client, clusterId: string, clientId: string) {
    this.natsClient = natsClient;
    this.clusterId = clusterId;
    this.clientId = clientId;
  }

  connect(): Promise<void> {
    return new Promise<void>((resolve) => {
      const client = Stan.connect( this.clusterId, this.clientId, <Stan.StanOptions>{ nc: this.natsClient });
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

  lastMessage(subject: string, queueGroup: string): Promise<Stan.Message> {
    return new Promise<Stan.Message>((resolve, reject) => {
      const opts = this.client.subscriptionOptions().setStartWithLastReceived();
      const subscription = this.client.subscribe(subject, queueGroup, opts);
      subscription.on("message", (msg: Stan.Message) => {
        resolve(msg);

        subscription.unsubscribe();
      });
      subscription.on("error", reject);
    });
  }
}
