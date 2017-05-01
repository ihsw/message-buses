import * as process from "process";
import * as zlib from "zlib";
import * as NATS from "nats";
import * as program from "commander";
import getNatsClient from "./nats-client";
import NssClient from "./nss-client";

interface SetupData {
  natsClient: NATS.Client;
  nssClient: NssClient;
}
const setup = async (): Promise<SetupData> => {
  // connecting nats client
  const natsClient = getNatsClient(process.env);
  natsClient.on("error", (err: NATS.NatsError) => { throw err; });

  // connecting nss client
  const nssClient = new NssClient(natsClient, "ecp4", "ecp4");
  await nssClient.connect();

  return <SetupData>{ natsClient, nssClient };
};

interface MainData extends SetupData {
  natsSubscriptions?: number[];
}

// program definition
program.version("0.0.1");

// populate action
program.command("nss-populate")
  .description("Populates NSS with RFM catalogs")
  .action(() => {
    const main = async (): Promise<MainData> => {
      // connecting
      const { natsClient, nssClient } = await setup();

      // filling up nss with rfm catalogs
      console.log("Filling!");

      return { natsClient, nssClient };
    };
    main()
      .then(({ natsClient, nssClient }) => {
        nssClient.close().then(() => {
          natsClient.close();
          process.exit(0);
        });
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  });

// listening on queues for testing throughput
program.command("nats-producer")
  .description("Listens on queues for testing throughput")  .action(() => {
    const main = async (): Promise<MainData> => {
      // connecting
      const { natsClient, nssClient } = await setup();

      // setting up nats queues
      const natsSubscriptions: number[] = [];
      natsSubscriptions.push(natsClient.subscribe("queues", (msg) => natsClient.publish(msg, "Pong")));

      natsSubscriptions.push(natsClient.subscribe("queueWaiting", (msg) => {
        const req = JSON.parse(msg);
        const queue = req.queue;
        const count = Number(req.count);

        for (let i = 0; i < count; i++) {
          natsClient.publish(queue, `Pong #${i}`);
        }
      }));

      natsSubscriptions.push(natsClient.subscribe("queueBloating", (msg) => {
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
      }));

      return { natsClient, nssClient, natsSubscriptions };
    };
    main()
      .then(({ natsClient, nssClient, natsSubscriptions }) => {
        console.log("Listening on queues");

        process.on("SIGINT", () => {
          if (natsSubscriptions) {
            for (const sId of natsSubscriptions) {
              natsClient.unsubscribe(sId);
            }
          }

          nssClient.close()
            .then(() => {
              natsClient.close();
              process.exit(0);
            });
        });
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  });

// parsing process args
program.parse(process.argv);
