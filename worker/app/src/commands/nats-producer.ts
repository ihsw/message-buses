import { ConnectionInfo } from "./interfaces";
import { getUniqueName, defaultAppName } from "../lib/helper";
import run from "./producer";

export const ExpectedEnvVars: Array<string | ConnectionInfo> = [
  new ConnectionInfo("NATS_HOST", "NATS_PORT"),
  new ConnectionInfo("METRICS_HOST", "METRICS_PORT")
];
export default async (env: any): Promise<void> => run(defaultAppName, getUniqueName("nats-producer"), env);
