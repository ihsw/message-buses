import * as process from "process";

import * as NATS from "nats";
import * as NSS from "node-nats-streaming";

import AbstractMessageDriver from "./AbstractMessageDriver";
import {
  IGetDriver,
  IMessageDriver,
  ISubscribeOptions,
  ISubscribePersistOptions,
  IUnsubscribeOptions
} from "./IMessageDriver";
import { Measurements } from "../lib/influx";
import { Metric, MetricFields } from "../lib/MetricsCollector";
import { defaultAppName } from "../lib/helper";

export const GetNatsClient = (name: string, natsHost: string, natsPort: number): NATS.Client => {
  return NATS.connect(<NATS.ClientOpts>{
    encoding: "binary",
    name: name,
    url: `nats://${natsHost}:${natsPort}`
  });
};

export const GetDriver: IGetDriver = (name: string, env: any): Promise<NatsDriver> => {
  return new Promise<NatsDriver>((resolve, reject) => {
    // parsing env vars
    const natsHost = env["NATS_HOST"];
    const natsPort = Number(env["NATS_PORT"]);

    // connecting to nats
    const natsClient = GetNatsClient(name, natsHost, natsPort);

    // connecting to nss
    const clusterId = env["NATS_CLUSTER_ID"] ? env["NATS_CLUSTER_ID"] : defaultAppName;
    const nssClient = NSS.connect(clusterId, name, <NSS.StanOptions>{ nc: natsClient });
    const tId = setTimeout(() => reject(new Error(`Could not connect to the nats-streaming-server at ${natsHost}:${natsPort}!`)), 5*1000);
    nssClient.on("connect", () => {
      clearTimeout(tId);
      resolve(new NatsDriver(natsClient, nssClient));
    });
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

  subscribe(opts: ISubscribeOptions): Promise<IUnsubscribeOptions> {
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

    return Promise.resolve(<IUnsubscribeOptions>{
      unsubscribe: () => Promise.resolve(this.natsClient.unsubscribe(sId))
    });
  }

  private subscribePersistWithOptions(opts: ISubscribeOptions, subscribeOpts: NSS.SubscriptionOptions): Promise<IUnsubscribeOptions> {
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

    return Promise.resolve(<IUnsubscribeOptions>{ unsubscribe: () => Promise.resolve(subscription.unsubscribe()) });
  }

  subscribePersist(opts: ISubscribePersistOptions): Promise<IUnsubscribeOptions> {
    const subscriptionOpts = this.nssClient.subscriptionOptions();
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

  publishPersist(queue: string, message: string): Promise<void> {
    return new Promise<void>((resolve) => {
      this.nssClient.publish(queue, message);
      resolve();
    });
  }

  lastPersistMessage(queue: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const unsubscribeResult = this.subscribePersist(<ISubscribePersistOptions>{
        queue: queue,
        callback: (msg) => {
          unsubscribeResult
            .then((unsubscribeSettings) => unsubscribeSettings.unsubscribe)
            .then(() => resolve(msg));
        },
        timeoutInMs: 5 * 1000,
        timeoutCallback: () => reject(new Error("Fetching last persist message timed out!"))
      });
    });
  }
}
