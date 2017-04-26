import * as NATS from "nats";
import * as stan from "node-nats-streaming";
import * as process from "process";
// import * as zlib from "zlib";
import getNatsClient from "./nats-client";

// connecting
const client = getNatsClient(process.env);
const stanClient = stan.connect("ecp4", "ecp4", <stan.StanOptions>{ nc: client });

// setting up nats queues
// client.subscribe("queues", (msg) => client.publish(msg, "Pong"));

// client.subscribe("queueWaiting", (msg) => {
//   const req = JSON.parse(msg);
//   const queue = req.queue;
//   const count = Number(req.count);

//   for (let i = 0; i < count; i++) {
//     client.publish(queue, `Pong #${i}`);
//   }
// });

// client.subscribe("queueBloating", (msg) => {
//   const req = JSON.parse(msg);
//   const queue = req.queue;
//   const length = Number(req.length);

//   const payload = "0".repeat(length * 1000);
//   zlib.gzip(Buffer.from(payload), (err, buf) => {
//     if (err) {
//       console.error(err);
//       return;
//     }

//     client.publish(queue, buf.toString("base64"));
//   });
// });

// setting up nss queues
// stanClient.publish("foo", "Hello, world!");
for (let i = 0; i < 10; i++) {
  const opts = stanClient.subscriptionOptions();
  opts.setStartWithLastReceived();
  const subscription = stanClient.subscribe("foo", "foo");
  subscription.on("message", (msg) => {
    console.log(msg);
    subscription.unsubscribe();
  });
}

// error handling
client.on("error", (err: NATS.NatsError) => console.error(`${err.code}: ${err.message}`));

// indicating activity
console.log("Subscribed to queues");
