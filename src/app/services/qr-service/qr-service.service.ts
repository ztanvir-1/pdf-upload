import { Injectable } from '@angular/core';
import QRCode from 'qrcode';

@Injectable({
  providedIn: 'root'
})
export class QrCodeGeneratorService  {

  constructor() { }

  generateQrCode(text: string): Promise<string> {
    return QRCode.toDataURL(text, { width: 200, margin: 2 }); // Generate QR code with options
  }
}
