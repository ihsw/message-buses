import * as NATS from "nats";
import * as process from "process";

const client = NATS.connect(`nats://${process.env["NATS_HOST"]}:${process.env["NATS_PORT"]}`);

client.subscribe("queues", (msg) => client.publish(msg, "Pong"));

console.log("Waiting for pings on queue 'queues'");
