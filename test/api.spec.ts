import fs from "fs";
import path from "path";
import request from "supertest";

import app from "../src/app";
import { loadApiEndpoints } from "../src/controllers/api";

const jsonrpcVersion = "2.0";
const okStatus = 200;
const contentTypeForm = "multipart/form-data";

// temporary test directory
const tempDir = fs.mkdtempSync(path.join(__dirname, "temp-"));
process.env.APP_DATA = path.join(tempDir, "app-data");

loadApiEndpoints(app);

afterAll(() => {
  // cleanup the temporary directory
  return fs.promises.rm(tempDir, { recursive: true, force: true });
});

describe("POST /json-rpc", () => {
  it("ack.post should succeed on 1st try then return false", async () => {
    const consignmentPath = path.join(tempDir, "ack.post");
    fs.writeFileSync(consignmentPath, "consignment ack binary data");
    let reqID = "1";
    const recipientID = "ackTest.post";
    const txid = "aTxid";
    let res = await request(app)
      .post("/json-rpc")
      .set("Content-type", contentTypeForm)
      .field("jsonrpc", jsonrpcVersion)
      .field("id", reqID)
      .field("method", "consignment.post")
      .field("params[recipient_id]", recipientID)
      .field("params[txid]", txid)
      .attach("file", fs.createReadStream(consignmentPath))
      .expect(okStatus);
    expect(res.body.result).toStrictEqual(true);

    reqID = "2";
    const method = "ack.post";
    let req = {
      jsonrpc: jsonrpcVersion,
      id: reqID,
      method: method,
      params: {
        recipient_id: recipientID,
        ack: true,
      },
    };
    res = await request(app).post("/json-rpc").send(req).expect(okStatus);
    expect(res.body.jsonrpc).toStrictEqual(jsonrpcVersion);
    expect(res.body.id).toStrictEqual(reqID);
    expect(res.body.result).toStrictEqual(true);

    reqID = "3";
    req = {
      jsonrpc: jsonrpcVersion,
      id: reqID,
      method: method,
      params: {
        recipient_id: recipientID,
        ack: true,
      },
    };
    res = await request(app).post("/json-rpc").send(req).expect(okStatus);
    expect(res.body.id).toStrictEqual(reqID);
    expect(res.body.result).toStrictEqual(false);
  });

  it("consignment.get should succeed", async () => {
    const consignmentPath = path.join(tempDir, "consignment.get");
    fs.writeFileSync(consignmentPath, "consignment get binary data");
    const consignment = fs.readFileSync(consignmentPath);
    const consignmentBase64 = consignment.toString("base64");
    let reqID = "1";
    const recipientID = "blindTest.get";
    const txid = "aTxid";
    let res = await request(app)
      .post("/json-rpc")
      .set("Content-type", contentTypeForm)
      .field("jsonrpc", jsonrpcVersion)
      .field("id", reqID)
      .field("method", "consignment.post")
      .field("params[recipient_id]", recipientID)
      .field("params[txid]", txid)
      .attach("file", fs.createReadStream(consignmentPath))
      .expect(okStatus);
    expect(res.body.result).toStrictEqual(true);

    reqID = "2";
    const req = {
      jsonrpc: jsonrpcVersion,
      id: reqID,
      method: "consignment.get",
      params: {
        recipient_id: recipientID,
      },
    };
    res = await request(app).post("/json-rpc").send(req).expect(okStatus);
    expect(res.body.jsonrpc).toStrictEqual(jsonrpcVersion);
    expect(res.body.id).toStrictEqual(reqID);
    expect(res.body.result.consignment).toStrictEqual(consignmentBase64);
    expect(res.body.result.txid).toStrictEqual(txid);
  });

  it("consignment.post should succeed on 1st try then return false", async () => {
    const consignmentPath = path.join(tempDir, "consignment.post");
    fs.writeFileSync(consignmentPath, "consignment post binary data");
    let reqID = "1";
    const method = "consignment.post";
    const recipientID = "blindTest.post";
    const txid = "aTxid";
    let res = await request(app)
      .post("/json-rpc")
      .set("Content-type", contentTypeForm)
      .field("jsonrpc", jsonrpcVersion)
      .field("id", reqID)
      .field("method", method)
      .field("params[recipient_id]", recipientID)
      .field("params[txid]", txid)
      .attach("file", fs.createReadStream(consignmentPath))
      .expect(okStatus);
    expect(res.body.jsonrpc).toStrictEqual(jsonrpcVersion);
    expect(res.body.id).toStrictEqual(reqID);
    expect(res.body.result).toStrictEqual(true);

    reqID = "2";
    res = await request(app)
      .post("/json-rpc")
      .set("Content-type", contentTypeForm)
      .field("jsonrpc", jsonrpcVersion)
      .field("id", reqID)
      .field("method", method)
      .field("params[recipient_id]", recipientID)
      .field("params[txid]", txid)
      .attach("file", fs.createReadStream(consignmentPath))
      .expect(okStatus);
    expect(res.body.id).toStrictEqual(reqID);
    expect(res.body.result).toStrictEqual(false);
  });

  it("media.get should succeed", async () => {
    const mediaPath = path.join(tempDir, "media.post");
    fs.writeFileSync(mediaPath, "media get binary data");
    const media = fs.readFileSync(mediaPath);
    const mediaBase64 = media.toString("base64");
    let reqID = "1";
    const attachmentID = "mediaTest.get";
    let res = await request(app)
      .post("/json-rpc")
      .set("Content-type", contentTypeForm)
      .field("jsonrpc", jsonrpcVersion)
      .field("id", reqID)
      .field("method", "media.post")
      .field("params[attachment_id]", attachmentID)
      .attach("file", fs.createReadStream(mediaPath))
      .expect(okStatus);
    expect(res.body.result).toStrictEqual(true);

    reqID = "2";
    const req = {
      jsonrpc: jsonrpcVersion,
      id: reqID,
      method: "media.get",
      params: {
        attachment_id: attachmentID,
      },
    };
    res = await request(app).post("/json-rpc").send(req).expect(okStatus);
    expect(res.body.jsonrpc).toStrictEqual(jsonrpcVersion);
    expect(res.body.id).toStrictEqual(reqID);
    expect(res.body.result).toStrictEqual(mediaBase64);
  });

  it("media.post should succeed on 1st try then return false", async () => {
    const mediaPath = path.join(tempDir, "media.post");
    fs.writeFileSync(mediaPath, "media post binary data");
    let reqID = "1";
    const method = "media.post";
    const attachmentID = "mediaTest.post";
    let res = await request(app)
      .post("/json-rpc")
      .set("Content-type", contentTypeForm)
      .field("jsonrpc", jsonrpcVersion)
      .field("id", reqID)
      .field("method", method)
      .field("params[attachment_id]", attachmentID)
      .attach("file", fs.createReadStream(mediaPath))
      .expect(okStatus);
    expect(res.body.jsonrpc).toStrictEqual(jsonrpcVersion);
    expect(res.body.id).toStrictEqual(reqID);
    expect(res.body.result).toStrictEqual(true);
    reqID = "2";
    res = await request(app)
      .post("/json-rpc")
      .set("Content-type", contentTypeForm)
      .field("jsonrpc", jsonrpcVersion)
      .field("id", reqID)
      .field("method", method)
      .field("params[attachment_id]", attachmentID)
      .attach("file", fs.createReadStream(mediaPath))
      .expect(okStatus);
    expect(res.body.id).toStrictEqual(reqID);
    expect(res.body.result).toStrictEqual(false);
  });

  it("server.info should succeed", async () => {
    const reqID = 1;
    const req = {
      jsonrpc: jsonrpcVersion,
      id: reqID,
      method: "server.info",
    };
    const res = await request(app).post("/json-rpc").send(req).expect(okStatus);
    expect(res.body.jsonrpc).toStrictEqual(jsonrpcVersion);
    expect(res.body.id).toStrictEqual(reqID);
    expect(res.body.result.protocol_version).toStrictEqual("0.2");
  });
});

describe("consignment validation", () => {
  // Helper to wait for the setImmediate validation callback to fire
  const waitForValidation = () =>
    new Promise((resolve) => setImmediate(resolve));

  // Helper to poll until ack is set (non-null) or timeout
  async function waitForAckSet(recipientID: string, timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      await waitForValidation();
      const res = await request(app)
        .post("/json-rpc")
        .send({
          jsonrpc: jsonrpcVersion,
          id: "poll",
          method: "ack.get",
          params: { recipient_id: recipientID },
        })
        .expect(okStatus);
      if (res.body.result !== null && res.body.result !== undefined) {
        return res.body.result;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`Timeout waiting for ack on ${recipientID}`);
  }

  // Helper to post a consignment and get the ack
  async function postConsignment(recipientID: string, content: string) {
    const filePath = path.join(tempDir, `validation-${recipientID}`);
    fs.writeFileSync(filePath, content);
    const res = await request(app)
      .post("/json-rpc")
      .set("Content-type", contentTypeForm)
      .field("jsonrpc", jsonrpcVersion)
      .field("id", "1")
      .field("method", "consignment.post")
      .field("params[recipient_id]", recipientID)
      .field("params[txid]", "validationTxid")
      .attach("file", fs.createReadStream(filePath))
      .expect(okStatus);
    return res;
  }

  async function getAck(recipientID: string) {
    await waitForValidation();
    const res = await request(app)
      .post("/json-rpc")
      .send({
        jsonrpc: jsonrpcVersion,
        id: "2",
        method: "ack.get",
        params: { recipient_id: recipientID },
      })
      .expect(okStatus);
    return res.body.result;
  }

  afterEach(() => {
    delete process.env.INDEXER_URL;
    delete process.env.BITCOIN_NETWORK;
    delete process.env.MOCK_VALIDATION_RESULT;
    delete process.env.MOCK_VALIDATION_THROW;
  });

  it("valid consignment should auto-ACK", async () => {
    process.env.INDEXER_URL = "http://localhost:3002";
    process.env.MOCK_VALIDATION_RESULT = JSON.stringify({
      valid: true,
      failureReason: null,
    });
    const recipientID = "validation.valid";
    const res = await postConsignment(recipientID, "valid consignment data");
    expect(res.body.result).toStrictEqual(true);
    const ack = await getAck(recipientID);
    expect(ack).toStrictEqual(true);
  });

  it("invalid consignment should auto-NACK", async () => {
    process.env.INDEXER_URL = "http://localhost:3002";
    process.env.MOCK_VALIDATION_RESULT = JSON.stringify({
      valid: false,
      failureReason: "invalid schema",
    });
    const recipientID = "validation.invalid";
    const res = await postConsignment(recipientID, "invalid consignment data");
    expect(res.body.result).toStrictEqual(true);
    const ack = await waitForAckSet(recipientID);
    expect(ack).toStrictEqual(false);
  }, 20000);

  it("resolver error should fall back to relay-only (ack stays null)", async () => {
    process.env.INDEXER_URL = "http://localhost:3002";
    process.env.MOCK_VALIDATION_THROW = "resolver connection refused";
    const recipientID = "validation.resolver-error";
    const res = await postConsignment(
      recipientID,
      "resolver error consignment"
    );
    expect(res.body.result).toStrictEqual(true);
    // Wait for all retries to exhaust
    await new Promise((resolve) => setTimeout(resolve, 12000));
    const ack = await getAck(recipientID);
    expect(ack).toBeNull();
  }, 20000);

  it("validation exception should fall back to relay-only (ack stays null)", async () => {
    process.env.INDEXER_URL = "http://localhost:3002";
    process.env.MOCK_VALIDATION_THROW = "unexpected internal error";
    const recipientID = "validation.exception";
    const res = await postConsignment(
      recipientID,
      "exception consignment data"
    );
    expect(res.body.result).toStrictEqual(true);
    // Wait for all retries to exhaust
    await new Promise((resolve) => setTimeout(resolve, 12000));
    const ack = await getAck(recipientID);
    expect(ack).toBeNull();
  }, 20000);

  it("no INDEXER_URL should skip validation (ack stays null)", async () => {
    // INDEXER_URL not set
    const recipientID = "validation.no-indexer";
    const res = await postConsignment(
      recipientID,
      "no indexer consignment data"
    );
    expect(res.body.result).toStrictEqual(true);
    const ack = await getAck(recipientID);
    expect(ack).toBeNull();
  });

  it("auto-ACK cannot be changed by receiver", async () => {
    process.env.INDEXER_URL = "http://localhost:3002";
    process.env.MOCK_VALIDATION_RESULT = JSON.stringify({
      valid: true,
      failureReason: null,
    });
    const recipientID = "validation.no-change";
    await postConsignment(recipientID, "no change consignment data");
    await waitForValidation();

    // Try to change ACK via ack.post
    const res = await request(app)
      .post("/json-rpc")
      .send({
        jsonrpc: jsonrpcVersion,
        id: "3",
        method: "ack.post",
        params: { recipient_id: recipientID, ack: false },
      })
      .expect(okStatus);
    // Should get error -100 (CannotChangeAck)
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toStrictEqual(-100);
  });

  it("receiver manual ACK is not overwritten by late validation", async () => {
    // Don't set INDEXER_URL for initial post (no auto-validation)
    const recipientID = "validation.manual-first";
    await postConsignment(recipientID, "manual first consignment data");
    await waitForValidation();

    // Receiver manually ACKs
    const ackRes = await request(app)
      .post("/json-rpc")
      .send({
        jsonrpc: jsonrpcVersion,
        id: "3",
        method: "ack.post",
        params: { recipient_id: recipientID, ack: true },
      })
      .expect(okStatus);
    expect(ackRes.body.result).toStrictEqual(true);

    // Verify the manual ACK is preserved
    const ack = await getAck(recipientID);
    expect(ack).toStrictEqual(true);
  });
});
