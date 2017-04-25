import * as NATS from "nats";
import * as process from "process";
import * as zlib from "zlib";

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
  const queue = req.queue;
  const count = Number(req.count);

  for (let i = 0; i < count; i++) {
    client.publish(queue, `Pong #${i}`);
  }
});

client.subscribe("queueBloating", (msg) => {
  const req = JSON.parse(msg);
  const queue = req.queue;
  const length = Number(req.length);

  const payload = "0".repeat(length * 1000);
  zlib.gzip(Buffer.from(payload), (err, buf) => {
    if (err) {
      console.error(err);
      return;
    }

    client.publish(queue, buf.toString("base64"));
  });
});

// error handling
client.on("error", (err: NATS.NatsError) => console.error(`${err.code}: ${err.message}`));

// indicating activity
console.log("Subscribed to queues");
