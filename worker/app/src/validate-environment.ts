import * as net from "net";

import { CommandEnvVarList } from "./commands";
import { ConnectionInfo } from "./commands/interfaces";

// misc
const netConnect = (port: number, host: string): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const client = net.connect(port, host, () => resolve());
    client.on("error", reject);
  });
};

const main = async () => {
  // gathering command name
  let commandName = typeof process.argv[2] !== "undefined"
    ? process.argv[2]
    : "";
  if (commandName.length === 0) {
    throw new Error("Command expected!");
  }

  // parsing command env vars
  let commandEnvVars;
  let envVarNames: string[] = [];
  if (CommandEnvVarList[commandName]) {
    commandEnvVars = CommandEnvVarList[commandName];

    // gathering up expected env var names
    for (const commandEnvVar of commandEnvVars) {
      if (typeof commandEnvVar === "string") {
        envVarNames.push(commandEnvVar);
      } else if (commandEnvVar instanceof ConnectionInfo) {
        envVarNames = envVarNames.concat([commandEnvVar.host, commandEnvVar.port]);
      }
    }
  }

  // gathering env vars provided by process
  const envVarPairs = envVarNames.map((v) => <[string, string]>[v, process.env[v]]);

  // checking for missing ones
  const missingEnvVarPairs = envVarPairs.filter(([, v]) => typeof v === "undefined" || v.length === 0);
  if (missingEnvVarPairs.length > 0) {
    throw new Error(missingEnvVarPairs.map(([key]) => `${key} was missing`).join("\n"));
  }

  // formatting env var pairs
  const envVars = envVarPairs.reduce((envVars, value) => {
    envVars[value[0]] = value[1];
    return envVars;
  }, <{[key: string]: string}>{});

  // validating expected connection info against env vars
  if (commandEnvVars) {
    const commandConnectionInfos: ConnectionInfo[] = commandEnvVars.filter((v) => v instanceof ConnectionInfo);
    for (const connectionInfo of commandConnectionInfos) {
      const [host, port] = [envVars[connectionInfo.host], Number(envVars[connectionInfo.port])];
      try {
        await netConnect(port, host);
      } catch (err) {
        switch (err["code"]) {
          case "ENOTFOUND":
            throw new Error(`Host $${connectionInfo.host} (${host}) could not be found`);
          case "EHOSTUNREACH":
            throw new Error(`Host $${connectionInfo.host} (${host}) could not be reached`);
          case "ECONNREFUSED":
            throw new Error(`Host $${connectionInfo.host} (${host}) was not accessible at $${connectionInfo.port} (${port})`);
          default:
            throw err;
        }
      }
    }
  }
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
