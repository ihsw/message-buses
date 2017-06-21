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
  messageDriver.subscribe({
    queue: "queueDuration",
    parallel: parallel,
    callback: (msg) => {
      const req = JSON.parse(msg);
      const queue = req.queue;
      const duration = Number(req.duration);

      // setting up a timeout to resolve when all messages are published
      let promises: Promise<void>[] = [];
      let running = true;
      setTimeout(() => {
        // flagging the loop to stop
        running = false;

        // waiting for all published messages to finish
        Promise.all(promises)
          .then(() => messageDriver.publish(queue, promises.length.toString()))
          .catch((err) => { throw err; });
      }, duration);

      // entering recursive loop that publishes for a given duration
      let innerPromises: Promise<void>[] = [];
      const enqueue = () => {
        if (!running) {
          return;
        }

        innerPromises.push(messageDriver.publish(queue, "Pong"));

        // rate limiting to prevent stack overflow
        if (innerPromises.length > 100) {
          promises.push(Promise.all(innerPromises)
            .then(() => {
              innerPromises = [];
              enqueue();
            }));

            return;
        }

        // repeating the call
        enqueue();
      };

      // starting up the recursive message publishing
      enqueue();
    }
  });
};
