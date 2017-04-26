import * as NATS from "nats";
import * as express from "express";
import * as HttpStatus from "http-status";

export default (client: NATS.Client): express.Application => {
  // setting up an express app
  const app = express();

  // setting up routes
  app.get("/timeout", (_, res) => {
    const sId = client.subscribe("invalid-queue", () => { return; });
    client.timeout(sId, 5 * 1000, 0, (timeoutSid) => {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send(`Timed out with sid ${timeoutSid}!`);
    });
  });

  app.get("/subscribers", (_, res) => res.send(client.numSubscriptions()));

  app.get("/:queue", (req, res) => {
    const queue = req.params.queue;

    client.publish("queues", queue);

    const sId = client.subscribe(queue, (msg) => {
      res.send(`received ${msg} on queue ${queue}`);
      client.unsubscribe(sId);
    });
  });

  app.get("/:queue/count/:count", (req, res) => {
    res.setHeader("content-type", "text/plain");

    // parsing params
    const queue = req.params.queue;
    const count = Number(req.params.count);

    // flagging a new queue to have X messages published
    client.publish("queueWaiting", JSON.stringify({ count: count, queue: queue }));

    // setting up a full request timeout
    const timeout = 5 * 1000;
    const tId = setTimeout(() => {
      if (res.headersSent) {
        return;
      }

      res.send("Request timeout!");
    }, timeout);

    // starting up a subscriber waiting for messages
    let messageCount = 0;
    const sId = client.subscribe(queue, (msg) => {
      res.write(`${msg}\n`);

      if (++messageCount === count) {
        client.unsubscribe(sId);
        clearTimeout(tId);
        res.end();
      }
    });

    // setting a timeout on the subscription
    client.timeout(sId, timeout, 0, () => {
      if (res.headersSent) {
        return;
      }

      clearTimeout(tId);
      res.send("Queue timeout!");
    });
  });

  app.get("/:queue/bloat/:length", (req, res) => {
    res.setHeader("content-type", "text/plain");

    // parsing params and headers
    const queue = req.params.queue;
    const length = Number(req.params.length);

    // flagging a new queue to have messages of size X thousand zeroes
    client.publish("queueBloating", JSON.stringify({
      length: length,
      queue: queue
    }));

    // setting up a full request timeout
    const timeout = 5 * 1000;
    const tId = setTimeout(() => {
      if (res.headersSent) {
        return;
      }

      res.send("Request timeout!");
    }, timeout);

    // starting up a subscriber waiting for a bloated message
    const sId = client.subscribe(queue, (msg: string) => {
      client.unsubscribe(sId);
      clearTimeout(tId);

      res.setHeader("content-encoding", "gzip");
      res.write(Buffer.from(msg, "base64"));
      res.end();
    });

    // setting a timeout on the subscription
    client.timeout(sId, timeout, 0, () => {
      if (res.headersSent) {
        return;
      }

      clearTimeout(tId);
      res.send("Queue timeout!");
    });
  });

  return app;
};