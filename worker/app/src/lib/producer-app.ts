import * as zlib from "zlib";

import { IMessageDriver } from "../message-drivers/IMessageDriver";

export default (messageDriver: IMessageDriver) => {
  // setting up queues
  messageDriver.subscribe({
    queue: "queues",
    callback: (msg) => {
      console.log(`Publishing to ${msg} persistent queue`);
      messageDriver.publishPersist(msg, "Pong")
        .then((guid) => {
          console.log(`Published to ${msg} confirmed with guid ${guid}`);
        })
        .catch((err) => { throw err; });
    }
  });
  messageDriver.subscribe({
    queue: "queueWaiting",
    callback: (msg) => {
      const req = JSON.parse(msg);
      const queue = req.queue;
      const count = Number(req.count);

      console.log(`received request to send ${count} messages to ${queue}`);
      for (let i = 0; i < count; i++) {
        messageDriver.publishPersist(queue, `Pong #${i}`);
      }

      console.log(`sent at ${(new Date()).getTime() / 1000}`);
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
