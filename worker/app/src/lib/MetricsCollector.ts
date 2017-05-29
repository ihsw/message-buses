import { NatsDriver } from "../message-drivers/NatsDriver";

interface PointMessageField {
  key: string;
  value: number;
}

interface PointMessage {
  metric: string;
  fields: PointMessageField[];
  unix_seconds: number;
  unix_nanoseconds: number;
}

export interface MetricField {
  [key: string]: number;
}

export class Metric {
  name: string;
  fields: MetricField[];
  occurredAt: Date;

  constructor(name: string, fields: MetricField[]) {
    this.name = name;
    this.occurredAt = new Date();
    this.fields = fields;
  }

  toPointMessage(): PointMessage {
    // calculating the unix time with nanosecond precision
    const occurredAtMilliseconds = this.occurredAt.getTime();
    const occurredAtSeconds = Math.floor(occurredAtMilliseconds / 1000);
    const occurredAtNanoseconds = Number(occurredAtMilliseconds.toString().substr(occurredAtSeconds.toString().length)) * 1000 * 1000;

    // converting metric-fields to point-message-fields
    return <PointMessage>{
      metric: this.name,
      unix_seconds: occurredAtSeconds,
      unix_nanoseconds: occurredAtNanoseconds
    };
  }
}

export class MetricsCollector {
  natsClient: NatsDriver;
  readonly queueName: string = "influxdb-writes";

  constructor(natsClient: NatsDriver) {
    this.natsClient = natsClient;
  }

  write(message: PointMessage): Promise<void> {
    return this.natsClient.publish(this.queueName, JSON.stringify(message));
  }
}
