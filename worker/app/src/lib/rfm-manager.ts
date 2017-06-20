import { IMessageDriver } from "../message-drivers/IMessageDriver";

export const generateStorePath = (storeId: number) => `store-file/${storeId}`;

export default class {
  messageDriver: IMessageDriver;

  constructor(messageDriver: IMessageDriver) {
      this.messageDriver = messageDriver;
  }

  persist(storeId: number, data: string): Promise<void> {
    return this.messageDriver.publishPersist(generateStorePath(storeId), data);
  }

  fetch(storeId: number): Promise<string> {
    return this.messageDriver.lastPersistMessage(generateStorePath(storeId));
  }
}
