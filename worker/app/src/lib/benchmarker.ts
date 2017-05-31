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
export default async (messageDriver: IMessageDriver, _: MetricsCollector, duration: string, workload: string): Promise<void> => {
  // parsing the duration
  const parsedDuration: number = parseDuration(duration);
  const parsedWorkload = Number(workload);

  // starting up an execution timer
  const startTime = process.hrtime();
  const getExecutionTime = () => {
      const diff = process.hrtime(startTime);
      return Math.round((diff[0]*1e3 + diff[1]/1e6) * 10) / 10;
  };

  // running it out
  return new Promise<void>((resolve, reject) => {
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
      console.log(`Spinning up workload of size ${parsedWorkload}`);

      const promises: Promise<void>[] = [];
      for (let i = 0; i < parsedWorkload; i++) {
        promises.push(new Promise<void>((loopResolve, loopReject) => {
          // generating a unique response queue name
          const responseQueue = getUniqueName("hello-world");

          // subscribing to that unique response queue
          const unsubscribe = messageDriver.subscribe(<ISubscribeOptions>{
            queue: responseQueue,
            parallel: true,
            callback: () => loopResolve(),
            timeoutInMs: 5*1000,
            timeoutCallback: () => {
              unsubscribe();

              loopReject(new Error("Timed out!"));
            }
          });

          // flagging that queue for a response
          messageDriver.publish("queues", responseQueue);
        }));
      }

      Promise.all(promises).then(() => {
        if (!running) {
          exit();

          return;
        }

        loop();
      }).catch(reject);
    };

    loop();
  });
};