import { test } from "ava";

import GetInflux from "../lib/influx";
import { defaultAppName } from "../lib/test-helper";
import { GetDriver } from "../message-drivers/NatsDriver";
import RfmManager from "../lib/rfm-manager";

let rfmManager: RfmManager;
test.before(async () => {
  const influx = await GetInflux(defaultAppName, process.env);
  const messageDriver = await GetDriver(influx, "nats-consumer-app-test", "ecp4", process.env);
  rfmManager = new RfmManager(messageDriver);
});

test("Rfm manager should persist", async (t) => {
  const storeId = 2301;
  const data = "Hello, world!";

  await rfmManager.persist(storeId, data);
  t.is(await rfmManager.fetch(storeId), data);
});
