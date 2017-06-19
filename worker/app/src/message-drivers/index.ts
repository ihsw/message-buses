import { IGetDriver } from "./IMessageDriver";
import { GetDriver as GetNatsDriver } from "./NatsDriver";
import { GetDriver as GetRabbitDriver } from "./RabbitDriver";

interface IDriverHandlers {
  [key: string]: IGetDriver;
}

export const DriverHandlers = <IDriverHandlers>{
  "nats": GetNatsDriver,
  "rabbit": GetRabbitDriver
};
