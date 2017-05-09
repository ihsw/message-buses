import * as process from "process";

import { test } from "ava";

import {
  IMessageDriver,
  ISubscribeOptions,
  ISubscribePersistOptions
} from "../../message-drivers/IMessageDriver";
import { GetDriver } from "../../message-drivers/NatsDriver";

let messageDriver: IMessageDriver;
test.before(async () => {
  messageDriver = await GetDriver("nats-driver-test", "ecp4", process.env);
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

test("Driver should unsubscribe", async (t) => {
  const queue = "unsubscribe-test";
  const sId = messageDriver.subscribe(<ISubscribeOptions>{ queue: queue });
  messageDriver.unsubscribe(sId);

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
    messageDriver.subscribePersist(<ISubscribePersistOptions>{
      queue: queue,
      callback: (receivedMsg) => {
        t.is(receivedMsg, msg, "Message from subscription matches published message");

        resolve();
      },
      timeoutInMs: 2 * 1000,
      timeoutCallback: () => reject(new Error(`Subscription timed out!`))
    });

    // publishing out a message
    messageDriver.publishPersist(queue, msg).catch(reject);
  });
});

test("Driver should get last persist message", async (t) => {
  const queue = "last-persist-message-test";
  const msg = "Hello, world!";

  await messageDriver.publishPersist(queue, msg);
  const receivedMsg = await messageDriver.lastPersistMessage(queue);
  t.is(msg, receivedMsg, "Last message received did not match published one");
});
