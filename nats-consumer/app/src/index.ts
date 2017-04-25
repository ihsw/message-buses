import * as process from "process";
import * as NATS from "nats";
import * as express from "express";

// parsing env vars
const natsHost = process.env["NATS_HOST"];
const natsPort = Number(process.env["NATS_PORT"]);
const appPort = Number(process.env["APP_PORT"]);

// connecting
const client = NATS.connect(`nats://${natsHost}:${natsPort}`);
console.log(`Connected to NATS server ${natsHost}:${natsPort}`);

// setting up an express app
const app = express();

// setting up routes
app.get("/timeout", (_, res) => {
  const sId = client.subscribe("invalid-queue", () => { return; });
  client.timeout(sId, 5 * 1000, 0, (timeoutSid) => res.send(`Timed out with sid ${timeoutSid}!`));
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

    res.send("Full request timeout!");
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

// indicating activity
app.listen(appPort, () => console.log(`Listening on ${appPort}`));
