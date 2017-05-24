import * as process from "process";
import * as zlib from "zlib";

import { test } from "ava";

import { ISubscribePersistOptions } from "../message-drivers/IMessageDriver";
import { GetDriver, NatsDriver } from "../message-drivers/NatsDriver";
import GetInflux from "../lib/influx";
import { getUniqueName } from "../lib/helper";
import { defaultAppName } from "../lib/test-helper";
import run from "../lib/producer-app";

let messageDriver: NatsDriver;
test.before(async () => {
  // connecting to influx and the message-driver
  const influx = await GetInflux(defaultAppName, process.env);
  messageDriver = await GetDriver(influx, "nats-producer-app-test", "ecp4", process.env);

  // starting up the queues
  run(messageDriver, false);
});

test("Producer app should respond on queues queue", async (t) => {
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

test("Producer app should respond on queueWaiting queue", async (t) => {
  // generating a unique response queue name
  const queue = getUniqueName("queues-waiting-test");

  return new Promise<void>((resolve, reject) => {
    const count = 10;

    let messageCount = 0;
    const unsubscribe = messageDriver.subscribe(<ISubscribePersistOptions>{
      queue: queue,
      callback: (msg) => {
        t.is(msg, `Pong #${messageCount}`);

        messageCount += 1;
        const isFinished = messageCount === count;

        if (isFinished) {
          unsubscribe();
          resolve();
        }
      },
      timeoutInMs: 2 * 1000,
      timeoutCallback: () => {
        unsubscribe();
        reject(new Error(`Queues subscription timed out!`));
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
    const unsubscribe = messageDriver.subscribe(<ISubscribePersistOptions>{
      queue: queue,
      callback: (msg) => {
        const msgBuf = Buffer.from(msg, "base64");
        zlib.gunzip(msgBuf, (err, buf) => {
          if (err) {
            return reject(err);
          }

          t.is(buf.toString(), expectedResponse, "Bloated queue should respond with appropriate bloated message");
          resolve();
        });
      },
      timeoutInMs: 2 * 1000,
      timeoutCallback: () => {
        unsubscribe();
        reject(new Error(`Queues subscription timed out!`));
      }
    });

    messageDriver.publish("queueBloating", JSON.stringify({
      queue: queue,
      length: length
    }));
  });
});
