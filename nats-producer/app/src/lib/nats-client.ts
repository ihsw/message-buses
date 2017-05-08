import * as NATS from "nats";

export default (name: string, env: any): NATS.Client => {
  // parsing env vars
  const natsHost = env["NATS_HOST"];
  const natsPort = Number(env["NATS_PORT"]);

  // connecting
  return NATS.connect(<NATS.ClientOpts>{
    encoding: "binary",
    name: name,
    url: `nats://${natsHost}:${natsPort}`
  });
};
