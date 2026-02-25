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

  describe("consignment validation", () => {
    afterEach(() => {
      delete process.env.ELECTRUM_URL;
      delete process.env.MOCK_VALIDATION_RESULT;
      delete process.env.MOCK_VALIDATION_THROW;
    });

    async function postConsignment(recipientID: string) {
      const consignmentPath = path.join(tempDir, `val-${recipientID}`);
      fs.writeFileSync(consignmentPath, `consignment data ${recipientID}`);
      const res = await request(app)
        .post("/json-rpc")
        .set("Content-type", contentTypeForm)
        .field("jsonrpc", jsonrpcVersion)
        .field("id", "1")
        .field("method", "consignment.post")
        .field("params[recipient_id]", recipientID)
        .field("params[txid]", "validationTxid")
        .attach("file", fs.createReadStream(consignmentPath));
      return res;
    }

    async function getAck(recipientID: string) {
      const res = await request(app)
        .post("/json-rpc")
        .send({
          jsonrpc: jsonrpcVersion,
          id: "2",
          method: "ack.get",
          params: { recipient_id: recipientID },
        })
        .expect(okStatus);
      return res;
    }

    async function getConsignment(recipientID: string) {
      const res = await request(app)
        .post("/json-rpc")
        .send({
          jsonrpc: jsonrpcVersion,
          id: "3",
          method: "consignment.get",
          params: { recipient_id: recipientID },
        })
        .expect(okStatus);
      return res;
    }

    it("valid consignment is auto-ACKed", async () => {
      process.env.ELECTRUM_URL = "tcp://localhost:50001";
      process.env.MOCK_VALIDATION_RESULT = JSON.stringify({
        valid: true,
        warnings: [],
      });
      const recipientID = "valTest.valid";

      const postRes = await postConsignment(recipientID);
      expect(postRes.body.result).toStrictEqual(true);

      const ackRes = await getAck(recipientID);
      expect(ackRes.body.result).toStrictEqual(true);

      const getRes = await getConsignment(recipientID);
      expect(getRes.body.result.validated).toStrictEqual(true);
    });

    it("invalid consignment is auto-NACKed", async () => {
      process.env.ELECTRUM_URL = "tcp://localhost:50001";
      process.env.MOCK_VALIDATION_RESULT = JSON.stringify({ valid: false });
      const recipientID = "valTest.invalid";

      const postRes = await postConsignment(recipientID);
      expect(postRes.body.result).toStrictEqual(true);

      const ackRes = await getAck(recipientID);
      expect(ackRes.body.result).toStrictEqual(false);

      const getRes = await getConsignment(recipientID);
      expect(getRes.body.result.validated).toStrictEqual(false);
    });

    it("resolver error falls back to relay-only", async () => {
      process.env.ELECTRUM_URL = "tcp://localhost:50001";
      process.env.MOCK_VALIDATION_RESULT = JSON.stringify({
        valid: false,
        error: "resolver",
        details: "connection refused",
      });
      const recipientID = "valTest.resolver";

      const postRes = await postConsignment(recipientID);
      expect(postRes.body.result).toStrictEqual(true);

      const ackRes = await getAck(recipientID);
      expect(ackRes.body.result).toBeNull();

      const getRes = await getConsignment(recipientID);
      expect(getRes.body.result).not.toHaveProperty("validated");
    });

    it("validation exception falls back to relay-only", async () => {
      process.env.ELECTRUM_URL = "tcp://localhost:50001";
      process.env.MOCK_VALIDATION_THROW = "native addon crash";
      const recipientID = "valTest.throw";

      const postRes = await postConsignment(recipientID);
      expect(postRes.body.result).toStrictEqual(true);

      const ackRes = await getAck(recipientID);
      expect(ackRes.body.result).toBeNull();

      const getRes = await getConsignment(recipientID);
      expect(getRes.body.result).not.toHaveProperty("validated");
    });

    it("no ELECTRUM_URL skips validation", async () => {
      delete process.env.ELECTRUM_URL;
      const recipientID = "valTest.noElectrum";

      const postRes = await postConsignment(recipientID);
      expect(postRes.body.result).toStrictEqual(true);

      const ackRes = await getAck(recipientID);
      expect(ackRes.body.result).toBeNull();

      const getRes = await getConsignment(recipientID);
      expect(getRes.body.result).not.toHaveProperty("validated");
    });

    it("auto-ACK cannot be changed by receiver", async () => {
      process.env.ELECTRUM_URL = "tcp://localhost:50001";
      process.env.MOCK_VALIDATION_RESULT = JSON.stringify({
        valid: true,
        warnings: [],
      });
      const recipientID = "valTest.cannotChange";

      const postRes = await postConsignment(recipientID);
      expect(postRes.body.result).toStrictEqual(true);

      const ackRes = await getAck(recipientID);
      expect(ackRes.body.result).toStrictEqual(true);

      const changeRes = await request(app)
        .post("/json-rpc")
        .send({
          jsonrpc: jsonrpcVersion,
          id: "4",
          method: "ack.post",
          params: { recipient_id: recipientID, ack: false },
        })
        .expect(okStatus);
      expect(changeRes.body.error).toBeDefined();
      expect(changeRes.body.error.message).toStrictEqual("Cannot change ACK");
    });
  });
});
