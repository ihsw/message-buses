import { InfluxDB, ISingleHostConfig, FieldType, ISchemaOptions } from "influx";

export const BullshitErrorClass = "ServiceNotAvailableError";

export class Measurements {
  static readonly PUBLISH_TIMES = "publish_times";
  static readonly PAGE_RESPONSE_TIMES = "page_response_times";
}

export default async (name: string, env: any): Promise<InfluxDB> => {
  // parsing env vars
  const influxHost = env["INFLUX_HOST"];
  const influxPort = Number(env["INFLUX_PORT"]);

  // connecting to influx
  const influx = new InfluxDB(<ISingleHostConfig>{
    host: influxHost,
    port: influxPort,
    database: name,
    schema: [
      <ISchemaOptions>{
        measurement: Measurements.PUBLISH_TIMES,
        fields: {
          duration: FieldType.FLOAT
        },
        tags: []
      },
      <ISchemaOptions>{
        measurement: Measurements.PAGE_RESPONSE_TIMES,
        fields: {
          duration: FieldType.FLOAT
        },
        tags: []
      }
    ]
  });

  // validating that the database exists
  const names = await influx.getDatabaseNames();
  if (names.indexOf(name) === -1) {
    await influx.createDatabase(name);
  }

  return influx;
};
