import * as zlib from "zlib";

import { IMessageDriver } from "../message-drivers/IMessageDriver";

export default (messageDriver: IMessageDriver, parallel: boolean) => {
  // setting up queues
  messageDriver.subscribe({
    queue: "queues",
    parallel: parallel,
    callback: (msg) => {
      messageDriver.publish(msg, "Pong")
        .catch((err: Error) => { throw err; });
    }
  });
  messageDriver.subscribe({
    queue: "queueWaiting",
    parallel: parallel,
    callback: (msg) => {
      const req = JSON.parse(msg);
      const queue = req.queue;
      const count = Number(req.count);

      for (let i = 0; i < count; i++) {
        messageDriver.publish(queue, `Pong #${i}`)
          .catch((err: Error) => { throw err; });
      }
    }
  });
  messageDriver.subscribe({
    queue: "queueBloating",
    parallel: parallel,
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

        messageDriver.publish(queue, buf.toString("base64"))
          .catch((err: Error) => { throw err; });
      });
    }
  });
};
