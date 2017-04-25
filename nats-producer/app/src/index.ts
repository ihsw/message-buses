import * as NATS from "nats";
import * as process from "process";

// parsing env vars
const natsHost = process.env["NATS_HOST"];
const natsPort = Number(process.env["NATS_PORT"]);

// connecting
const client = NATS.connect(`nats://${natsHost}:${natsPort}`);
console.log(`Connected to NATS server ${natsHost}:${natsPort}`);

// setting up queues
client.subscribe("queues", (msg) => client.publish(msg, "Pong"));

client.subscribe("queueWaiting", (msg) => {
  const req = JSON.parse(msg);
  const queue = req.params.queue;
  const count = Number(req.params.count);

  for (let i = 0; i < count; i++) {
    client.publish(queue, "Pong");
  }
});

// indicating activity
console.log("Subscribed to queues");
