import { GetDriver } from "../message-drivers/NatsDriver";
import { ConnectionInfo } from "./interfaces";
import getApp from "../lib/consumer-app";

export const ExpectedEnvVars: Array<string | ConnectionInfo> = [
  "APP_PORT",
  new ConnectionInfo("NATS_HOST", "NATS_PORT")
];
export default async (env: any): Promise<void> => {
  // parsing env vars
  const appPort = Number(env["APP_PORT"]);

  // connecting
  const messageDriver = await GetDriver("nats-consumer", "ecp4", env);

  // generating an app
  const app = getApp(messageDriver);

  // listening on app port
  app.listen(appPort);
};
