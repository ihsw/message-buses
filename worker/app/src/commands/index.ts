export { default as NatsConsumer } from "./nats-consumer";
export { default as NatsProducer } from "./nats-producer";
export { default as NssPopulate } from "./nss-populate";
export { default as NatsBenchmarker } from "./nats-benchmarker";
import { ExpectedEnvVars as NatsConsumerEnvVars } from "./nats-consumer";
import { ExpectedEnvVars as NatsProducerEnvVars } from "./nats-producer";
import { ExpectedEnvVars as NssPopulateEnvVars } from "./nss-populate";
import { ExpectedEnvVars as NatsBenchmarkerEnvVars } from "./nats-benchmarker";

export { default as RabbitConsumer } from "./rabbit-consumer";
export { default as RabbitProducer } from "./rabbit-producer";
export { default as RabbitBenchmarker } from "./rabbit-benchmarker";
import { ExpectedEnvVars as RabbitConsumerEnvVars } from "./rabbit-consumer";
import { ExpectedEnvVars as RabbitProducerEnvVars } from "./rabbit-producer";
import { ExpectedEnvVars as RabbitBenchmarkerEnvVars } from "./rabbit-benchmarker";
import { ICommandEnvVars } from "./interfaces";

export const CommandEnvVarList: ICommandEnvVars = {
  "nats-consumer": NatsConsumerEnvVars,
  "nats-producer": NatsProducerEnvVars,
  "nss-populate": NssPopulateEnvVars,
  "nats-benchmarker": NatsBenchmarkerEnvVars,

  "rabbit-consumer": RabbitConsumerEnvVars,
  "rabbit-producer": RabbitProducerEnvVars,
  "rabbit-benchmarker": RabbitBenchmarkerEnvVars
};
