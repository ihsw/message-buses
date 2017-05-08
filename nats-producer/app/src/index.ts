import * as process from "process";
import * as program from "commander";
import nssPopulateMain from "./commands/nss-populate";
import natsProducer from "./commands/nats-producer";

// program definition
program.version("0.0.1");

// populate action
program.command("nss-populate")
  .description("Populates NSS with RFM catalogs")
  .action(() => {
    nssPopulateMain()
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
  .description("Listens on queues for testing throughput")  .action(() => {
    natsProducer()
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
