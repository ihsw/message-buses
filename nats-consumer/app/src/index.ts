import * as process from "process";
import * as NATS from "nats";
import * as express from "express";

const client = NATS.connect(`nats://${process.env["NATS_HOST"]}:${process.env["NATS_PORT"]}`);
const app = express();
app.get("/timeout", (_, res) => {
  const sId = client.subscribe("invalid-queue", () => { return; });
  client.timeout(sId, 5 * 1000, 5, (timeoutSid) => res.send(`Timed out with sid ${timeoutSid}!`));
});
app.get("/:queue", (req, res) => {
  const queue = req.params.queue;

  client.publish("queues", queue);

  const sId = client.subscribe(queue, (msg) => {
    res.send(`received ${msg} on queue ${queue}`);
    client.unsubscribe(sId);
  });
});
app.listen(80, () => console.log(`Listening on 80`));
