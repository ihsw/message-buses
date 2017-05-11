import * as zlib from "zlib";

import * as express from "express";
import * as HttpStatus from "http-status";
import { wrap } from "async-middleware";

import { IMessageDriver, ISubscribeOptions } from "../message-drivers/IMessageDriver";
import { getUniqueName } from "../lib/helper";

// global queue timeout
const queueTimeout = 10 * 1000;

// subscribe response handler with timeouts
interface ISubscribeHandlerCallback {
  (tId: NodeJS.Timer, sId: number, msg: string);
}
interface ISubscribeHandlerOptions {
  messageDriver: IMessageDriver,
  req: express.Request,
  res: express.Response,
  queue: string,
  callback: ISubscribeHandlerCallback
}
const subscribeHandler = (opts: ISubscribeHandlerOptions) => {
  const tId = setTimeout(() => {
    if (opts.res.headersSent) {
      return;
    }

    opts.res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Request timeout!");
  }, queueTimeout * 2);

  opts.messageDriver.subscribe(<ISubscribeOptions>{
    queue: opts.queue,
    callback: (msg, sId) => opts.callback(tId, sId, msg),
    timeoutInMs: queueTimeout,
    timeoutCallback: () => {
      console.log(`Queue timeout on ${opts.queue} timed out at ${opts.req.originalUrl}`);

      clearTimeout(tId);

      if (opts.res.headersSent) {
        return;
      }

      opts.res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Queue timeout");
    }
  });
};

export default (messageDriver: IMessageDriver): express.Application => {
  // setting up an express app
  const app = express();

  app.use((_: express.Request, res: express.Response, next: Function) => {
    const tId = setTimeout(() => {
      if (res.headersSent) {
        return res.end();
      }

      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Timeout!").end();
    }, 5 * 1000);
    res.on("end", () => clearTimeout(tId));

    next();
  });

  // setting up routes
  app.get("/timeout", (_, res) => {
    // setting up a full request timeout
    const tId = setTimeout(() => {
      if (res.headersSent) {
        return;
      }

      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Request timeout!");
    }, queueTimeout * 2);

    messageDriver.subscribe(<ISubscribeOptions>{
      queue: "invalid-queue",
      callback: () => res.status(HttpStatus.OK).send(),
      timeoutInMs: queueTimeout,
      timeoutCallback: (sId) => {
        clearTimeout(tId);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(`Timed out with sid ${sId}!`);
      }
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
    messageDriver.publish("queues", queue);

    subscribeHandler({
      messageDriver: messageDriver,
      req: req,
      res: res,
      queue: queue,
      callback: (tId, sId, msg) => {
        clearTimeout(tId);
        messageDriver.unsubscribe(sId);
        res.send(msg);
      }
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
    messageDriver.publish("queueWaiting", JSON.stringify({ count: count, queue: queue }));

    let messageCount = 0;
    subscribeHandler({
      messageDriver: messageDriver,
      req: req,
      res: res,
      queue: queue,
      callback: (tId, sId, msg) => {
        res.write(`${msg}\n`);

        if (++messageCount === count) {
          messageDriver.unsubscribe(sId);
          clearTimeout(tId);
          res.end();
        }
      }
    });
  });

  app.get("/store/:storeId", wrap(async (req: express.Request, res: express.Response) => {
    res.setHeader("content-type", "text/plain");

    // parsing params and headers
    const storeId = req.params.storeId;

    // fetching the store contents
    let result;
    try {
      result = await messageDriver.lastPersistMessage(`store-file/${storeId}`);
    } catch (err) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(err.message);
    }

    res.setHeader("content-type", "application/zip, application/octet-stream");
    const msgBuf = Buffer.from(result, "base64");
    res.send(msgBuf);
  }));

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
    messageDriver.publish("queueBloating", JSON.stringify({ length: length, queue: queue }));

    subscribeHandler({
      messageDriver: messageDriver,
      req: req,
      res: res,
      queue: queue,
      callback: (tId, sId, msg) => {
      messageDriver.unsubscribe(sId);
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
      }
    });
  });

  return app;
};
