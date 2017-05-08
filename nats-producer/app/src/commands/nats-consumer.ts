import { setup } from "../lib/helper";
import getApp from "../lib/nats-consumer-app";

export default async (env: any): Promise<void> => {
  // parsing env vars
  const appPort = Number(env["APP_PORT"]);

  // connecting
  const { natsClient, nssClient } = await setup("nats-producer", env);
  natsClient.on("error", (err) => { throw err; });

  // generating an app
  const app = getApp(natsClient, nssClient);

  // listening on app port
  app.listen(appPort);
};
