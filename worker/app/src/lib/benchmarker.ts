import * as process from "process";

import * as parseDuration from "parse-duration";

import { ConnectionInfo } from "../commands/interfaces";
import { IMessageDriver } from "../message-drivers/IMessageDriver";
import { MetricsCollector } from "../lib/MetricsCollector";

export const ExpectedEnvVars: Array<string | ConnectionInfo> = [
  new ConnectionInfo("NATS_HOST", "NATS_PORT"),
  new ConnectionInfo("METRICS_HOST", "METRICS_PORT")
];
export default async (messageDriver: IMessageDriver, metricsCollector: MetricsCollector, duration: string): Promise<void> => {
  console.log(messageDriver.constructor.name);
  console.log(metricsCollector.constructor.name);

  const parsedDuration: number = parseDuration(duration);
  const startTime = process.hrtime();
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      const diff = process.hrtime(startTime);
      const executionTimeInMs = Math.round((diff[0]*1e3 + diff[1]/1e6) * 10) / 10;
      console.log(`Executed in ${executionTimeInMs}ms`);
      resolve();
    }, parsedDuration);
  });
};
