import * as process from "process";

import { test } from "ava";
import * as supertest from "supertest";
import * as HttpStatus from "http-status";
import * as express from "express";

import { GetDriver } from "../message-drivers/NatsDriver";
import { getUniqueName } from "../lib/helper";
import getApp from "../lib/consumer-app";
import GetInflux from "../lib/influx";
import { defaultAppName } from "../lib/test-helper";

let app: express.Application;
test.before(async () => {
  const influx = await GetInflux(defaultAppName, process.env);
  const messageDriver = await GetDriver(influx, "nats-consumer-app-test", "ecp4", process.env);
  app = getApp(messageDriver);
});

test("Timeout route should fail with 500", async (t) => {
  return new Promise<void>((resolve, reject) => {
    app
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

test("Queue route should return with 200", async (t) => {
  return new Promise<void>((resolve, reject) => {
    app
      .get(`/test-name`)
      .end((err: Error, res: supertest.Response) => {
        if (err) {
          return reject(err);
        }

        t.is(res.status, HttpStatus.OK, `Status was not OK: ${res.text}`);
        resolve();
      });
  });
});

test("Queue route should fail on invalid queue name", async (t) => {
  return new Promise<void>((resolve, reject) => {
    app
      .get("/!@#$%^&*()")
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

test("Count queue route should take 500 messages and return with 200", async (t) => {
  return new Promise<void>((resolve, reject) => {
    app
      .get("/test-name/count/500")
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

test("Bloat queue route should take a 50x bloated message and return with 200 (non-gzip response)", async (t) => {
  return new Promise<void>((resolve, reject) => {
    const length = 50;
    app
      .get(`/${getUniqueName("test-name")}/bloat/${length}`)
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

test("Bloat queue route should take a 50x bloated message and return with 200 (gzip response)", async (t) => {
  return new Promise<void>((resolve, reject) => {
    const length = 50;
    app
      .get(`/test-name/bloat/${length}`)
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

test("Rfm file queue route should return with proper content type and 200", async (t) => {
  return new Promise<void>((resolve, reject) => {
    const storeId = 2301;
    app
      .get(`/store/${storeId}`)
      .end((err: Error, res: supertest.Response) => {
        if (err) {
          return reject(err);
        }

        t.is(res.status, HttpStatus.OK, `Status was not OK: ${res.text}`);
        t.is(res.header["content-type"], "application/zip, application/octet-stream", `Content type was not for zip files: ${res.header["content-type"]}`);
        resolve();
      });
  });
});
