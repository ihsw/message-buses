import { ConnectionInfo } from "./interfaces";
import { defaultAppName, getUniqueName } from "../lib/helper";
import run from "./benchmarker";

export const ExpectedEnvVars: Array<string | ConnectionInfo> = [
  new ConnectionInfo("NATS_HOST", "NATS_PORT"),
  new ConnectionInfo("METRICS_HOST", "METRICS_PORT")
];
export default async (env: any, duration: string, workload: string): Promise<void> => {
  return run(defaultAppName, getUniqueName("nats-benchmarker"), env, duration, workload);
};
