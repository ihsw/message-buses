import { InfluxDB } from "influx";

export default class {
  influx: InfluxDB;

  constructor(influx: InfluxDB) {
    this.influx = influx;
  }
}
