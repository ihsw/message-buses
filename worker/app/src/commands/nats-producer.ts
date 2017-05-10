import { ConnectionInfo } from "./interfaces";
import { GetDriver } from "../message-drivers/NatsDriver";
import GetInflux from "../lib/influx";
import run from "../lib/producer-app";
import { defaultAppName } from "../lib/helper";

export const ExpectedEnvVars: Array<string | ConnectionInfo> = [
  new ConnectionInfo("NATS_HOST", "NATS_PORT"),
  new ConnectionInfo("INFLUX_HOST", "INFLUX_PORT")
];
export default async (env: any): Promise<void> => {
  // connecting
  const influx = await GetInflux(defaultAppName, env);
  const messageDriver = await GetDriver(influx, "nats-producer", "ecp4", env);

  // running out the app
  run(messageDriver);
};
