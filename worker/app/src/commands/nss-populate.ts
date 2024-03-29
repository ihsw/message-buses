import { ConnectionInfo } from "./interfaces";
import { MetricsCollector } from "../lib/MetricsCollector";
import { getFilenames, readFile, getUniqueName, defaultAppName } from "../lib/helper";
import { GetDriver } from "../message-drivers";
import { GetNatsClient } from "../message-drivers/NatsDriver";
import RfmManager from "../lib/rfm-manager";

export const ExpectedEnvVars: Array<string | ConnectionInfo> = [
  new ConnectionInfo("NATS_HOST", "NATS_PORT"),
  new ConnectionInfo("METRICS_HOST", "METRICS_PORT"),
];
export default async (env: any, storeDir: string): Promise<void> => {
  const driverName = getUniqueName("nss-populate");

  // connecting the metrics-collector
  const metricsNatsClient = GetNatsClient(`${driverName}-metrics-collector`, env["METRICS_HOST"], Number(env["METRICS_PORT"]));
  const metricsCollector = new MetricsCollector(metricsNatsClient);

  // connectin the message-driver
  const messageDriver = await GetDriver(defaultAppName, driverName, env);
  messageDriver.metricsCollector = metricsCollector;

  // initializing the rfm manager
  const rfmManager = new RfmManager(messageDriver);

  // opening the rfm dir
  const rfmDir = `${storeDir}/CommonTestStore300`;
  const filenames = await getFilenames(rfmDir);

  // going over the list of stores
  const whitelistedStore = 2301;
  for (const filename of filenames) {
    const storeId = Number(filename.split("_")[1]);
    if (storeId !== whitelistedStore) {
      continue;
    }

    const fileContents = await readFile(`${rfmDir}/${filename}`);
    const publishId = await rfmManager.persist(storeId, fileContents.toString("base64"));
    console.log(`Store ${storeId} loaded with store, publish id: ${publishId}`);
  }
};
