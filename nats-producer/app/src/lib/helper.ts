import * as fs from "fs";
import * as NATS from "nats";
import * as uuid from "uuid";
import NssClient from "./nss-client";
import getNatsClient from "./nats-client";

interface SetupData {
  natsClient: NATS.Client;
  nssClient: NssClient;
}
export const setup = async (name: string, env: any): Promise<SetupData> => {
  // connecting nats client
  const natsClient = getNatsClient(name, env);
  natsClient.on("error", (err: NATS.NatsError) => { throw err; });

  // connecting nss client
  const nssClient = new NssClient(natsClient, "ecp4", name);
  await nssClient.connect();

  return <SetupData>{ natsClient, nssClient };
};

export const getFilenames = (dirPath: string): Promise<string[]> => {
  return new Promise<string[]>((resolve, reject) => {
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        return reject(err);
      }

      resolve(files);
    });
  });
};

export const readFile = (path: string): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    fs.readFile(path, (err, data) => {
      if (err) {
        return reject(err);
      }

      resolve(data);
    });
  });
};

export const getUniqueName = (name: string): string => {
  if (name.length === 0) {
    throw new Error("Name must not be blank");
  }

  if (/[\w\d\-]/.test(name) === false) {
    throw new Error("Name must be alphanumeric characters or dashes");
  }

  return `${name}-${uuid.v4()}`;
};
