import * as NATS from "nats";

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

export interface MetricFields {
  [key: string]: number;
}

export class Metric {
  name: string;
  fields: MetricFields;
  occurredAtSeconds: number;
  occurredAtNanoseconds: number;

  constructor(name: string, fields: MetricFields) {
    this.name = name;
    this.fields = fields;

    // calculating the occurred-at values
    const occurredAtUnix = (new Date()).getTime() / 1000;
    this.occurredAtSeconds = Math.floor(occurredAtUnix);
    this.occurredAtNanoseconds = Math.floor((occurredAtUnix - this.occurredAtSeconds) * 1000 * 1000);
  }

  toPointMessage(): PointMessage {
    // converting metric-fields to point-message-fields
    const pointMessageFields: PointMessageField[] = [];
    for (const key in this.fields) {
      pointMessageFields.push(<PointMessageField>{ key: key, value: this.fields[key] });
    }

    return <PointMessage>{
      metric: this.name,
      unix_seconds: this.occurredAtSeconds,
      unix_nanoseconds: this.occurredAtNanoseconds,
      fields: pointMessageFields
    };
  }
}

export class MetricsCollector {
  natsClient: NATS.Client;
  readonly queueName: string = "influxdb-writes";
  disabled: boolean = false;

  constructor(natsClient: NATS.Client) {
    this.natsClient = natsClient;
  }

  write(message: PointMessage): Promise<void> {
    if (this.disabled) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.natsClient.publish(this.queueName, JSON.stringify(message), () => resolve());
    });
  }
}
