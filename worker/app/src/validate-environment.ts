import * as net from "net";
import { CommandEnvVars } from "./commands";

// misc
const netConnect = (port: number, host: string): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const client = net.connect(port, host, () => resolve());
    client.on("error", reject);
  });
};

const main = async () => {
  // gathering command name
  const commandName = String(process.env["COMMAND"]);
  if (commandName.length === 0) {
    throw new Error("Command expected!");
  }

  // validating that env vars are available
  let envVarNames = [
    "NATS_HOST",
    "NATS_PORT"
  ];
  if (CommandEnvVars[commandName]) {
    envVarNames = envVarNames.concat(CommandEnvVars[commandName]);
  }
  const envVarPairs = envVarNames.map((v) => <[string, string]>[v, process.env[v]]);
  const missingEnvVarPairs = envVarPairs.filter(([, v]) => typeof v === "undefined" || v.length === 0);
  if (missingEnvVarPairs.length > 0) {
    throw new Error(missingEnvVarPairs.map(([key]) => `${key} was missing`).join("\n"));
  }

  const envVars = envVarPairs.reduce((envVars, value) => {
    envVars[value[0]] = value[1];
    return envVars;
  }, <{[key: string]: string}>{});

  // validating that the database port is accessible
  const dbPort = Number(envVars["NATS_PORT"]);
  try {
    await netConnect(dbPort, envVars["NATS_HOST"]);
  } catch (err) {
    switch (err["code"]) {
      case "ENOTFOUND":
        throw new Error(`Host ${envVars["NATS_HOST"]} could not be found`);
      case "EHOSTUNREACH":
        throw new Error(`Host ${envVars["NATS_HOST"]} could not be reached`);
      case "ECONNREFUSED":
        throw new Error(`Host ${envVars["NATS_HOST"]} was not accessible at ${dbPort}`);
      default:
        throw err;
    }
  }
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
