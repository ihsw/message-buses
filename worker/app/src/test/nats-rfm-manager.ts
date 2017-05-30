import { test } from "ava";

import { GetDriver } from "../message-drivers/NatsDriver";
import { MetricsCollector } from "../lib/MetricsCollector";
import RfmManager from "../lib/rfm-manager";
import { defaultAppName } from "../lib/test-helper";

let rfmManager: RfmManager;
test.before(async () => {
  const driverName = "nats-rfm-manager-test";

  // connecting to the metrics collector
  const metricsCollector = new MetricsCollector(await GetDriver(`${driverName}-metrics-collector`, defaultAppName, {
    "NATS_HOST": process.env["METRICS_HOST"],
    "NATS_PORT": process.env["METRICS_PORT"]
  }));

  // connecting the message-driver
  const messageDriver = await GetDriver(driverName, defaultAppName, process.env);
  messageDriver.metricsCollector = metricsCollector;

  // instantiating the rfm manager
  rfmManager = new RfmManager(messageDriver);
});

test("Rfm manager should persist", async (t) => {
  const storeId = 2301;
  const data = "Hello, world!";

  await rfmManager.persist(storeId, data);
  t.is(await rfmManager.fetch(storeId), data);
});
