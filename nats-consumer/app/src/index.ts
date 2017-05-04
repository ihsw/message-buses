import * as process from "process";
import getApp, { setup } from "./app";

// parsing env vars
const appPort = Number(process.env["APP_PORT"]);

// main
const main = async () => {
  // connecting
  const { natsClient, nssClient } = await setup();
  natsClient.on("error", (err) => { throw err; });

  // generating an app
  const app = getApp(natsClient, nssClient);

  // listening on app port
  app.listen(appPort, () => console.log(`Listening on ${appPort}`));
};
main()
  .then(() => process.on("SIGINT", () => process.exit(0)))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
