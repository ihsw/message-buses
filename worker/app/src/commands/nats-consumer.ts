import { ConnectionInfo } from "./interfaces";
import { defaultAppName, getUniqueName } from "../lib/helper";
import run from "./consumer";

export const ExpectedEnvVars: Array<string | ConnectionInfo> = [
  "APP_PORT",
  new ConnectionInfo("NATS_HOST", "NATS_PORT"),
  new ConnectionInfo("METRICS_HOST", "METRICS_PORT")
];
export default async (env: any): Promise<void> => run(defaultAppName, getUniqueName("nats-consumer"), env);
