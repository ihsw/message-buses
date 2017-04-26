import * as process from "process";
import * as NATS from "nats";
import getApp from "./app";

// parsing env vars
const natsHost = process.env["NATS_HOST"];
const natsPort = Number(process.env["NATS_PORT"]);
const appPort = Number(process.env["APP_PORT"]);

// connecting
const client = NATS.connect(`nats://${natsHost}:${natsPort}`);
console.log(`Connected to NATS server ${natsHost}:${natsPort}`);

// generating an app
const app = getApp(client);

// error handling
client.on("error", (err: NATS.NatsError) => console.error(`${err.code}: ${err.message}`));

// listening on app port
app.listen(appPort, () => console.log(`Listening on ${appPort}`));
