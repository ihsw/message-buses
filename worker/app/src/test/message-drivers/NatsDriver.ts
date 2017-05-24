import * as process from "process";

import { test } from "ava";

import GetInflux from "../../lib/influx";
import { defaultAppName } from "../../lib/test-helper";

import {
  IMessageDriver,
  ISubscribeOptions,
  ISubscribePersistOptions
} from "../../message-drivers/IMessageDriver";
import { GetDriver } from "../../message-drivers/NatsDriver";

let messageDriver: IMessageDriver;
test.before(async () => {
  const influx = await GetInflux(defaultAppName, process.env);
  messageDriver = await GetDriver(influx, "nats-driver-test", "ecp4", process.env);
});

test("Driver should publish", async (t) => {
  t.pass();

  return messageDriver.publish("publish-test", "Hello, world!");
});

test("Driver should subscribe", async (t) => {
  return new Promise<void>((resolve, reject) => {
    const queue = "subscribe-test";
    const msg = "Hello, world!";

    // setting up a subscribe handler
    messageDriver.subscribe(<ISubscribeOptions>{
      queue: queue,
      callback: (receivedMsg) => {
        t.is(receivedMsg, msg, "Message from subscription matches published message");

        resolve();
      },
      timeoutInMs: 2 * 1000,
      timeoutCallback: (sId) => reject(new Error(`Subscription ${sId} timed out!`))
    });

    // publishing out a message
    messageDriver.publish(queue, msg).catch(reject);
  });
});

test("Driver should support queue grouping", async (t) => {
  return new Promise<void>((resolve, reject) => {
    const queue = "subscribe-group-test";
    const msg = "Hello, world!";

    // misc
    const handlerCount = 3;
    
    // setting up a timeout for when the subscribers do not receive enough messages
    let receivedCount = 0;
    setTimeout(() => {
      if (receivedCount === 0) {
        reject(new Error("Did not receive any messages!"));

        return;
      } else if (receivedCount > handlerCount) {
        if (receivedCount === (handlerCount * handlerCount)) {
          reject(new Error(`Received square of expected message count (${receivedCount}), did you forget to set up parallel subscribers?`));
        } else {
          reject(new Error(`Received too many messages: ${receivedCount}`));
        }

        return;
      } else if (receivedCount === handlerCount) {
        resolve();

        return;
      }

      reject(new Error("Did not receive enough messages!"));
    }, 5 * 1000);

    // setting up multiple subscribe handlers
    for (let i = 0; i < handlerCount; i++) {
      (() => {
        const unsubscribe = messageDriver.subscribe(<ISubscribeOptions>{
          queue: queue,
          parallel: true,
          callback: (receivedMsg) => {
            t.is(receivedMsg, msg, "Message from subscription matches published message");
            receivedCount += 1;

            unsubscribe();
          },
          timeoutInMs: 2 * 1000,
          timeoutCallback: (sId) => reject(new Error(`Subscription ${sId} timed out!`))
        });
      })();
    }

    // publishing out a series of messages with the expectation that different handlers receive it
    for (let i = 0; i < handlerCount; i++) {
      messageDriver.publish(queue, msg).catch(reject);
    }
  });
});

test("Driver should timeout on non-existent subscription", async (t) => {
  return new Promise<void>((resolve, reject) => {
    const queue = "non-existent-subscribe-test";

    // setting up a subscribe handler
    const unsubscribe = messageDriver.subscribe(<ISubscribeOptions>{
      queue: queue,
      callback: () => {
        unsubscribe();
        reject(new Error("Subscription called callback when it should have failed!"));
      },
      timeoutInMs: 2 * 1000,
      timeoutCallback: () => {
        unsubscribe();
        t.pass();
        resolve();
      }
    });
  });
});

test("Driver should unsubscribe", async (t) => {
  const queue = "unsubscribe-test";
  const unsubscribe = messageDriver.subscribe(<ISubscribeOptions>{ queue: queue });
  unsubscribe();

  t.pass();
});

test("Driver should publish persist", async (t) => {
  t.pass();

  return messageDriver.publishPersist("publish-test", "Hello, world!");
});

test("Driver should subscribe persist", async (t) => {
  return new Promise<void>((resolve, reject) => {
    const queue = "subscribe-persist-test";
    const msg = "Hello, world!";

    // setting up a subscribe handler
    const unsubscribe = messageDriver.subscribePersist(<ISubscribePersistOptions>{
      queue: queue,
      callback: (receivedMsg) => {
        unsubscribe();
        t.is(receivedMsg, msg, "Message from subscription matches published message");

        resolve();
      },
      timeoutInMs: 2 * 1000,
      timeoutCallback: () => {
        unsubscribe();
        reject(new Error("Subscription timed out!"));
      }
    });

    // publishing a message
    messageDriver.publishPersist(queue, msg).catch(reject);
  });
});

test("Driver should timeout on non-existent persistent subscription", async (t) => {
  return new Promise<void>((resolve, reject) => {
    const queue = "non-existent-subscribe-persist-test";

    // setting up a subscribe handler
    const unsubscribe = messageDriver.subscribePersist(<ISubscribePersistOptions>{
      queue: queue,
      callback: () => {
        unsubscribe();
        reject(new Error("Subscription against non-existent persistent queue called callback!"));
      },
      timeoutInMs: 2 * 1000,
      timeoutCallback: () => {
        unsubscribe();
        t.pass();
        resolve();
      }
    });
  });
});

test("Driver should get last persist message", async (t) => {
  const queue = "last-persist-message-test";
  const msg = "Hello, world!";

  await messageDriver.publishPersist(queue, msg);
  const receivedMsg = await messageDriver.lastPersistMessage(queue);
  t.is(msg, receivedMsg, "Last message received did not match published one");
});
