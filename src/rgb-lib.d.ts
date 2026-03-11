declare module "@utexo/rgb-lib" {
  interface ValidationResult {
    valid: boolean;
    failureReason: string | null;
  }

  interface RgbLib {
    validateConsignment(
      filePath: string,
      indexerUrl: string,
      network: string
    ): ValidationResult;
  }

  const rgblib: RgbLib;
  export default rgblib;
}
