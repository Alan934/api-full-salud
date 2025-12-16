import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as bwipjs from 'bwip-js';

export async function generateBarcode(code: string, format: string, outputPath: string): Promise<string> {
    try {
        const canvas = createCanvas(200, 100); // Ajusta el tamaño según sea necesario
        JsBarcode(canvas, code, {
            format: format,
            displayValue: true, // Muestra el valor del código debajo del código de barras
            width: 2, // Ajusta el ancho de las barras
            height: 50, // Ajusta la altura del código de barras
        });
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        return outputPath; // Devuelve la ruta de salida
    } catch (error) {
        throw error; // Lanza el error para que pueda ser manejado por el llamador
    }
}

export async function generateQRCode(data: string, outputPath: string): Promise<string> {
    try {
      await QRCode.toFile(outputPath, data, {
        errorCorrectionLevel: 'H', // Nivel de corrección de errores (L, M, Q, H)
        margin: 1, // Margen alrededor del código QR
        width: 200, // Ancho del código QR en píxeles
      });
      return outputPath;
    } catch (error) {
      throw error;
    }
  }

  export async function generateBarcodeBuffer(codeToEncode, barcodeFormat) {
    try {
      const png = await bwipjs.toBuffer({
        bcid: barcodeFormat,
        text: codeToEncode,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
      });
      return png;
    } catch (error) {
      throw error;
    }
  }

  export async function generateQRCodeBuffer(text) {
    try {
    const qrCodeBuffer = await QRCode.toBuffer(text, { type: 'png' });
    return qrCodeBuffer;
    } catch (error) {
    throw error;
    }
  }