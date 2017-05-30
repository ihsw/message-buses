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
    const hrTime = process.hrtime();
    const unixTimeWithMilliseconds = hrTime[0] * 1000 * 1000 + hrTime[1] / 1000;
    this.occurredAtSeconds = Math.floor(unixTimeWithMilliseconds);
    this.occurredAtNanoseconds = Math.floor((unixTimeWithMilliseconds - this.occurredAtSeconds) * 1000 * 1000 * 1000);
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

  constructor(natsClient: NATS.Client) {
    this.natsClient = natsClient;
  }

  write(message: PointMessage): Promise<void> {
    return new Promise<void>((resolve) => {
      this.natsClient.publish(this.queueName, JSON.stringify(message), () => resolve());
    });
  }
}
