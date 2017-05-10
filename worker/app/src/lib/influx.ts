import { InfluxDB, ISingleHostConfig, FieldType, ISchemaOptions } from "influx";

export default (env: any): InfluxDB => {
  // parsing env vars
  const influxHost = env["INFLUX_HOST"];
  const influxPort = Number(env["INFLUX_PORT"]);

  // connecting to influx
  return new InfluxDB(<ISingleHostConfig>{
    host: influxHost,
    port: influxPort,
    schema: [
      <ISchemaOptions>{
        measurement: "subscribe_times",
        fields: {
          duration: FieldType.FLOAT
        },
        tags: ["host"]
      }
    ]
  });
};
