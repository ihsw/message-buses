import { test } from "ava";
import * as supertest from "supertest";
import * as HttpStatus from "http-status";
import getApp, { getUniqueRouteName } from "../app";
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

test("Queue route should return with 200", (t) => {
  return new Promise<void>((resolve, reject) => {
    supertest(app)
      .get(`/${getUniqueRouteName("test-name")}`)
      .expect(HttpStatus.OK)
      .end((err: Error) => {
        if (err) {
          return reject(err);
        }

        t.pass();
        resolve();
      });
  });
});

test("Count queue route should take 500 messages and return with 200", (t) => {
  return new Promise<void>((resolve, reject) => {
    supertest(app)
      .get(`/${getUniqueRouteName("test-name")}/count/500`)
      .expect(HttpStatus.OK)
      .end((err: Error) => {
        if (err) {
          return reject(err);
        }

        t.pass();
        resolve();
      });
  });
});

test("Bloat queue route should take a 50x bloated message and return with 200 (non-gzip response)", (t) => {
  return new Promise<void>((resolve, reject) => {
    const length = 50;
    supertest(app)
      .get(`/${getUniqueRouteName("test-name")}/bloat/${length}`)
      .end((err: Error, res: supertest.Response) => {
        if (err) {
          return reject(err);
        }

        t.is(res.status, HttpStatus.OK, `Status was not OK: ${res.text}`);
        t.is(res.text.length, length * 1000, "Response was not appropriate number of zeroes");
        resolve();
      });
  });
});

test("Bloat queue route should take a 50x bloated message and return with 200 (gzip response)", (t) => {
  return new Promise<void>((resolve, reject) => {
    const length = 50;
    supertest(app)
      .get(`/${getUniqueRouteName("test-name")}/bloat/${length}`)
      .set("accept-encoding", "gzip")
      .end((err: Error, res: supertest.Response) => {
        if (err) {
          return reject(err);
        }

        t.is(res.status, HttpStatus.OK, `Status was not OK: ${res.text}`);
        t.is(res.text.length, length * 1000, "Response was not appropriate number of zeroes");
        resolve();
      });
  });
});
