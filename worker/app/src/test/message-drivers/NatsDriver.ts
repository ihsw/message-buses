import * as process from "process";

import { test } from "ava";

import { GetDriver } from "../../message-drivers/NatsDriver";

test("Driver should publish", async (t) => {
  const messageDriver = await GetDriver("nats-driver-test", "ecp4", process.env);
  await messageDriver.publish("publish-test", "Hello, world!");

  t.pass();
});
