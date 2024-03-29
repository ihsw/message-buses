import * as fs from "fs";
import * as zlib from "zlib";

import * as uuid from "uuid";

export const defaultAppName = "ecp4";

export const getFilenames = (dirPath: string): Promise<string[]> => {
  return new Promise<string[]>((resolve, reject) => {
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        return reject(err);
      }

      resolve(files);
    });
  });
};

export const readFile = (path: string): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    fs.readFile(path, (err, data) => {
      if (err) {
        return reject(err);
      }

      resolve(data);
    });
  });
};

export const getUniqueName = (name: string): string => {
  if (name.length === 0) {
    throw new Error("Name must not be blank");
  }

  if (/[\w\d\-]/.test(name) === false) {
    throw new Error("Name must be alphanumeric characters or dashes");
  }

  return `${name}-${uuid.v4()}`;
};

export const gunzip = (buf: Buffer): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    zlib.gunzip(buf, (err, res) => {
      if (err) {
        return reject(err);
      }

      resolve(res);
    });
  });
};

export const gzip = (buf: Buffer): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    zlib.gzip(buf, (err, res) => {
      if (err) {
        return reject(err);
      }

      resolve(res);
    });
  });
};
