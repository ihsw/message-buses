import { GetDriver } from "../message-drivers";
import { GetNatsClient } from "../message-drivers/NatsDriver";
import { MetricsCollector } from "../lib/MetricsCollector";
import run from "../lib/producer-app";

export default async (driverName: string, driverClientId: string, env: any): Promise<void> => {
  // connecting the metrics-collector
  const metricsNatsClient = GetNatsClient(`${driverName}-metrics-collector`, env["METRICS_HOST"], Number(env["METRICS_PORT"]));
  const metricsCollector = new MetricsCollector(metricsNatsClient);
  metricsCollector.disabled = true;

  // connectin the message-driver
  const messageDriver = await GetDriver(driverName, driverClientId, env);
  messageDriver.metricsCollector = metricsCollector;

  // running out the app
  run(messageDriver, true);
};
