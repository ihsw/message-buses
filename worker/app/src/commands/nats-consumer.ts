import { ConnectionInfo } from "./interfaces";
import { GetDriver, GetNatsClient } from "../message-drivers/NatsDriver";
import { MetricsCollector } from "../lib/MetricsCollector";
import getApp from "../lib/consumer-app";
import { defaultAppName } from "../lib/helper";

export const ExpectedEnvVars: Array<string | ConnectionInfo> = [
  "APP_PORT",
  new ConnectionInfo("NATS_HOST", "NATS_PORT"),
  new ConnectionInfo("METRICS_HOST", "METRICS_PORT")
];
export default async (env: any): Promise<void> => {
  // parsing env vars
  const appPort = Number(env["APP_PORT"]);

  const driverName = "nats-consumer";

  // connecting the metrics-collector
  const metricsNatsClient = GetNatsClient(`${driverName}-metrics-collector`, env["METRICS_HOST"], Number(env["METRICS_PORT"]));
  const metricsCollector = new MetricsCollector(metricsNatsClient);

  // connectin the message-driver
  const messageDriver = await GetDriver(driverName, defaultAppName, env);
  messageDriver.metricsCollector = metricsCollector;

  // generating an app
  const app = getApp(messageDriver, metricsCollector);

  // listening on app port
  app.listen(appPort);
};
