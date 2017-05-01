import * as process from "process";
// import * as zlib from "zlib";
import * as NATS from "nats";
// import * as Stan from "node-nats-streaming";
import getNatsClient from "./nats-client";
import NssClient from "./nss-client";

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

const main = async () => {
  // connecting nats client
  const natsClient = getNatsClient(process.env);
  natsClient.on("error", (err: NATS.NatsError) => { throw err; });

  // connecting nss client
  const nssClient = new NssClient(natsClient, "ecp4", "ecp4");
  await nssClient.connect();

  await nssClient.close();
  nssClient.natsClient.close();
};
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
