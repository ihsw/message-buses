import * as process from "process";
import * as zlib from "zlib";
import * as NATS from "nats";
import * as program from "commander";
import getNatsClient from "./nats-client";
import NssClient from "./nss-client";

const main = async () => {
  // connecting nats client
  const natsClient = getNatsClient(process.env);
  natsClient.on("error", (err: NATS.NatsError) => { throw err; });

  // connecting nss client
  const nssClient = new NssClient(natsClient, "ecp4", "ecp4");
  await nssClient.connect();

  // program definition
  program.version("0.0.1");

  // populate action
  program.command("nss-populate")
    .description("Populates NSS with RFM catalogs")
    .action(() => {
      // filling up nss with rfm catalogs
      console.log("Filling!");

      // closing out the connection
      nssClient.close().then(() => nssClient.natsClient.close());
    });

  // listening on queues for testing throughput
  program.command("nats-producer")
    .description("Listens on queues for testing throughput")
    .action(() => {
      console.log("Subscribing to queues");

      // setting up nats queues
      natsClient.subscribe("queues", (msg) => natsClient.publish(msg, "Pong"));

      natsClient.subscribe("queueWaiting", (msg) => {
        const req = JSON.parse(msg);
        const queue = req.queue;
        const count = Number(req.count);

        for (let i = 0; i < count; i++) {
          natsClient.publish(queue, `Pong #${i}`);
        }
      });

      natsClient.subscribe("queueBloating", (msg) => {
        const req = JSON.parse(msg);
        const queue = req.queue;
        const length = Number(req.length);

        const payload = "0".repeat(length * 1000);
        zlib.gzip(Buffer.from(payload), (err, buf) => {
          if (err) {
            console.error(err);
            return;
          }

          natsClient.publish(queue, buf.toString("base64"));
        });
      });
    });

  // parsing process args
  program.parse(process.argv);
};
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
