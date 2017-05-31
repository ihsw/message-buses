import * as process from "process";

import * as parseDuration from "parse-duration";

import { ConnectionInfo } from "../commands/interfaces";
import { IMessageDriver, ISubscribeOptions } from "../message-drivers/IMessageDriver";
import { MetricsCollector } from "../lib/MetricsCollector";
import { getUniqueName } from "../lib/helper";

export const ExpectedEnvVars: Array<string | ConnectionInfo> = [
  new ConnectionInfo("NATS_HOST", "NATS_PORT"),
  new ConnectionInfo("METRICS_HOST", "METRICS_PORT")
];
export default async (messageDriver: IMessageDriver, _: MetricsCollector, duration: string): Promise<void> => {
  // parsing the duration
  const parsedDuration: number = parseDuration(duration);

  // starting up an execution timer
  const startTime = process.hrtime();
  const getExecutionTime = () => {
      const diff = process.hrtime(startTime);
      return Math.round((diff[0]*1e3 + diff[1]/1e6) * 10) / 10;
  };

  // running it out
  return new Promise<void>((resolve) => {
    let running = true;

    // setting up a timeout
    const tId = setTimeout(() => { running = false }, parsedDuration);

    // defining the exit
    const exit = () => {
      const executionTimeInMs = getExecutionTime();
      console.log(`Executed in ${executionTimeInMs.toLocaleString()}ms`);
      resolve();
    };

    // handling unexpected exit
    process.on("SIGINT", () => {
      clearTimeout(tId);

      running = false;
      exit();
    });
    
    // starting the loop up
    console.log("Running benchmark");
    const loop = () => {
      const responseQueue = getUniqueName("hello-world");

      const unsubscribe = messageDriver.subscribe(<ISubscribeOptions>{
        queue: responseQueue,
        parallel: true,
        callback: () => {
          if (!running) {
            exit();

            return;
          }

          loop();
        },
        timeoutInMs: 5*1000,
        timeoutCallback: () => {
          unsubscribe();

          exit();
        }
      });

      messageDriver.publish("queues", responseQueue);
    };
    loop();
  });
};
