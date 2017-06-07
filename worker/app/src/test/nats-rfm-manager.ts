import { test } from "ava";

import { GetDriver, GetNatsClient } from "../message-drivers/NatsDriver";
import { MetricsCollector } from "../lib/MetricsCollector";
import RfmManager from "../lib/rfm-manager";

let rfmManager: RfmManager;
test.before(async () => {
  const driverName = "nats-rfm-manager-test";

  // connecting to the metrics collector
  const metricsNatsClient = GetNatsClient(`${driverName}-metrics-collector`, process.env["METRICS_HOST"], Number(process.env["METRICS_PORT"]));
  const metricsCollector = new MetricsCollector(metricsNatsClient);

  // connecting the message-driver
  const messageDriver = await GetDriver(driverName, process.env);
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
