import { ConnectionInfo } from "./interfaces";
import { setup, getFilenames, readFile } from "../lib/helper";

export const ExpectedEnvVars: Array<string | ConnectionInfo> = [
  new ConnectionInfo("NATS_HOST", "NATS_PORT")
];
export default async (env: any, storeDir: string): Promise<void> => {
  // connecting
  const { nssClient } = await setup("nss-populate", env);

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
    const publishId = await nssClient.publish(`store-file/${storeId}`, fileContents.toString("base64"));
    console.log(publishId);
  }
};
