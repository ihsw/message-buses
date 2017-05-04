import * as process from "process";
import * as zlib from "zlib";
import * as fs from "fs";
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
  const nssClient = new NssClient(natsClient, "ecp4", "nats-producer");
  await nssClient.connect();

  return <SetupData>{ natsClient, nssClient };
};

// program definition
program.version("0.0.1");

const getFilenames = (dirPath: string): Promise<string[]> => {
  return new Promise<string[]>((resolve, reject) => {
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        return reject(err);
      }

      resolve(files);
    });
  });
};

const readFile = (path: string): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    fs.readFile(path, (err, data) => {
      if (err) {
        return reject(err);
      }

      resolve(data);
    });
  });
};

// populate action
program.command("nss-populate")
  .description("Populates NSS with RFM catalogs")
  .action(() => {
    const main = async (): Promise<void> => {
      // connecting
      const { nssClient } = await setup();

      // opening the rfm dir
      const rfmDir = `${process.cwd()}/CommonTestStore300`;
      const filenames = await getFilenames(rfmDir);
      const whitelistedStore = 2301;
      for (const filename of filenames) {
        const [, storeId] = filename.split("_");
        if (Number(storeId) !== whitelistedStore) {
          continue;
        }

        const fileContents = await readFile(`${rfmDir}/${filename}`);
        const publishId = await nssClient.publish(`store-file/${storeId}`, fileContents.toString("base64"));
        console.log(publishId);
      }
    };
    main()
      .then(() => process.exit(0))
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  });

// listening on queues for testing throughput
program.command("nats-producer")
  .description("Listens on queues for testing throughput")  .action(() => {
    const main = async (): Promise<void> => {
      // connecting
      const { natsClient } = await setup();
      natsClient.on("error", (err) => { throw err; });

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
    };
    main()
      .then(() => {
        console.log("Listening on queues");
        process.on("SIGINT", () => process.exit(0));
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  });

// parsing process args
program.parse(process.argv);
