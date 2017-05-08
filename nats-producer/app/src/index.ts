import * as process from "process";
import * as program from "commander";
import { NatsConsumer, NatsProducer, NssPopulate } from "./commands";

// program definition
program.version("0.0.1");

// populate action
program.command("nss-populate")
  .description("Populates NSS with RFM catalogs")
  .action(() => {
    NssPopulate(process.env)
      .then(() => {
        console.log("Filled NSS with RFM catalogs");
        process.exit(0);
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  });

// listening on queues for testing throughput
program.command("nats-producer")
  .description("Listens on queues for testing throughput")
  .action(() => {
    NatsProducer(process.env)
      .then(() => {
        console.log("Listening on queues");
        process.on("SIGINT", () => process.exit(0));
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  });

// listening on http for testing throughput
program.command("nats-consumer")
  .description("Listening on http for testing throughput")
  .action(() => {
    NatsConsumer(process.env)
      .then(() => {
        console.log(`Listening on ${process.env["APP_PORT"]}`);
        process.on("SIGINT", () => process.exit(0));
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  });

// parsing process args
program.parse(process.argv);
