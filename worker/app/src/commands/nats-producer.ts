import * as zlib from "zlib";

import { ConnectionInfo } from "./interfaces";
import { GetDriver } from "../message-drivers/NatsDriver";
import GetInflux from "../lib/influx";
import { defaultAppName } from "../lib/helper";

export const ExpectedEnvVars: Array<string | ConnectionInfo> = [
  new ConnectionInfo("NATS_HOST", "NATS_PORT"),
  new ConnectionInfo("INFLUX_HOST", "INFLUX_PORT")
];
export default async (env: any): Promise<void> => {
  // connecting
  const influx = await GetInflux(defaultAppName, env);
  const messageDriver = await GetDriver(influx, "nats-producer", "ecp4", env);

  // setting up nats queues
  messageDriver.subscribe({ queue: "queues", callback: (msg) => messageDriver.publish(msg, "Pong") });
  messageDriver.subscribe({
    queue: "queueWaiting",
    callback: (msg) => {
      const req = JSON.parse(msg);
      const queue = req.queue;
      const count = Number(req.count);

      for (let i = 0; i < count; i++) {
        messageDriver.publish(queue, `Pong #${i}`);
      }
    }
  });
  messageDriver.subscribe({
    queue: "queueBloating",
    callback: (msg) => {
      const req = JSON.parse(msg);
      const queue = req.queue;
      const length = Number(req.length);

      const payload = "0".repeat(length * 1000);
      zlib.gzip(Buffer.from(payload), (err, buf) => {
        if (err) {
          console.error(err);
          return;
        }

        messageDriver.publish(queue, buf.toString("base64"));
      });
    }
  });
};
