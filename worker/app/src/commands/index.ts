export { default as NatsConsumer } from "./nats-consumer";
export { default as NatsProducer } from "./nats-producer";
export { default as NssPopulate } from "./nss-populate";
import { ExpectedEnvVars } from "./nats-consumer";

interface ICommandEnvVars {
  [key: string]: string[];
}
export const CommandEnvVars: ICommandEnvVars = {
  "nats-consumer": ExpectedEnvVars
};
