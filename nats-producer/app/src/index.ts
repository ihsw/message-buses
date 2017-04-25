import * as NATS from "nats";
import * as process from "process";

const client = NATS.connect(`nats://${process.env["NATS_HOST"]}:${process.env["NATS_PORT"]}`);

for (let i = 0; i < 10; i++) {
  client.publish("foo", `Hello, world #${i}!`);
}

client.close();
