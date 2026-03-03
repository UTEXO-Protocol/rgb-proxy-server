module.exports = {
  validateConsignment: function (_filePath, _indexerUrl, _bitcoinNetwork) {
    const mockThrow = process.env.MOCK_VALIDATION_THROW;
    if (mockThrow) {
      throw new Error(mockThrow);
    }
    const mockResult = process.env.MOCK_VALIDATION_RESULT;
    if (mockResult) {
      return JSON.parse(mockResult);
    }
    return { valid: true, warnings: [] };
  },
};
