import { IGetDriver, IMessageDriver } from "./IMessageDriver";
import { GetDriver as GetNatsDriver } from "./NatsDriver";
import { GetDriver as GetRabbitDriver } from "./RabbitDriver";

interface IDriverHandlers {
  [key: string]: IGetDriver;
}

export const DriverHandlers = <IDriverHandlers>{
  "nats": GetNatsDriver,
  "rabbit": GetRabbitDriver
};

export const GetDriver = (name: string, clientId: string, env: any): Promise<IMessageDriver> => {
  if (!("DRIVER_TYPE" in env)) {
    throw new Error("Env var DRIVER_TYPE must not be blank!");
  }

  const driverType = env["DRIVER_TYPE"];
  if (!(driverType in DriverHandlers)) {
    throw new Error(`Driver type must be one of the following: ${Object.keys(DriverHandlers)}`);
  }

  return DriverHandlers[driverType](name, clientId, env);
};
