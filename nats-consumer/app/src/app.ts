import * as zlib from "zlib";
import * as NATS from "nats";
import * as express from "express";
import * as HttpStatus from "http-status";
import * as uuid from "uuid";
import getNatsClient from "./nats-client";
import NssClient from "./nss-client";

// setup of nats and nss connections
interface SetupData {
  natsClient: NATS.Client;
  nssClient: NssClient;
}
export const setup = async (): Promise<SetupData> => {
  // connecting nats client
  const natsClient = getNatsClient(process.env);
  natsClient.on("error", (err: NATS.NatsError) => { throw err; });

  // connecting nss client
  const nssClient = new NssClient(natsClient, "ecp4", "ecp4");
  await nssClient.connect();

  return <SetupData>{ natsClient, nssClient };
};

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
const subscribe = (natsClient: NATS.Client, req: express.Request, res: express.Response, subject: string, cb: SubscribeCallback) => {
  const tId = setTimeout(() => {
    if (res.headersSent) {
      return;
    }

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Request timeout!");
  }, queueTimeout * 2);

  const sId = natsClient.subscribe(subject, (msg) => cb(tId, sId, msg));

  natsClient.timeout(sId, queueTimeout, 0, () => {
    console.log(`Queue timeout on ${subject} timed out at ${req.originalUrl}`);
    if (res.headersSent) {
      return;
    }

    clearTimeout(tId);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Queue timeout!");
  });
};

export default (natsClient: NATS.Client, nssClient: NssClient): express.Application => {
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

    const sId = natsClient.subscribe("invalid-queue", () => { return; });
    natsClient.timeout(sId, queueTimeout, 0, (timeoutSid) => {
      clearTimeout(tId);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(`Timed out with sid ${timeoutSid}!`);
    });
  });

  app.get("/:queue", (req, res) => {
    res.setHeader("content-type", "text/plain");

    // parsing params
    let queue;
    try {
      queue = getUniqueName(req.params.queue);
    } catch (err) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(err.message);

      return;
    }

    // flagging a new queue to have a message published
    natsClient.publish("queues", queue);

    subscribe(natsClient, req, res, queue, (tId, sId, msg) => {
      natsClient.unsubscribe(sId);
      clearTimeout(tId);
      res.send(msg);
    });
  });

  app.get("/:queue/count/:count", (req, res) => {
    res.setHeader("content-type", "text/plain");

    // parsing params
    let queue;
    try {
      queue = getUniqueName(req.params.queue);
    } catch (err) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(err.message);

      return;
    }
    const count = Number(req.params.count);

    // flagging a new queue to have X messages published
    natsClient.publish("queueWaiting", JSON.stringify({ count: count, queue: queue }));

    let messageCount = 0;
    subscribe(natsClient, req, res, queue, (tId, sId, msg) => {
      res.write(`${msg}\n`);

      if (++messageCount === count) {
        natsClient.unsubscribe(sId);
        clearTimeout(tId);
        res.end();
      }
    });
  });

  app.get("/store/:storeId", (req, res) => {
    res.setHeader("content-type", "application/zip, application/octet-stream");

    // parsing params and headers
    const storeId = req.params.storeId;

    // fetching the store contents
    nssClient.lastMessage(`store-file/${storeId}`, "store-file.workers")
      .then((result) => {
        const msgBuf = Buffer.from((result.getData() as Buffer).toString(), "base64");
        res.write(msgBuf);
      })
      .catch((err) => res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(err.message));
  });

  app.get("/:queue/bloat/:length", (req, res) => {
    res.setHeader("content-type", "text/plain");

    // parsing params and headers
    let queue;
    try {
      queue = getUniqueName(req.params.queue);
    } catch (err) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(err.message);

      return;
    }
    const length = Number(req.params.length);
    const acceptsGzip = req.header("accept-encoding") === "gzip";

    // flagging a new queue to have messages of size X thousand zeroes
    natsClient.publish("queueBloating", JSON.stringify({ length: length, queue: queue }));

    subscribe(natsClient, req, res, queue, (tId, sId, msg) => {
      natsClient.unsubscribe(sId);
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
