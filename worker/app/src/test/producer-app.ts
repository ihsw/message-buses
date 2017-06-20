import * as process from "process";
import * as zlib from "zlib";

import { test } from "ava";

import { GetDriver } from "../message-drivers";
import { IMessageDriver, ISubscribePersistOptions } from "../message-drivers/IMessageDriver";
import { GetNatsClient } from "../message-drivers/NatsDriver";
import { MetricsCollector } from "../lib/MetricsCollector";
import { getUniqueName, defaultAppName } from "../lib/helper";
import run from "../lib/producer-app";

let messageDriver: IMessageDriver;
test.before(async () => {
  const driverName = defaultAppName;

  // connecting to the metrics collector
  const metricsNatsClient = GetNatsClient(`${driverName}-metrics-collector`, process.env["METRICS_HOST"], Number(process.env["METRICS_PORT"]));
  const metricsCollector = new MetricsCollector(metricsNatsClient);

  // connecting the message-driver
  messageDriver = await GetDriver(driverName, process.env);
  messageDriver.metricsCollector = metricsCollector;

  // starting up the queues
  run(messageDriver, false);
});

test("Producer app should respond on queues queue", async (t) => {
  // generating a unique response queue name
  const queue = getUniqueName("queues-test");

  return new Promise<void>((resolve, reject) => {
    const unsubscribeResult = messageDriver.subscribe(<ISubscribePersistOptions>{
      queue: queue,
      callback: (msg) => {
        unsubscribeResult.then((unsubscribe) => unsubscribe).then(() => {
          t.is(msg, "Pong");
          resolve();
        });
      },
      timeoutInMs: 2 * 1000,
      timeoutCallback: () => {
        unsubscribeResult
          .then((unsubscribe) => unsubscribe)
          .then(() => reject(new Error(`Queues subscription timed out!`)));
      }
    });

    messageDriver.publish("queues", queue);
  });
});

test("Producer app should respond on queueWaiting queue", async (t) => {
  // generating a unique response queue name
  const queue = getUniqueName("queues-waiting-test");

  return new Promise<void>((resolve, reject) => {
    const count = 10;

    let messageCount = 0;
    const unsubscribeResult = messageDriver.subscribe(<ISubscribePersistOptions>{
      queue: queue,
      callback: (msg) => {
        t.is(msg, `Pong #${messageCount}`);

        messageCount += 1;
        const isFinished = messageCount === count;

        if (isFinished) {
          unsubscribeResult
            .then((unsubscribe) => unsubscribe)
            .then(() => resolve());
        }
      },
      timeoutInMs: 2 * 1000,
      timeoutCallback: () => {
        unsubscribeResult
          .then((unsubscribe) => unsubscribe)
          .then(() => reject(new Error(`Queues subscription timed out!`)));
      }
    });

    messageDriver.publish("queueWaiting", JSON.stringify({
      queue: queue,
      count: count
    }));
  });
});

test("Producer app should respond on queueBloating queue", async (t) => {
  // generating a unique response queue name
  const queue = getUniqueName("queue-bloating-test");

  return new Promise<void>((resolve, reject) => {
    const length = 1;

    const expectedResponse = "0".repeat(length * 1000);
    const unsubscribeResult = messageDriver.subscribe(<ISubscribePersistOptions>{
      queue: queue,
      callback: (msg) => {
        unsubscribeResult.then((unsubscribe) => unsubscribe).then(() => {
          const msgBuf = Buffer.from(msg, "base64");
          zlib.gunzip(msgBuf, (err, buf) => {
            if (err) {
              return reject(err);
            }

            t.is(buf.toString(), expectedResponse, "Bloated queue should respond with appropriate bloated message");
            resolve();
          });
        });
      },
      timeoutInMs: 2 * 1000,
      timeoutCallback: () => {
        unsubscribeResult
          .then((unsubscribe) => unsubscribe)
          .then(() => reject(new Error(`Queues subscription timed out!`)));
      }
    });

    messageDriver.publish("queueBloating", JSON.stringify({
      queue: queue,
      length: length
    }));
  });
});