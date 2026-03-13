declare module "@utexo/rgb-lib" {
  interface ValidationResult {
    valid: boolean;
    warnings?: string[];
    error?: "invalid" | "resolver";
    details?: string;
  }

  interface RgbLib {
    validateConsignment(
      filePath: string,
      indexerUrl: string,
      network: string
    ): ValidationResult;
    validateConsignmentOffchain(
      filePath: string,
      txid: string,
      indexerUrl: string,
      network: string
    ): ValidationResult;
  }

  const rgblib: RgbLib;
  export default rgblib;
}
