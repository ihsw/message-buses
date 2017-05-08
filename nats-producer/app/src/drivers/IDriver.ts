interface SubscribeCallback {
  (msg: String | Buffer);
}

export interface IDriver {
  subscribe(queue: string, callback: SubscribeCallback);
  publish(queue: string, message: String | Buffer);
}
