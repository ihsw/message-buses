import { ConnectionInfo } from "./interfaces";
import { GetDriver } from "../message-drivers/NatsDriver";
import { MetricsCollector } from "../lib/MetricsCollector";
import run from "../lib/producer-app";
import { defaultAppName } from "../lib/helper";

export const ExpectedEnvVars: Array<string | ConnectionInfo> = [
  new ConnectionInfo("NATS_HOST", "NATS_PORT"),
  new ConnectionInfo("METRICS_HOST", "METRICS_PORT")
];
export default async (env: any): Promise<void> => {
  const driverName = "nats-producer";

  // connecting the metrics-collector
  const metricsCollector = new MetricsCollector(await GetDriver(`${driverName}-metrics-collector`, defaultAppName, {
    "NATS_HOST": env["METRICS_HOST"],
    "NATS_PORT": env["METRICS_PORT"]
  }));

  // connectin the message-driver
  const messageDriver = await GetDriver(driverName, defaultAppName, env);
  messageDriver.metricsCollector = metricsCollector;

  // running out the app
  run(messageDriver, true);
};
