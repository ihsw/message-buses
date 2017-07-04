import * as process from "process";
import * as zlib from "zlib";

import { test } from "ava";
import * as parseDuration from "parse-duration";

import { GetDriver } from "../message-drivers";
import { IMessageDriver, ISubscribePersistOptions } from "../message-drivers/IMessageDriver";
import { GetNatsClient } from "../message-drivers/NatsDriver";
import { MetricsCollector } from "../lib/MetricsCollector";
import { getUniqueName, defaultAppName } from "../lib/helper";
import run from "../lib/producer-app";

let messageDriver: IMessageDriver;
test.before(async () => {
  const driverName = "producer-app-test";

  // connecting to the metrics collector
  const metricsNatsClient = GetNatsClient(`${driverName}-metrics-collector`, process.env["METRICS_HOST"], Number(process.env["METRICS_PORT"]));
  const metricsCollector = new MetricsCollector(metricsNatsClient);

  // connecting the message-driver
  messageDriver = await GetDriver(defaultAppName, driverName, process.env);
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
        unsubscribeResult
          .then((unsubscribeSettings) => unsubscribeSettings.unsubscribe)
          .then(() => {
            t.is(msg, "Pong");
            resolve();
          })
          .catch(reject);
      },
      timeoutInMs: 2 * 1000,
      timeoutCallback: () => {
        unsubscribeResult
          .then((unsubscribeSettings) => unsubscribeSettings.unsubscribe)
          .then(() => reject(new Error(`Queues subscription timed out!`)))
          .catch(reject);
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
    const expectedResults = (new Array(count)).map((_, i) => `Pong #${i}`);
    const unsubscribeResult = messageDriver.subscribe(<ISubscribePersistOptions>{
      queue: queue,
      callback: (msg) => {
        expectedResults.splice(expectedResults.indexOf(msg), 1);

        messageCount += 1;
        const isFinished = messageCount === count;

        if (isFinished) {
          t.is(expectedResults.length, 0);

          unsubscribeResult
            .then((unsubscribeSettings) => unsubscribeSettings.unsubscribe)
            .then(() => resolve())
            .catch(reject);
        }
      },
      timeoutInMs: 2 * 1000,
      timeoutCallback: () => {
        unsubscribeResult
          .then((unsubscribeSettings) => unsubscribeSettings.unsubscribe)
          .then(() => reject(new Error(`Queues subscription timed out!`)))
          .catch(reject);
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
          .then((unsubscribeSettings) => unsubscribeSettings.unsubscribe)
          .then(() => reject(new Error(`Queues subscription timed out!`)))
          .catch(reject);
      }
    });

    messageDriver.publish("queueBloating", JSON.stringify({
      queue: queue,
      length: length
    })).catch(reject);
  });
});

test("Producer app should respond on queueDuration queue", async (t) => {
  // generating a unique response queue name
  const queue = getUniqueName("queue-duration-test");

  return new Promise<void>((resolve, reject) => {
    const duration: number = parseDuration("5s");

    const tId = setTimeout(() => reject(new Error("Test timed out!")), 5*1000);

    const unsubscribeResult = messageDriver.subscribe(<ISubscribePersistOptions>{
      queue: queue,
      callback: (msg) => {
        clearTimeout(tId);

        if (msg === "Pong") {
          return;
        }

        unsubscribeResult.then((unsubscribeSettings) => unsubscribeSettings.unsubscribe)
          .then(() => {
            t.pass();
            resolve();
          })
          .catch(reject);
      },
      timeoutInMs: 2 * 1000,
      timeoutCallback: () => {
        clearTimeout(tId);

        unsubscribeResult
          .then((unsubscribeSettings) => unsubscribeSettings.unsubscribe)
          .then(() => reject(new Error(`Queues subscription timed out!`)))
          .catch(reject);
      }
    });

    messageDriver.publish("queueDuration", JSON.stringify({
      queue: queue,
      duration: duration
    })).catch(reject);
  });
});
