import { MetricsCollector } from "../lib/MetricsCollector";

export default class {
  metricsCollector: MetricsCollector;

  getMetricsCollector(): MetricsCollector {
    if (typeof this.metricsCollector === "undefined") {
      throw new Error("Metrics collector is not defined!");
    }

    return this.metricsCollector;
  }
}
