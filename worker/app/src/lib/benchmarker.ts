import * as process from "process";

import * as parseDuration from "parse-duration";

import { IMessageDriver, ISubscribeOptions } from "../message-drivers/IMessageDriver";
import { MetricsCollector } from "../lib/MetricsCollector";
import { getUniqueName } from "../lib/helper";

export const waitingRequest = (messageDriver: IMessageDriver): Promise<void> => {
  const expectedResponseMessages = 300;

  return new Promise<void>((resolve, reject) => {
    // generating a unique response queue name
    const responseQueue = getUniqueName("hello-world");

    // subscribing to that unique response queue
    let messageCount = 0;
    const unsubscribeResult = messageDriver.subscribe(<ISubscribeOptions>{
      queue: responseQueue,
      parallel: true,
      callback: () => {
        messageCount += 1;
        const isFinished = messageCount === expectedResponseMessages;

        if (isFinished) {
          unsubscribeResult
            .then((unsubscribe) => unsubscribe)
            .then(() => resolve());
        }
      },
      timeoutInMs: 5*1000,
      timeoutCallback: () => {
        unsubscribeResult
          .then((unsubscribe) => unsubscribe)
          .then(() => reject(new Error("Timed out!")));
      }
    });

    // flagging this queue as waiting for messages
    messageDriver.publish("queueWaiting", JSON.stringify({ queue: responseQueue, count: expectedResponseMessages }));
  });
};

export const request = (messageDriver: IMessageDriver): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    // generating a unique response queue name
    const responseQueue = getUniqueName("hello-world");

    // subscribing to that unique response queue
    const unsubscribeResult = messageDriver.subscribe(<ISubscribeOptions>{
      queue: responseQueue,
      parallel: true,
      callback: () => {
        unsubscribeResult
          .then((unsubscribe) => unsubscribe)
          .then(() => resolve());
      },
      timeoutInMs: 5*1000,
      timeoutCallback: () => {
        unsubscribeResult
          .then((unsubscribe) => unsubscribe)
          .then(() => reject(new Error("Timed out!")));
      }
    });

    // flagging this queue as waiting for messages
    messageDriver.publish("queues", responseQueue);
  });
};

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
    const tId = setTimeout(() => { running = false; }, parsedDuration);

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
      const promises: Promise<void>[] = [];
      for (let i = 0; i < parsedWorkload; i++) {
        promises.push(waitingRequest(messageDriver));
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
