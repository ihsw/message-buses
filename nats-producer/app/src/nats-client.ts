import * as NATS from "nats";

export default (env: any): NATS.Client => {
    // parsing env vars
    const natsHost = env["NATS_HOST"];
    const natsPort = Number(env["NATS_PORT"]);

    // connecting
    return NATS.connect(<NATS.ClientOpts>{
        encoding: "binary",
        url: `nats://${natsHost}:${natsPort}`
    });
};
