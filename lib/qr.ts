// Typed wrapper around the vendored MIT QR generator (kazuhikoarase/
// qrcode-generator). Vendored instead of npm-installed because this repo's
// workspace setup rejects a plain `npm install`.
import qrcode, { type QRCodeModel } from './vendor/qrcode-generator.js'

/** Build a QR code from text. typeNumber 0 auto-sizes to fit the data. */
export function makeQR(text: string, ec: 'L' | 'M' | 'Q' | 'H' = 'M'): QRCodeModel {
  const qr = qrcode(0, ec)
  qr.addData(text)
  qr.make()
  return qr
}
