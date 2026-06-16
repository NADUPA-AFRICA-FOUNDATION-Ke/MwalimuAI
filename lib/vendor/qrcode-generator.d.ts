// Minimal type declarations for the vendored MIT qrcode-generator UMD module.
export interface QRCodeModel {
  addData(data: string): void
  make(): void
  getModuleCount(): number
  isDark(row: number, col: number): boolean
  /** GIF data URL built in pure JS (no canvas). */
  createDataURL(cellSize?: number, margin?: number): string
}

/** typeNumber 0 auto-sizes; errorCorrectionLevel is one of L/M/Q/H. */
declare const qrcode: (typeNumber: number, errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H') => QRCodeModel
export default qrcode
