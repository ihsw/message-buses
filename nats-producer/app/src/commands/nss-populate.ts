import { setup, getFilenames, readFile } from "../lib/helper";

export default async (): Promise<void> => {
  // connecting
  const { nssClient } = await setup("nss-populate");

  // opening the rfm dir
  const rfmDir = `${process.cwd()}/CommonTestStore300`;
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
