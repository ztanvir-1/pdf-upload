import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatStepperModule } from '@angular/material/stepper';
import { RouterModule } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { saveAs } from 'file-saver';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.mjs';
import { MatButtonToggle, MatButtonToggleModule } from '@angular/material/button-toggle';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { QrCodeGeneratorService } from '../services/qr-service/qr-service.service';
import { ApiService } from '../services/http/http-service';
import { PdfUploadRequest } from '../models/pdfUploadRequest';

interface Coords {
  x: number;
  y: number;
}

@Component({
  selector: 'app-pdf-logo-uploader',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatStepperModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './pdf-logo-uploader.component.html',
  styleUrls: ['./pdf-logo-uploader.component.scss']
})

export class PdfLogoUploaderComponent implements OnInit{
  firstFormGroup: FormGroup;
  secondFormGroup: FormGroup;

  pdfFile: File | null = null;
  logo: File | null = null;
  logoUrl: string | null = null;
  pdfWithLogoUrl: SafeResourceUrl | null = null;

  maxWidth: number = 300;
  maxHeight: number = 300;
  currentWidth: number = 100;
  currentHeight: number = 100;
  resizeError: string = '';
  isOverLimit: boolean = false;  // Track if dimensions exceed the limit

  private isResizing = false;
  private resizeSubject = new Subject<void>();
  isProcessing: boolean = false;
  unsafeUrl: string= "";
  qrCodeDataUrl: string = "";
  selectedColor: string = "";
  showColorPicker: boolean = false;

  constructor(private apiService:ApiService, private _formBuilder: FormBuilder, private sanitizer: DomSanitizer, private qrCodeGenerator:QrCodeGeneratorService) {
    this.firstFormGroup = this._formBuilder.group({
      pdfFile: ['', Validators.required],
      logoFile: ['', Validators.required],

      partnerUrl: ['', Validators.required],
      partnerFontSize: ['', Validators.required],
      partnerFontFamily: ['', Validators.required],
      partnerFontStyle: ['', Validators.required],
      partnerColor: ['#ffffff', Validators.required],

      // accountName: ['', Validators.required],
      // accountFontSize: ['', Validators.required],
      // accountFontFamily: ['', Validators.required],
      // accountFontStyle: ['', Validators.required],
      // accountColor: ['', Validators.required]

    });

    this.secondFormGroup = this._formBuilder.group({
      maxWidth: [this.maxWidth, Validators.required],
      maxHeight: [this.maxHeight, Validators.required]
    });

    this.resizeSubject.pipe(debounceTime(300)).subscribe(() => {
      this.checkResizeLimits();
    });

    this.selectedColor = this.firstFormGroup.get('partnerColor')?.value;
  }

  ngOnInit(){

  }

  onPdfFileSelected(event: any) {
    this.pdfFile = event.target.files[0];
     // Manually update the form control value and validity
    this.firstFormGroup.patchValue({
      pdfFile: this.pdfFile ? this.pdfFile.name : ''
    });
    this.firstFormGroup.get('pdfFile')?.updateValueAndValidity();
  }

  onLogoFileSelected(event: any) {
    this.logo = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.logoUrl = e.target.result;
      this.currentWidth = this.maxWidth;
      this.currentHeight = this.maxHeight;
      this.resizeError = '';
      this.isOverLimit = false;
    };
    this.firstFormGroup.patchValue({
      logoFile: this.logo ? this.logo.name : ''
    });
    this.firstFormGroup.get('logoFile')?.updateValueAndValidity();
    if (this.logo) reader.readAsDataURL(this.logo);
  }

  onResizeStart(event: MouseEvent) {
    this.isResizing = true;
    event.preventDefault();

    const initialX = event.clientX;
    const initialY = event.clientY;
    const initialWidth = this.currentWidth;
    const initialHeight = this.currentHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.isResizing) return;

      const deltaX = moveEvent.clientX - initialX;
      const deltaY = moveEvent.clientY - initialY;

      const newWidth = Math.max(initialWidth + deltaX, 1);  // Ensure positive width
      const newHeight = Math.max(initialHeight + deltaY, 1);  // Ensure positive height

      this.currentWidth = newWidth;
      this.currentHeight = newHeight;
      this.resizeSubject.next();
    };

    const onMouseUp = () => {
      this.isResizing = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      this.checkResizeLimits();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  applyDimensions() {
    // Apply the dimensions from the form
    this.maxWidth = this.secondFormGroup.get('maxWidth')?.value || this.maxWidth;
    this.maxHeight = this.secondFormGroup.get('maxHeight')?.value || this.maxHeight;

    this.currentWidth = this.maxWidth;
    this.currentHeight = this.maxHeight;

    this.checkResizeLimits();
  }

  checkResizeLimits() {
    // Check if current dimensions exceed max allowed dimensions
    if (this.currentWidth > this.maxWidth || this.currentHeight > this.maxHeight) {
      this.resizeError = `Dimensions exceed max limits: ${this.maxWidth}x${this.maxHeight}px`;
      this.isOverLimit = true;  // Indicate that dimensions are over the limit
    } else {
      this.resizeError = '';
      this.isOverLimit = false;
    }

    // Ensure dimensions are within the minimum valid size (prevent image from disappearing)
    this.currentWidth = Math.max(this.currentWidth, 1);
    this.currentHeight = Math.max(this.currentHeight, 1);
  }


  async replaceLogoAndUrlInPdf() {
    if (!this.pdfFile || !this.logo || !this.firstFormGroup.get('partnerUrl')?.value) return;

    this.isProcessing = true; // Start processing

    try {
        // Create a copy of the ArrayBuffer to avoid detachment issues
        const pdfBytes = await this.pdfFile.arrayBuffer();
        const pdfBytesCopy = this.copyArrayBuffer(pdfBytes);

        // Load the PDF using PDF.js to extract text
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytesCopy });
        const pdfDocument = await loadingTask.promise;

        // Prepare to modify the PDF using PDF-Lib with the original buffer
        const pdfDoc = await PDFDocument.load(this.copyArrayBuffer(pdfBytes));

        // Load the logo image
        const logoBytes = await this.logo.arrayBuffer();

        let logoImage;
        if (this.logo.type === 'image/png') {
          logoImage = await pdfDoc.embedPng(logoBytes);
        } else if (this.logo.type === 'image/jpeg' || this.logo.type === 'image/jpg') {
            logoImage = await pdfDoc.embedJpg(logoBytes);
        } else {
            throw new Error('Unsupported image format. Please upload a PNG or JPEG image.');
        }


        const pages = pdfDoc.getPages();

        const fontStyle = this.firstFormGroup.get('partnerFontStyle')?.value;
        let font;
        if (fontStyle === 'bold') {
            font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        } else if (fontStyle === 'italic') {
            font = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
        } else {
            font = await pdfDoc.embedFont(StandardFonts.Helvetica); // Default to normal
        }

        for (let i = 0; i < pdfDocument.numPages; i++) {
            const page = await pdfDocument.getPage(i + 1);  // Get each page
            const textContent = await page.getTextContent();

            let partnerTextCoords: any | null = null;
            let urlTextCoords: any | null = null;

            textContent.items.forEach((item: any) => {
                if (item.str === 'PROUD PARTNER') {
                    partnerTextCoords = { x: item.transform[4], y: item.transform[5] };
                }
                if (item.str === 'info.globalrescue.com/partner') {
                    urlTextCoords = { x: item.transform[4], y: item.transform[5] };
                }
            });

            // Modify the page if the required text is found
            if (partnerTextCoords || urlTextCoords) {
                const firstPage = pages[i];  // Corresponding page in PDF-Lib

                // Replace the logo at the "PROUD PARTNER" position
                const scaledWidth = Math.min(this.currentWidth, firstPage.getWidth());
                const scaledHeight = Math.min(this.currentHeight, firstPage.getHeight());

                if(partnerTextCoords){
                  firstPage.drawImage(logoImage, {
                      x: partnerTextCoords.x,
                      y: partnerTextCoords.y - scaledHeight,
                      width: scaledWidth,
                      height: scaledHeight
                  });
                }

                if(urlTextCoords){
                   // Erase the original text by drawing a white rectangle over it
                   firstPage.drawRectangle({
                    x: urlTextCoords.x,
                    y: urlTextCoords.y - 3,
                    width: 180,  // Adjust to match the length of the original text
                    height: 12,  // Adjust to match the height of the original text
                    color: rgb(0, 0, 0)
                });

                //Draw the new partner URL text
                const hexColor = this.firstFormGroup.get('partnerColor')?.value;
                const rgbColor = this.hexToRgb(hexColor);
                const fontsize = this.firstFormGroup.get('partnerFontSize')?.value;
                firstPage.drawText(this.firstFormGroup.get('partnerUrl')?.value, {
                    x: urlTextCoords.x,
                    y: urlTextCoords.y,
                    size: fontsize,
                    font: font,
                    color: rgb(rgbColor.r/255, rgbColor.g/255, rgbColor.b/255),
                });

                // Draw an underline if needed
                if (fontStyle === 'underline') {
                  const textWidth = font.widthOfTextAtSize(this.firstFormGroup.get('partnerUrl')?.value, fontsize);
                  const underlineY = urlTextCoords.y - 2; // Slightly below the text
                  firstPage.drawLine({
                      start: { x: urlTextCoords.x, y: underlineY },
                      end: { x: urlTextCoords.x + textWidth, y: underlineY },
                      thickness: 1,
                      color: rgb(rgbColor.r / 255, rgbColor.g / 255, rgbColor.b / 255),
                  });
                }
              }
            }
        }

        // Save the modified PDF
        const modifiedPdfBytes = await pdfDoc.save();
        const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
        this.unsafeUrl = URL.createObjectURL(blob);
        this.pdfWithLogoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.unsafeUrl);
        // Generate QR code for the partner URL after replacing the logo and URL in the PDF
        if (this.firstFormGroup.get('partnerUrl')?.value) {
          this.qrCodeDataUrl = await this.qrCodeGenerator.generateQrCode(this.firstFormGroup.get('partnerUrl')?.value);
        }

    } catch (error) {
        console.error('An error occurred while processing the PDF:', error);
    }
    finally {
      this.isProcessing = false;
    }
}

arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

async replaceLogoAndUrlInPdfRequest() {
  if (!this.pdfFile || !this.logo || !this.firstFormGroup.get('partnerUrl')?.value)
    return;

  this.isProcessing = true; // Start processing

  try {
      // Create a copy of the ArrayBuffer to avoid detachment issues
      const pdfBytes = await this.pdfFile.arrayBuffer();
      const pdfBytesCopy = this.copyArrayBuffer(pdfBytes);

      // Load the PDF using PDF.js to extract text
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytesCopy });
      const pdfDocument = await loadingTask.promise;

      // Prepare to modify the PDF using PDF-Lib with the original buffer
      const pdfDoc = await PDFDocument.load(this.copyArrayBuffer(pdfBytes));

      // Load the logo image
      const logoBytes = await this.logo.arrayBuffer();

      // let logoImage;
      // if (this.logo.type === 'image/png') {
      //   logoImage = await pdfDoc.embedPng(logoBytes);
      // } else if (this.logo.type === 'image/jpeg' || this.logo.type === 'image/jpg') {
      //     logoImage = await pdfDoc.embedJpg(logoBytes);
      // } else {
      //     throw new Error('Unsupported image format. Please upload a PNG or JPEG image.');
      // }

      let req:PdfUploadRequest = {
        pdfBytes: this.arrayBufferToBase64(pdfBytes),
        logoBytes: this.arrayBufferToBase64(logoBytes),
        partnerUrl: this.firstFormGroup.get('partnerUrl')?.value
      };
      this.apiService.postData<PdfUploadRequest, any>('Pdf/processOcr', req, { responseType: 'blob' as 'json' }).subscribe({
      next: (res) => {
        if (res) {
          console.log("Successful response");
          // Save the modified PDF
          const blob = new Blob([res], { type: 'application/pdf' });
          this.unsafeUrl = URL.createObjectURL(blob);
          this.pdfWithLogoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.unsafeUrl);
          // Generate QR code for the partner URL after replacing the logo and URL in the PDF
          if (this.firstFormGroup.get('partnerUrl')?.value) {
              this.qrCodeGenerator.generateQrCode(this.firstFormGroup.get('partnerUrl')?.value).then(url=>{
                this.qrCodeDataUrl = url;
            });
          }
        }
        else {
          console.log("Bad response");
        }
      },
      error: (err) => {
        console.log("Error occurred while calling Pdf/process: ", err);
      },
      complete: () => {
        console.log("Request completed");
        this.isProcessing = false;
        // Optional: This will be called when the observable completes
      }
    });
  } catch (error) {
      console.error('An error occurred while processing the PDF:', error);
      this.isProcessing = false;
  }
  // finally {
  //   this.isProcessing = false;
  // }
}

//   async replaceLogoAndUrlInPdf() {
//     if (!this.pdfFile || !this.logo || !this.firstFormGroup.get('partnerUrl')?.value) return;

//     try {
//         const pdfBytes = await this.pdfFile.arrayBuffer();
//         const logoBytes = await this.logo.arrayBuffer();

//         // Load the PDF using pdfjs-dist
//         const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
//         const pdfDocument = await loadingTask.promise;

//         let partnerTextCoords: any | null = null;
//         let urlTextCoords: any | null = null;

//         // Extract text and find coordinates
//         const page = await pdfDocument.getPage(1);
//         const textContent = await page.getTextContent();

//         textContent.items.forEach((item: any) => {
//             if (item.str === 'PROUD PARTNER') {
//                 partnerTextCoords = { x: item.transform[4], y: item.transform[5] };
//             }
//             if (item.str === 'info.globalrescue.com/partner') {
//                 urlTextCoords = { x: item.transform[4], y: item.transform[5] };
//             }
//         });

//         // Type guard to ensure coordinates are found before use
//         if (!partnerTextCoords || !urlTextCoords) {
//             throw new Error('Could not find the required text in the PDF.');
//         }

//         // Load the PDF using pdf-lib for modification
//         const pdfDoc = await PDFDocument.load(pdfBytes);
//         const logoImage = await pdfDoc.embedPng(logoBytes);

//         const pages = pdfDoc.getPages();
//         const firstPage = pages[0];
//         const { width, height } = firstPage.getSize();

//         // Replace the logo at the "PROUD PARTNER" position
//         const scaledWidth = Math.min(this.currentWidth, width);
//         const scaledHeight = Math.min(this.currentHeight, height);

//         firstPage.drawImage(logoImage, {
//             x: partnerTextCoords.x,
//             y: partnerTextCoords.y - scaledHeight, // Adjust to align with text
//             width: scaledWidth,
//             height: scaledHeight
//         });

//         // Replace the URL text
//         firstPage.drawText(this.firstFormGroup.get('partnerUrl')?.value, {
//             x: urlTextCoords.x,
//             y: urlTextCoords.y,
//             size: 12,
//             color: rgb(0, 0, 0) // Black color
//         });

//         // Save the modified PDF
//         const modifiedPdfBytes = await pdfDoc.save();
//         const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
//         this.pdfWithLogoUrl = URL.createObjectURL(blob);
//     } catch (error) {
//         console.error('An error occurred while processing the PDF:', error);
//     }
// }


  downloadPdf() {
    if (this.unsafeUrl) {
      saveAs(this.unsafeUrl, 'modified.pdf');
    }
  }

  copyArrayBuffer(buffer: ArrayBuffer): ArrayBuffer {
    return buffer.slice(0);
  }

  onStepChange(event: StepperSelectionEvent) {
    // Check if the user has navigated to Step 3 (zero-based index)
    if (event.selectedIndex === 2) {
      // Call the method to replace logo and URL in the PDF
      this.replaceLogoAndUrlInPdf();
      //this.replaceLogoAndUrlInPdfRequest();
    }
  }

  hexToRgb(hex: string): { r: number, g: number, b: number } {
    // Remove the hash at the start if it's there
    hex = hex.replace(/^#/, '');

    // Parse the r, g, b values
    let bigint = parseInt(hex, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;

    return { r, g, b };
  }

  toggleColorPicker(): void {
    this.showColorPicker = !this.showColorPicker;
  }

  onColorChange(color: any): void {
    this.selectedColor = color;
    this.firstFormGroup.patchValue({ partnerColor: color });
  }
}
