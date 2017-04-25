import * as process from "process";
import * as NATS from "nats";
import * as express from "express";

const client = NATS.connect(`nats://${process.env["NATS_HOST"]}:${process.env["NATS_PORT"]}`);
const app = express();
app.get("/:queue", (req, res) => {
  const queue = req.params.queue;

  console.log(`flagging ${queue} to be populated with a pong`);
  client.publish("queues", queue);

  console.log(`waiting for ping on: ${queue}`);
  const sId = client.subscribe(queue, (msg) => {
    res.send(`received ${msg} on queue ${queue}`);
    client.unsubscribe(sId);
  });
});
app.listen(80, () => console.log(`Listening on 80`));
