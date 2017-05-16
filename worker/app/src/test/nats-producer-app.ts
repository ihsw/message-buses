import * as process from "process";

import { test } from "ava";

import { ISubscribePersistOptions } from "../message-drivers/IMessageDriver";
import { GetDriver, NatsDriver } from "../message-drivers/NatsDriver";
import GetInflux from "../lib/influx";
import { getUniqueName } from "../lib/helper";
import { defaultAppName } from "../lib/test-helper";
import run from "../lib/producer-app";

let messageDriver: NatsDriver;
test.before(async () => {
  const influx = await GetInflux(defaultAppName, process.env);
  messageDriver = await GetDriver(influx, "nats-producer-app-test", "ecp4", process.env);
});

test("Producer app should response on queues queue", async (t) => {
  // starting up the queues
  run(messageDriver);

  // generating a unique response queue name
  const queue = getUniqueName("queues-test");

  return new Promise<void>((resolve, reject) => {
    const unsubscribe = messageDriver.subscribe(<ISubscribePersistOptions>{
      queue: queue,
      callback: (msg) => {
        t.is(msg, "Pong");
        unsubscribe();
        resolve();
      },
      timeoutInMs: 2 * 1000,
      timeoutCallback: () => {
        unsubscribe();
        reject(new Error(`Queues subscription timed out!`));
      }
    });

    messageDriver.publish("queues", queue);
  });
});
