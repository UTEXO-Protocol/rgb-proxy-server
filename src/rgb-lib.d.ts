declare module "@utexo/rgb-lib" {
  interface ValidationResult {
    valid: boolean;
    error?: string;
    details?: string;
    warnings?: string[];
  }

  function validateConsignment(
    filePath: string,
    indexerUrl: string,
    bitcoinNetwork: string
  ): ValidationResult;
}
