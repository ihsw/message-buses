import * as process from "process";
import * as NATS from "nats";
import getApp from "./app";
import getNatsClient from "./nats-client";

// parsing env vars
const appPort = Number(process.env["APP_PORT"]);

// connecting
const client = getNatsClient(process.env);
console.log("Connected to NATS server");

// generating an app
const app = getApp(client);

// error handling
client.on("error", (err: NATS.NatsError) => console.error(`${err.code}: ${err.message}`));

// listening on app port
app.listen(appPort, () => console.log(`Listening on ${appPort}`));
