import { ConnectionInfo } from "../commands/interfaces";
import { IMessageDriver } from "../message-drivers/IMessageDriver";
import { MetricsCollector } from "../lib/MetricsCollector";

export const ExpectedEnvVars: Array<string | ConnectionInfo> = [
  new ConnectionInfo("NATS_HOST", "NATS_PORT"),
  new ConnectionInfo("METRICS_HOST", "METRICS_PORT")
];
export default (messageDriver: IMessageDriver, metricsCollector: MetricsCollector) => {
  console.log("Hello, world!");
  console.log(messageDriver.constructor.name);
  console.log(metricsCollector.constructor.name);
};
