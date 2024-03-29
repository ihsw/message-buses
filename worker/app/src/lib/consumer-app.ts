import * as zlib from "zlib";

import * as express from "express";
import * as HttpStatus from "http-status";
import { wrap } from "async-middleware";

import {
  IMessageDriver,
  ISubscribeOptions,
  ISubscribePersistOptions,
  IUnsubscribeOptions
} from "../message-drivers/IMessageDriver";
import { MetricsCollector, Metric, MetricFields } from "../lib/MetricsCollector";
import RfmManager from "../lib/rfm-manager";
import { getUniqueName } from "../lib/helper";
import { Measurements } from "./influx";

// global queue timeout
const queueTimeout = 10 * 1000;

// subscribe response handler with timeouts
interface ISubscribeHandlerCallback {
  (tId: NodeJS.Timer, unsubscribeResult: Promise<IUnsubscribeOptions>, msg: string);
}
interface ISubscribeHandlerOptions {
  messageDriver: IMessageDriver;
  req: express.Request;
  res: express.Response;
  queue: string;
  callback: ISubscribeHandlerCallback;
}
const subscribeHandler = (opts: ISubscribeHandlerOptions) => {
  const tId = setTimeout(() => {
    if (opts.res.headersSent) {
      return;
    }

    opts.res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Request timeout!");
  }, queueTimeout * 2);

  const unsubscribeResult = opts.messageDriver.subscribe(<ISubscribePersistOptions>{
    queue: opts.queue,
    callback: (msg) => opts.callback(tId, unsubscribeResult, msg),
    timeoutInMs: queueTimeout,
    timeoutCallback: () => {
      clearTimeout(tId);

      if (opts.res.headersSent) {
        return;
      }

      opts.res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Queue timeout");
    }
  });
};

export default (messageDriver: IMessageDriver, metricsCollector: MetricsCollector): express.Application => {
  // setting up an express app and rfm manager
  const app = express();
  const rfmManager = new RfmManager(messageDriver);

  // middleware for timeouts and stats collecting
  app.use((_: express.Request, res: express.Response, next: Function) => {
    // middleware timeout
    const tId = setTimeout(() => {
      if (res.headersSent) {
        return res.end();
      }

      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send("Timeout!").end();
    }, 5 * 1000);

    // response end
    const startTime = process.hrtime();
    res.on("finish", () => {
      // clearing the full request timeout
      clearTimeout(tId);

      // measuring the response time for this request
      const [endTimeInSeconds, endTimeInNanoseconds] = process.hrtime(startTime);
      const endTimeInMs = (endTimeInSeconds * 1000) + (endTimeInNanoseconds / 1000 / 1000);
      const truncatedEndtimeInMs = Math.round(endTimeInMs * 10) / 10;
      const metric = new Metric(Measurements.PAGE_RESPONSE_TIMES, <MetricFields>{ "duration": truncatedEndtimeInMs });
      metricsCollector.write(metric.toPointMessage()).catch((err: Error) => { throw err; });
    });

    next();
  });

  // setting up routes
  app.get("/", (_, res) => res.send("Hello, world!"));
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
      timeoutCallback: () => {
        clearTimeout(tId);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(`Timed out!`);
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

    // setting up a handler for messages
    subscribeHandler({
      messageDriver: messageDriver,
      req: req,
      res: res,
      queue: queue,
      callback: (tId, unsubscribeResult, msg) => {
        unsubscribeResult.then((unsubscribeSettings) => unsubscribeSettings.unsubscribe).then(() => {
          clearTimeout(tId);
          res.send(msg);
        });
      }
    });

    // flagging a new queue to have a message published
    messageDriver.publish("queues", queue)
      .catch((err: Error) => { throw err; });
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

    // setting up a handler for many messages
    let messageCount = 0;
    subscribeHandler({
      messageDriver: messageDriver,
      req: req,
      res: res,
      queue: queue,
      callback: (tId, unsubscribeResult, msg) => {
        messageCount += 1;
        const isFinished = messageCount === count;

        res.write(`${msg}\n`);

        if (isFinished) {
          unsubscribeResult.then((unsubscribeSettings) => unsubscribeSettings.unsubscribe).then(() => {
            clearTimeout(tId);
            res.end();
          });
        }
      }
    });

    // flagging a new queue to have X messages published
    messageDriver.publish("queueWaiting", JSON.stringify({ count: count, queue: queue }))
      .catch((err: Error) => { throw err; });
  });

  app.get("/store/:storeId", wrap(async (req: express.Request, res: express.Response) => {
    // parsing params and headers
    const storeId = req.params.storeId;

    // fetching the store contents
    let result;
    try {
      result = await rfmManager.fetch(storeId);
    } catch (err) {
      res.setHeader("content-type", "text/plain");
      res.status(HttpStatus.INTERNAL_SERVER_ERROR)
      res.send(err.message);

      return;
    }

    res.setHeader("content-type", "application/zip, application/octet-stream");
    res.send(Buffer.from(result, "base64"));
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

    // setting up a handler for receiving bloated messages
    subscribeHandler({
      messageDriver: messageDriver,
      req: req,
      res: res,
      queue: queue,
      callback: (tId, unsubscribeResult, msg) => {
        clearTimeout(tId);

        unsubscribeResult.then((unsubscribeSettings) => unsubscribeSettings.unsubscribe).then(() => {
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
      }
    });

    // flagging a new queue to have messages of size X thousand zeroes
    messageDriver.publish("queueBloating", JSON.stringify({ length: length, queue: queue }))
      .catch((err: Error) => { throw err; });
  });

  return app;
};
