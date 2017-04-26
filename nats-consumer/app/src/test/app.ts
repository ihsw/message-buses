import { test } from "ava";
import * as supertest from "supertest";
import * as HttpStatus from "http-status";
import getApp from "../app";
import getNatsClient from "../nats-client";

const client = getNatsClient(process.env);
const app = getApp(client);

test("Timeout route should fail with 500", (t) => {
  return new Promise<void>((resolve, reject) => {
    supertest(app)
      .get("/timeout")
      .expect(HttpStatus.INTERNAL_SERVER_ERROR)
      .end((err: Error) => {
        if (err) {
          return reject(err);
        }

        t.pass();
        resolve();
      });
  });
});
