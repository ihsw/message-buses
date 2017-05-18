import { InfluxDB, ISingleHostConfig, FieldType, ISchemaOptions } from "influx";

export const BullshitErrorClass = "ServiceNotAvailableError";

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
        measurement: "publish_times",
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
