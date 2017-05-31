export { default as NatsConsumer } from "./nats-consumer";
export { default as NatsProducer } from "./nats-producer";
export { default as NssPopulate } from "./nss-populate";
export { default as NatsBenchmarker } from "./nats-benchmarker";
import { ExpectedEnvVars as NatsConsumerEnvVars } from "./nats-consumer";
import { ExpectedEnvVars as NatsProducerEnvVars } from "./nats-producer";
import { ExpectedEnvVars as NssPopulateEnvVars } from "./nss-populate";
import { ExpectedEnvVars as NatsBenchmarkerEnvVars } from "./nats-benchmarker";
import { ICommandEnvVars } from "./interfaces";

export const CommandEnvVarList: ICommandEnvVars = {
  "nats-consumer": NatsConsumerEnvVars,
  "nats-producer": NatsProducerEnvVars,
  "nss-populate": NssPopulateEnvVars,
  "nats-benchmarker": NatsBenchmarkerEnvVars
};
