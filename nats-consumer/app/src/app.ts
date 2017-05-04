import * as zlib from "zlib";
import * as NATS from "nats";
import * as express from "express";
import * as HttpStatus from "http-status";
import * as uuid from "uuid";

// utility function
export const getUniqueName = (name: string): string => {
  if (name.length === 0) {
    throw new Error("Name must not be blank");
  }

  if (/[\w\d\-]/.test(name) === false) {
    throw new Error("Name must be alphanumeric characters or dashes");
  }

  return `${name}-${uuid.v4()}`;
};

// global queue timeout
const queueTimeout = 10 * 1000;

// subscribe response handler with timeouts
interface SubscribeCallback {
  (tId: NodeJS.Timer, sId: number, msg: string);
}
const subscribe = (client: NATS.Client, req: express.Request, res: express.Response, subject: string, cb: SubscribeCallback) => {
  const tId = setTimeout(() => {
    if (res.headersSent) {
      return;
    }

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Request timeout!");
  }, queueTimeout * 2);

  const sId = client.subscribe(subject, (msg) => cb(tId, sId, msg));

  client.timeout(sId, queueTimeout, 0, () => {
    console.log(`Queue timeout on ${subject} timed out at ${req.originalUrl}`);
    if (res.headersSent) {
      return;
    }

    clearTimeout(tId);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Queue timeout!");
  });
};

export default (client: NATS.Client): express.Application => {
  // setting up an express app
  const app = express();

  // setting up routes
  app.get("/timeout", (_, res) => {
    // setting up a full request timeout
    const tId = setTimeout(() => {
      if (res.headersSent) {
        return;
      }

      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Request timeout!");
    }, queueTimeout * 2);

    const sId = client.subscribe("invalid-queue", () => { return; });
    client.timeout(sId, queueTimeout, 0, (timeoutSid) => {
      clearTimeout(tId);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(`Timed out with sid ${timeoutSid}!`);
    });
  });

  app.get("/:queue", (req, res) => {
    res.setHeader("content-type", "text/plain");

    // parsing params
    const queue = getUniqueName(req.params.queue);

    // flagging a new queue to have a message published
    client.publish("queues", queue);

    subscribe(client, req, res, queue, (tId, sId, msg) => {
      client.unsubscribe(sId);
      clearTimeout(tId);
      res.send(msg);
    });
  });

  app.get("/:queue/count/:count", (req, res) => {
    res.setHeader("content-type", "text/plain");

    // parsing params
    const queue = getUniqueName(req.params.queue);
    const count = Number(req.params.count);

    // flagging a new queue to have X messages published
    client.publish("queueWaiting", JSON.stringify({ count: count, queue: queue }));

    let messageCount = 0;
    subscribe(client, req, res, queue, (tId, sId, msg) => {
      res.write(`${msg}\n`);

      if (++messageCount === count) {
        client.unsubscribe(sId);
        clearTimeout(tId);
        res.end();
      }
    });
  });

  app.get("/:queue/bloat/:length", (req, res) => {
    res.setHeader("content-type", "text/plain");

    // parsing params and headers
    const queue = getUniqueName(req.params.queue);
    const length = Number(req.params.length);
    const acceptsGzip = req.header("accept-encoding") === "gzip";

    // flagging a new queue to have messages of size X thousand zeroes
    client.publish("queueBloating", JSON.stringify({ length: length, queue: queue }));

    subscribe(client, req, res, queue, (tId, sId, msg) => {
      client.unsubscribe(sId);
      clearTimeout(tId);

      const msgBuf = Buffer.from(msg, "base64");

      // optionally sending the gzipped message
      if (acceptsGzip) {
        res.setHeader("content-encoding", "gzip");
        res.send(msgBuf);

        return;
      }

      // gunzipping the message
      zlib.gunzip(msgBuf, (err, buf) => {
        if (err) {
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(err.message);

          return;
        }

        res.send(buf);
      });
    });
  });

  return app;
};
