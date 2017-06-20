import { ConnectionInfo } from "./interfaces";
import { getUniqueName, defaultAppName } from "../lib/helper";
import run from "./producer";

export const ExpectedEnvVars: Array<string | ConnectionInfo> = [
  new ConnectionInfo("RABBIT_HOST", "RABBIT_PORT"),
  new ConnectionInfo("METRICS_HOST", "METRICS_PORT")
];
export default async (env: any): Promise<void> => run(defaultAppName, getUniqueName("rabbit-producer"), env);
