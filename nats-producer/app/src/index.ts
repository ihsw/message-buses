import * as NATS from "nats";
import * as process from "process";

const client = NATS.connect(`nats://${process.env["NATS_HOST"]}:${process.env["NATS_PORT"]}`);

console.log("waiting for pings");
client.subscribe("queues", (msg) => {
  console.log(`responding to ping on ${msg}`);
  client.publish(msg, "Pong");
});
