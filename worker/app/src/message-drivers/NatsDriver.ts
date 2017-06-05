import * as process from "process";

import * as NATS from "nats";
import * as NSS from "node-nats-streaming";

import AbstractMessageDriver from "./AbstractMessageDriver";
import {
  IMessageDriver,
  ISubscribeOptions,
  ISubscribePersistOptions,
  IUnsubscribeCallback
} from "./IMessageDriver";
import { Measurements } from "../lib/influx";
import { Metric, MetricFields } from "../lib/MetricsCollector";

export const GetNatsClient = (name: string, natsHost: string, natsPort: number): NATS.Client => {
  return NATS.connect(<NATS.ClientOpts>{
    encoding: "binary",
    name: name,
    url: `nats://${natsHost}:${natsPort}`
  });
};

export const GetDriver = (name: string, clusterId: string, env: any): Promise<NatsDriver> => {
  return new Promise<NatsDriver>((resolve) => {
    // parsing env vars
    const natsHost = env["NATS_HOST"];
    const natsPort = Number(env["NATS_PORT"]);

    // connecting to nats
    const natsClient = GetNatsClient(name, natsHost, natsPort);

    // connecting to nss
    const nssClient = NSS.connect(clusterId, name, <NSS.StanOptions>{ nc: natsClient });
    nssClient.on("connect", () => resolve(new NatsDriver(natsClient, nssClient)));
  });
};

export class NatsDriver extends AbstractMessageDriver implements IMessageDriver {
  natsClient: NATS.Client;
  nssClient: NSS.Stan;

  constructor(natsClient: NATS.Client, nssClient: NSS.Stan) {
    super();
    
    this.natsClient = natsClient;
    this.nssClient = nssClient;
  }

  subscribe(opts: ISubscribeOptions): IUnsubscribeCallback {
    let sId;
    if (!opts.parallel) {
      sId = this.natsClient.subscribe(opts.queue, (msg) => opts.callback(msg));
    } else {
      sId = this.natsClient.subscribe(opts.queue, <NATS.SubscribeOptions>{ queue: `${opts.queue}.workers` }, (msg) => opts.callback(msg));
    }

    if (opts.timeoutInMs) {
      const cb = opts.timeoutCallback ? opts.timeoutCallback : () => { return; };
      this.natsClient.timeout(sId, opts.timeoutInMs, 0, cb);
    }

    return () => this.natsClient.unsubscribe(sId);
  }

  private subscribePersistWithOptions(opts: ISubscribeOptions, subscribeOpts: NSS.SubscriptionOptions): IUnsubscribeCallback {
    const subscription = this.nssClient.subscribe(opts.queue, `${opts.queue}.workers`, subscribeOpts);

    let tId;
    if (opts.timeoutInMs) {
      const cb = opts.timeoutCallback ? opts.timeoutCallback : () => { return; };
      tId = setTimeout(cb, opts.timeoutInMs);
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

    return () => subscription.unsubscribe();
  }

  subscribePersist(opts: ISubscribePersistOptions): IUnsubscribeCallback {
    return this.subscribePersistWithOptions(
      opts,
      this.nssClient.subscriptionOptions()
    );
  }

  subscribePersistFromBeginning(opts: ISubscribePersistOptions): IUnsubscribeCallback {
    const subscriptionOpts = this.nssClient.subscriptionOptions();
    subscriptionOpts.setStartAtSequence(0);
    return this.subscribePersistWithOptions(opts, subscriptionOpts);
  }

  publish(queue: string, message: string | Buffer): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const startTime = process.hrtime();
      this.natsClient.publish(queue, message, () => {
        const [endTimeInSeconds, endTimeInNanoseconds] = process.hrtime(startTime);
        const endTimeInMs = (endTimeInSeconds * 1000) + (endTimeInNanoseconds / 1000 / 1000);
        const truncatedEndtimeInMs = Math.round(endTimeInMs * 10) / 10;

        const metric = new Metric(Measurements.PUBLISH_TIMES, <MetricFields>{ "duration": truncatedEndtimeInMs });
        this.getMetricsCollector().write(metric.toPointMessage()).then(resolve).catch(reject);
      });
    });
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
