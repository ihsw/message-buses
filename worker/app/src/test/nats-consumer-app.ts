import * as process from "process";

import { test } from "ava";
import * as supertest from "supertest";
import * as HttpStatus from "http-status";

import { defaultAppName } from "../lib/test-helper";
import GetInflux from "../lib/influx";
import { GetDriver } from "../message-drivers/NatsDriver";
import RfmManager from "../lib/rfm-manager";
import getApp from "../lib/consumer-app";
import { getUniqueName, readFile } from "../lib/helper";

let app: supertest.SuperTest<supertest.Test>;
let rfmManager: RfmManager;
test.before(async () => {
  const influx = await GetInflux(defaultAppName, process.env);
  const messageDriver = await GetDriver(influx, "nats-consumer-app-test", "ecp4", process.env);
  app = supertest(getApp(messageDriver, influx));
  rfmManager = new RfmManager(messageDriver);
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
  // default store id
  const storeId = 2301;

  // fetching a test zip file to be served up
  const filePath = `${process.cwd()}/test-fixtures/US_2301_20141029_201410291050000.zip`;
  const fileContents = await readFile(filePath);
  const payload = fileContents.toString("base64");

  // dumping it out to the rfm manager
  await rfmManager.persist(storeId, payload);

  return new Promise<void>((resolve, reject) => {
    app
      .get(`/store/${storeId}`)
      .end((err: Error, res: supertest.Response) => {
        if (err) {
          return reject(err);
        }

        if (res.header["content-type"] === "text/plain") {
          t.is(res.status, HttpStatus.OK, `Status was not OK: ${res.text}`);
          return reject();
        }

        t.is(res.status, HttpStatus.OK);
        t.is(res.header["content-type"], "application/zip, application/octet-stream", `Content type was not for zip files: ${res.header["content-type"]}`);
        t.is(res.text, fileContents.toString());
        resolve();
      });
  });
});
