import { ConnectionInfo } from "./interfaces";
import { GetDriver, GetNatsClient } from "../message-drivers/NatsDriver";
import { MetricsCollector } from "../lib/MetricsCollector";
import run from "../lib/producer-app";
import { getUniqueName } from "../lib/helper";

export const ExpectedEnvVars: Array<string | ConnectionInfo> = [
  new ConnectionInfo("NATS_HOST", "NATS_PORT"),
  new ConnectionInfo("METRICS_HOST", "METRICS_PORT")
];
export default async (env: any): Promise<void> => {
  const driverName = getUniqueName("nats-producer");

  // connecting the metrics-collector
  const metricsNatsClient = GetNatsClient(`${driverName}-metrics-collector`, env["METRICS_HOST"], Number(env["METRICS_PORT"]));
  const metricsCollector = new MetricsCollector(metricsNatsClient);
  metricsCollector.disabled = true;

  // connectin the message-driver
  const messageDriver = await GetDriver(driverName, env);
  messageDriver.metricsCollector = metricsCollector;

  // running out the app
  run(messageDriver, true);
};
