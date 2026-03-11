// Mock for @utexo/rgb-lib
// Controlled by environment variables:
//   MOCK_VALIDATION_RESULT - JSON string, e.g. '{"valid":true,"failureReason":null}'
//   MOCK_VALIDATION_THROW  - if set, validateConsignment throws with this message

module.exports = {
  __esModule: true,
  default: {
    validateConsignment(_filePath, _indexerUrl, _network) {
      if (process.env.MOCK_VALIDATION_THROW) {
        throw new Error(process.env.MOCK_VALIDATION_THROW);
      }
      if (process.env.MOCK_VALIDATION_RESULT) {
        return JSON.parse(process.env.MOCK_VALIDATION_RESULT);
      }
      return { valid: true, failureReason: null };
    },
  },
};
