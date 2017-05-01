import * as NATS from "nats";
import * as Stan from "node-nats-streaming";

export default class {
  natsClient: NATS.Client;
  stanClient: Stan.Stan;
  clusterId: string;
  clientId: string;

  constructor(natsClient: NATS.Client, clusterId: string, clientId: string) {
    this.natsClient = natsClient;
    this.clusterId = clusterId;
    this.clientId = clientId;
  }

  connect(): Promise<void> {
    return new Promise<void>((resolve) => {
      const stanClient = Stan.connect( this.clusterId, this.clientId, <Stan.StanOptions>{ nc: this.natsClient });
      stanClient.on("connect", () => {
        this.stanClient = stanClient;
        resolve();
      });
    });
  }

  publish(subject: string, data: string | Buffer): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.stanClient.publish(subject, data, (err, guid) => {
        if (err) {
          return reject(err);
        }

        resolve(guid);
      });
    });
  }

  subscribeOnce(subject: string, queueGroup: string, opts?: Stan.SubscriptionOptions): Promise<Stan.Message> {
    return new Promise<Stan.Message>((resolve, reject) => {
      const subscription = this.stanClient.subscribe(subject, queueGroup, opts);
      subscription.on("message", (msg: Stan.Message) => {
        resolve(msg);

        subscription.unsubscribe();
      });
      subscription.on("error", reject);
    });
  }
}
