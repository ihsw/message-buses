import * as zlib from "zlib";
import { ConnectionInfo } from "./interfaces";
import { setup } from "../lib/helper";

export const ExpectedEnvVars: Array<string | ConnectionInfo> = [
  new ConnectionInfo("NATS_HOST", "NATS_PORT")
];
export default async (env: any): Promise<void> => {
  // connecting
  const { natsClient } = await setup("nats-producer", env);
  natsClient.on("error", (err) => { throw err; });

  // setting up nats queues
  natsClient.subscribe("queues", (msg) => natsClient.publish(msg, "Pong"));
  natsClient.subscribe("queueWaiting", (msg) => {
    const req = JSON.parse(msg);
    const queue = req.queue;
    const count = Number(req.count);

    for (let i = 0; i < count; i++) {
      natsClient.publish(queue, `Pong #${i}`);
    }
  });
  natsClient.subscribe("queueBloating", (msg) => {
    const req = JSON.parse(msg);
    const queue = req.queue;
    const length = Number(req.length);

    const payload = "0".repeat(length * 1000);
    zlib.gzip(Buffer.from(payload), (err, buf) => {
      if (err) {
        console.error(err);
        return;
      }

      natsClient.publish(queue, buf.toString("base64"));
    });
  });
};
