import { GetDriver } from "../message-drivers/NatsDriver";
import { ConnectionInfo } from "./interfaces";
import getApp from "../lib/consumer-app";
import GetInflux from "../lib/influx";
import { defaultAppName } from "../lib/helper";

export const ExpectedEnvVars: Array<string | ConnectionInfo> = [
  "APP_PORT",
  new ConnectionInfo("NATS_HOST", "NATS_PORT"),
  new ConnectionInfo("INFLUX_HOST", "INFLUX_PORT")
];
export default async (env: any): Promise<void> => {
  // parsing env vars
  const appPort = Number(env["APP_PORT"]);

  // connecting
  const influx = await GetInflux(defaultAppName, env);
  const messageDriver = await GetDriver(influx, "nats-consumer", "ecp4", env);

  // generating an app
  const app = getApp(messageDriver, influx);

  // listening on app port
  app.listen(appPort);
};
