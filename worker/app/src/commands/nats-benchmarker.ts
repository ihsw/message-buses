import { ConnectionInfo } from "./interfaces";
import { GetDriver, GetNatsClient } from "../message-drivers/NatsDriver";
import { MetricsCollector } from "../lib/MetricsCollector";
import run from "../lib/benchmarker";
import { getUniqueName } from "../lib/helper";

export const ExpectedEnvVars: Array<string | ConnectionInfo> = [
  new ConnectionInfo("NATS_HOST", "NATS_PORT"),
  new ConnectionInfo("METRICS_HOST", "METRICS_PORT")
];
export default async (env: any, duration: string, workload: string): Promise<void> => {
  const driverName = getUniqueName("benchmarker");

  // connecting the metrics-collector
  const metricsNatsClient = GetNatsClient(`${driverName}-metrics-collector`, env["METRICS_HOST"], Number(env["METRICS_PORT"]));
  const metricsCollector = new MetricsCollector(metricsNatsClient);
  metricsCollector.disabled = true;

  // connecting the message-driver
  const messageDriver = await GetDriver(driverName, env);
  messageDriver.metricsCollector = metricsCollector;

  // running it out
  return run(messageDriver, metricsCollector, duration, workload);
};
