import DatabaseConstructor, { type Database } from "better-sqlite3";
import { Application, Request, Response } from "express";
import httpContext from "express-http-context";
import fs from "fs";
import {
  JSONRPCErrorResponse,
  JSONRPCParams,
  JSONRPCResponse,
  JSONRPCServer,
} from "json-rpc-2.0";
import multer from "multer";
import { homedir } from "os";
import path from "path";

import {
  CannotChangeAck,
  CannotChangeUploadedFile,
  InvalidAck,
  InvalidAttachmentID,
  InvalidRecipientID,
  InvalidTxid,
  InvalidVout,
  MissingAck,
  MissingAttachmentID,
  MissingFile,
  MissingRecipientID,
  MissingTxid,
  NotFoundConsignment,
  NotFoundMedia,
} from "../errors";
import { logger } from "../logger";
import { genHashFromFile, setDir } from "../util";
import { DEFAULT_APP_DATA } from "../vars";
import { APP_VERSION } from "../version";

const PROTOCOL_VERSION = "0.2";

const DATABASE_FILE = "app.db";

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, tempDir);
  },
});

const upload = multer({ storage });

let appDir: string;
let db: Database;
let tempDir: string;
let consignmentDir: string;
let mediaDir: string;

interface ServerInfo {
  version: string;
  protocol_version: string;
  uptime: number;
}

interface ConsignmentGetRes {
  consignment: string;
  txid: string;
  vout?: number;
}

interface Consignment {
  recipientID: string;
  filename: string;
  txid: string;
  vout?: number;
  ack?: boolean;
}

interface ConsignmentDB {
  recipient_id: string;
  filename: string;
  txid: string;
  vout: number | null;
  ack: number | null;
}

interface Media {
  attachment_id: string;
  filename: string;
}

function isBoolean(data: unknown): data is boolean {
  return Boolean(data) === data;
}

function isDictionary(data: unknown): data is Record<keyof never, unknown> {
  return typeof data === "object" && !Array.isArray(data) && data !== null;
}

function isNumber(data: unknown): data is string {
  return Number.isInteger(Number(data)) && data !== null;
}

function isString(data: unknown): data is string {
  return typeof data === "string";
}

function isErrorResponse(
  object: JSONRPCResponse
): object is JSONRPCErrorResponse {
  return "error" in object;
}

function truncateText(content: string, limit = 16) {
  if (!content) return "";
  if (content.length <= limit) return content;
  return content.slice(0, limit) + "...";
}

function joinEntries(entries: object) {
  let joined = "<";
  let keysCount = Object.keys(entries).length;
  Object.entries(entries).forEach(([k, v]) => {
    let value = v;
    if (isString(v)) {
      value = truncateText(v as string);
    }
    joined += `${k}: ${value}`;
    keysCount--;
    if (keysCount > 0) {
      joined += ", ";
    }
  });
  return joined + ">";
}

function getAckParam(jsonRpcParams: Partial<JSONRPCParams> | undefined) {
  const ackKey = "ack";
  if (!isDictionary(jsonRpcParams) || !(ackKey in jsonRpcParams)) {
    throw new MissingAck(jsonRpcParams);
  }
  const ack = jsonRpcParams[ackKey];
  if (!isBoolean(ack)) {
    throw new InvalidAck(jsonRpcParams);
  }
  return ack as boolean;
}

function getAttachmentIDParam(
  jsonRpcParams: Partial<JSONRPCParams> | undefined
) {
  const attachmentIDKey = "attachment_id";
  if (!isDictionary(jsonRpcParams) || !(attachmentIDKey in jsonRpcParams)) {
    throw new MissingAttachmentID(jsonRpcParams);
  }
  const attachmentID = jsonRpcParams[attachmentIDKey];
  if (!attachmentID || !isString(attachmentID)) {
    throw new InvalidAttachmentID(jsonRpcParams);
  }
  return attachmentID as string;
}

function getRecipientIDParam(
  jsonRpcParams: Partial<JSONRPCParams> | undefined
) {
  const recipientIDKey = "recipient_id";
  if (!isDictionary(jsonRpcParams) || !(recipientIDKey in jsonRpcParams)) {
    throw new MissingRecipientID(jsonRpcParams);
  }
  const recipientID = jsonRpcParams[recipientIDKey];
  if (!recipientID || !isString(recipientID)) {
    throw new InvalidRecipientID(jsonRpcParams);
  }
  return recipientID as string;
}

function getTxidParam(jsonRpcParams: Partial<JSONRPCParams> | undefined) {
  const txidKey = "txid";
  if (!isDictionary(jsonRpcParams) || !(txidKey in jsonRpcParams)) {
    throw new MissingTxid(jsonRpcParams);
  }
  const txid = jsonRpcParams[txidKey];
  if (!txid || !isString(txid)) {
    throw new InvalidTxid(jsonRpcParams);
  }
  return txid as string;
}

function getVoutParam(jsonRpcParams: Partial<JSONRPCParams> | undefined) {
  const voutKey = "vout";
  if (isDictionary(jsonRpcParams) && voutKey in jsonRpcParams) {
    const vout = jsonRpcParams[voutKey];
    if (!isNumber(vout)) {
      throw new InvalidVout(jsonRpcParams);
    }
    return vout as unknown as number;
  }
  return undefined;
}

function getConsignment(recipientID: string): Consignment | null {
  const result = db
    .prepare("SELECT * FROM consignments WHERE recipient_id = ?")
    .get(recipientID) as ConsignmentDB | undefined;
  if (result) {
    return {
      recipientID: result.recipient_id,
      filename: result.filename,
      txid: result.txid,
      vout: result.vout ?? undefined,
      ack: result.ack !== null ? Boolean(result.ack) : undefined,
    };
  } else {
    return null;
  }
}

function getConsignmentOrFail(
  jsonRpcParams: Partial<JSONRPCParams> | undefined
): Consignment {
  const recipientID = getRecipientIDParam(jsonRpcParams);
  const consignment = getConsignment(recipientID);
  if (!consignment) {
    throw new NotFoundConsignment(jsonRpcParams);
  }
  return consignment;
}

function getMedia(attachmentID: string): Media | null {
  const result = db
    .prepare("SELECT * FROM media WHERE attachment_id = ?")
    .get(attachmentID) as Media | undefined;
  return result ?? null;
}

interface ServerParams {
  file: Express.Multer.File | undefined;
}

const jsonRpcServer: JSONRPCServer<ServerParams> =
  new JSONRPCServer<ServerParams>({
    errorListener: () => {
      /* avoid too verbose error logs */
    },
  });

jsonRpcServer.addMethod(
  "server.info",
  async (_jsonRpcParams, _serverParams): Promise<ServerInfo> => {
    return {
      protocol_version: PROTOCOL_VERSION,
      version: APP_VERSION,
      uptime: Math.trunc(process.uptime()),
    };
  }
);

jsonRpcServer.addMethod(
  "consignment.get",
  async (jsonRpcParams, _serverParams): Promise<ConsignmentGetRes> => {
    const consignment = getConsignmentOrFail(jsonRpcParams);
    const fileBuffer = fs.readFileSync(
      path.join(consignmentDir, consignment.filename)
    );
    return {
      consignment: fileBuffer.toString("base64"),
      txid: consignment.txid,
      vout: consignment.vout,
    };
  }
);

jsonRpcServer.addMethod(
  "consignment.post",
  async (jsonRpcParams, serverParams): Promise<boolean> => {
    const file = serverParams?.file;
    if (!file) {
      throw new MissingFile(jsonRpcParams);
    }
    try {
      const recipientID = getRecipientIDParam(jsonRpcParams);
      const txid = getTxidParam(jsonRpcParams);
      const vout = getVoutParam(jsonRpcParams);
      const uploadedFile = path.join(tempDir, file.filename);
      const fileHash = genHashFromFile(uploadedFile);
      const prevFile = getConsignment(recipientID);
      if (prevFile) {
        if (prevFile.filename === fileHash) {
          fs.unlinkSync(path.join(tempDir, file.filename));
          return false;
        } else {
          throw new CannotChangeUploadedFile(jsonRpcParams);
        }
      }
      fs.renameSync(uploadedFile, path.join(consignmentDir, fileHash));
      const insert = db.prepare(
        `INSERT INTO consignments (recipient_id, filename, txid, vout, ack)
         VALUES (?, ?, ?, ?, ?)`
      );
      insert.run(recipientID, fileHash, txid, vout, null);
      return true;
    } catch (e: unknown) {
      if (file) {
        const unhandledFile = path.join(tempDir, file.filename);
        if (fs.existsSync(unhandledFile)) {
          fs.unlinkSync(unhandledFile);
        }
      }
      throw e;
    }
  }
);

jsonRpcServer.addMethod(
  "media.get",
  async (jsonRpcParams, _serverParams): Promise<string> => {
    const attachmentID = getAttachmentIDParam(jsonRpcParams);
    const media = getMedia(attachmentID);
    if (!media) {
      throw new NotFoundMedia(jsonRpcParams);
    }
    const fileBuffer = fs.readFileSync(path.join(mediaDir, media.filename));
    return fileBuffer.toString("base64");
  }
);

jsonRpcServer.addMethod(
  "media.post",
  async (jsonRpcParams, serverParams): Promise<boolean> => {
    const file = serverParams?.file;
    try {
      const attachmentID = getAttachmentIDParam(jsonRpcParams);
      if (!file) {
        throw new MissingFile(jsonRpcParams);
      }
      const uploadedFile = path.join(tempDir, file.filename);
      const fileHash = genHashFromFile(uploadedFile);
      const prevFile = getMedia(attachmentID);
      if (prevFile) {
        if (prevFile.filename === fileHash) {
          fs.unlinkSync(path.join(tempDir, file.filename));
          return false;
        } else {
          throw new CannotChangeUploadedFile(jsonRpcParams);
        }
      }
      fs.renameSync(uploadedFile, path.join(mediaDir, fileHash));
      const insert = db.prepare(
        "INSERT INTO media (attachment_id, filename) VALUES (?, ?)"
      );
      insert.run(attachmentID, fileHash);
      return true;
    } catch (e: unknown) {
      if (file) {
        const unhandledFile = path.join(tempDir, file.filename);
        if (fs.existsSync(unhandledFile)) {
          fs.unlinkSync(unhandledFile);
        }
      }
      throw e;
    }
  }
);

jsonRpcServer.addMethod(
  "ack.get",
  async (jsonRpcParams, _serverParams): Promise<boolean | undefined> => {
    const consignment = getConsignmentOrFail(jsonRpcParams);
    return consignment.ack;
  }
);

jsonRpcServer.addMethod(
  "ack.post",
  async (jsonRpcParams, _serverParams): Promise<boolean> => {
    const consignment = getConsignmentOrFail(jsonRpcParams);
    const ack = getAckParam(jsonRpcParams);
    if (consignment.ack != null) {
      if (consignment.ack === ack) {
        return false;
      } else {
        throw new CannotChangeAck(jsonRpcParams);
      }
    }
    const update = db.prepare(
      "UPDATE consignments SET ack = ? WHERE recipient_id = ?"
    );
    update.run(ack ? 1 : 0, consignment.recipientID);
    return true;
  }
);

export const loadApiEndpoints = (app: Application): void => {
  // setup app directories
  appDir = process.env.APP_DATA || path.join(homedir(), DEFAULT_APP_DATA);
  setDir(appDir);
  tempDir = path.join(appDir, "tmp");
  consignmentDir = path.join(appDir, "consignments");
  mediaDir = path.join(appDir, "media");
  setDir(tempDir);
  setDir(consignmentDir);
  setDir(mediaDir);

  // setup DB
  db = new DatabaseConstructor(path.join(appDir, DATABASE_FILE), {});
  db.pragma("journal_mode = WAL");
  const createConsignmentsTable = db.prepare(
    `CREATE TABLE IF NOT EXISTS consignments (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       recipient_id TEXT NOT NULL UNIQUE,
       filename TEXT NOT NULL,
       txid TEXT NOT NULL,
       vout INTEGER,
       ack INTEGER
     )`
  );
  createConsignmentsTable.run();
  const createMediaTable = db.prepare(
    `CREATE TABLE IF NOT EXISTS media (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       attachment_id TEXT NOT NULL UNIQUE,
       filename TEXT NOT NULL
     )`
  );
  createMediaTable.run();

  // setup app route
  app.post(
    "/json-rpc",
    upload.single("file"),
    async (req: Request, res: Response) => {
      // request logs
      const jsonRPCRequest = req.body;
      let reqParams = "";
      if (jsonRPCRequest.params !== null) {
        if (isString(jsonRPCRequest.params)) {
          jsonRPCRequest.params = JSON.parse(jsonRPCRequest.params);
        }
        if (isDictionary(jsonRPCRequest.params)) {
          reqParams = joinEntries(jsonRPCRequest.params);
        }
      }
      httpContext.set("apiMethod", req.body["method"]);
      httpContext.set("reqParams", reqParams);
      httpContext.set("clientID", jsonRPCRequest.id);
      logger.info("", { req });

      // call API method
      const file = req.file;
      jsonRpcServer
        .receive(jsonRPCRequest, { file })
        .then((jsonRPCResponse) => {
          if (jsonRPCResponse) {
            // response logs
            let response = "";
            if (isErrorResponse(jsonRPCResponse)) {
              response =
                `err <code: ${jsonRPCResponse.error.code}, ` +
                `message: ${jsonRPCResponse.error.message}>`;
            } else {
              response = "res ";
              const result = jsonRPCResponse.result;
              if (isDictionary(result)) {
                response += joinEntries(result);
              } else {
                response += "<";
                if (isString(result)) {
                  response += truncateText(result);
                } else {
                  response += result;
                }
                response += ">";
              }
            }
            httpContext.set("response", response);

            // send response to client
            res.json(jsonRPCResponse);
          } else {
            // notification
            res.sendStatus(204);
          }

          // delete possibly unhandled file
          if (file) {
            const unhandledFile = path.join(tempDir, file.filename);
            if (fs.existsSync(unhandledFile)) {
              logger.warning(`Deleting unhandled file: ${unhandledFile}`);
              fs.unlinkSync(unhandledFile);
            }
          }
        });
    }
  );
};
