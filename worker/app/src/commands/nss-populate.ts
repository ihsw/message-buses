import { ConnectionInfo } from "./interfaces";
import GetInflux from "../lib/influx";
import { defaultAppName, getFilenames, readFile } from "../lib/helper";
import { GetDriver } from "../message-drivers/NatsDriver";

export const ExpectedEnvVars: Array<string | ConnectionInfo> = [
  new ConnectionInfo("NATS_HOST", "NATS_PORT")
];
export default async (env: any, storeDir: string): Promise<void> => {
  // connecting
  const influx = await GetInflux(defaultAppName, env);
  const messageDriver = await GetDriver(influx, "nss-populate", "ecp4", env);

  // opening the rfm dir
  const rfmDir = `${storeDir}/CommonTestStore300`;
  const filenames = await getFilenames(rfmDir);

  // going over the list of stores
  const whitelistedStore = 2301;
  for (const filename of filenames) {
    const [, storeId] = filename.split("_");
    if (Number(storeId) !== whitelistedStore) {
      continue;
    }

    const fileContents = await readFile(`${rfmDir}/${filename}`);
    const publishId = await messageDriver.publishPersist(`store-file/${storeId}`, fileContents.toString("base64"));
    console.log(`Store ${storeId} loaded with store, publish id: ${publishId}`);
  }
};
