import * as process from "process";
import * as cluster from "cluster";
import * as os from "os";

import * as program from "commander";

import { NatsConsumer, NatsProducer, NssPopulate } from "./commands";

// program definition
program.version("0.0.1");

// populate action
program.command("nss-populate")
  .description("Populates NSS with RFM catalogs")
  .action(() => {
    NssPopulate(process.env, process.cwd())
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

// parsing process args and optionally clustering
const main = () => program.parse(process.argv);
const isClustering = !!process.env["IS_CLUSTERING"];
if (!isClustering) {
  main();
} else {
  if (cluster.isMaster) {
    console.log(`Starting master ${process.pid}`);

    for (let i = 0; i < os.cpus().length; i++) {
      cluster.fork();
    }

    cluster.on("exit", (worker, code) => {
      console.log(`Worker ${worker.process.pid} died with code ${code}`);
    });
  } else {
    console.log(`Starting worker ${process.pid}`);

    main();
  }
}

// optionally dumping help when no command is provided
if (process.argv.slice(2).length === 0) {
  program.outputHelp();
  process.exit(1);
}

// adding unhandled promise handler, for extreme levels of bullshit
process.on("unhandledRejection", (err) => console.error(err.message));
