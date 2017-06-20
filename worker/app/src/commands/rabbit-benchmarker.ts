import { ConnectionInfo } from "./interfaces";
import { defaultAppName, getUniqueName } from "../lib/helper";
import run from "./benchmarker";

export const ExpectedEnvVars: Array<string | ConnectionInfo> = [
  new ConnectionInfo("RABBIT_HOST", "RABBIT_PORT"),
  new ConnectionInfo("METRICS_HOST", "METRICS_PORT")
];
export default async (env: any, duration: string, workload: string): Promise<void> => {
  return run(defaultAppName, getUniqueName("rabbit-benchmarker"), env, duration, workload);
};
