import { Component } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import * as fabric from 'fabric';
import { jsPDF } from 'jspdf';
import 'pdfjs-dist/build/pdf.worker.mjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pdf-logo2',
  templateUrl: './pdf-logo-2.component.html',
  styleUrls: ['./pdf-logo-2.component.scss'],
  standalone:true,
  imports: [FormsModule, CommonModule],
})

export class PdfLogo2Component {
  pdfDoc: any; // To store the PDF document
  fabricCanvas: fabric.Canvas | null = null; // Fabric.js canvas for the PDF
  selectedOption: string = ''; // Dropdown selected value
  uploadedLogo: fabric.Image | null = null; // Store the uploaded logo
  inputText: string = ''; // Hold text input value
  selectedFontSize: number = 16; // Default font size
  scale = 1; // Scale for PDF rendering
  pageCount: number = 0; // Number of pages in PDF

  ngOnInit() {
    // Initialize Fabric.js canvas
    const canvasElement = document.getElementById('fabricCanvas') as HTMLCanvasElement;
    this.fabricCanvas = new fabric.Canvas(canvasElement, {
      selection: true,
    });
  }

  // // Handle PDF upload
  onPdfUpload(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      const fileReader = new FileReader();
      fileReader.onload = () => {
        const typedArray = new Uint8Array(fileReader.result as ArrayBuffer);
        this.loadPdf(typedArray);
      };
      fileReader.readAsArrayBuffer(file);
    }
  }

  // // Load and render PDF into the Fabric.js canvas
  // async loadPdf(data: Uint8Array) {
  //   this.fabricCanvas!.clear(); // Clear the Fabric.js canvas before rendering the PDF

  //   this.pdfDoc = await pdfjsLib.getDocument({ data }).promise;
  //   this.pageCount = this.pdfDoc.numPages;

  //   // if (!this.pageCount) {
  //   //   console.error('PDF loading error: no pages found');
  //   //   return;
  //   // }

  //   // Render the first page of the PDF into Fabric.js
  //   const page = await this.pdfDoc.getPage(1);
  //   const viewport = page.getViewport({ scale: this.scale });

  //   // Resize the Fabric.js canvas to fit the PDF page
  //   this.fabricCanvas!.setWidth(viewport.width);
  //   this.fabricCanvas!.setHeight(viewport.height);

  //   // Create a temporary canvas to render the PDF page as an image
  //   const pdfCanvas = document.createElement('canvas');
  //   const context = pdfCanvas.getContext('2d')!;
  //   pdfCanvas.width = viewport.width;
  //   pdfCanvas.height = viewport.height;

  //   // Render the PDF page onto the temporary canvas
  //   await page.render({ canvasContext: context, viewport }).promise;

  //   // Convert the rendered PDF page to an image and add it to the Fabric.js canvas
  //   const imgURL = pdfCanvas.toDataURL();
  //   const backgroundImage = await fabric.FabricImage.fromURL(imgURL);
  //   this.fabricCanvas!.backgroundImage = backgroundImage; // Set the background image
  //   this.fabricCanvas!.renderAll(); // Trigger a re-render to apply the background

  //   console.log('PDF rendered onto the Fabric.js canvas.');
  // }

  // Load and render all PDF pages into the Fabric.js canvas
  async loadPdf(data: Uint8Array) {
    this.fabricCanvas!.clear(); // Clear the Fabric.js canvas before rendering the PDF

    this.pdfDoc = await pdfjsLib.getDocument({ data }).promise;
    const pageCount = this.pdfDoc.numPages;

    let totalHeight = 0; // Accumulate the height of all PDF pages
    const canvasWidth = (await this.pdfDoc.getPage(1)).getViewport({ scale: this.scale }).width;

    // Render each page in sequence and append it to the canvas
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      const page = await this.pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: this.scale });

      // Create a temporary canvas to render the PDF page as an image
      const pdfCanvas = document.createElement('canvas');
      const context = pdfCanvas.getContext('2d')!;
      pdfCanvas.width = viewport.width;
      pdfCanvas.height = viewport.height;

      // Render the PDF page onto the temporary canvas
      await page.render({ canvasContext: context, viewport }).promise;

      // Convert the rendered PDF page to an image and add it to the Fabric.js canvas
      const imgURL = pdfCanvas.toDataURL();
      const img = await fabric.FabricImage.fromURL(imgURL);

      // Set the position of the image in the Fabric.js canvas
      img.set({
        left: 0,
        top: totalHeight,
        selectable: false, // Set to false to avoid selection of the PDF background
      });

      this.fabricCanvas!.add(img);

      // Increase the total height for the next page
      totalHeight += viewport.height;
    }

    // Resize the Fabric.js canvas to fit the total height of all pages
    this.fabricCanvas!.setWidth(canvasWidth);
    this.fabricCanvas!.setHeight(totalHeight);

    this.fabricCanvas!.renderAll();
    console.log('All PDF pages rendered onto the Fabric.js canvas.');
  }

  // Handle Logo Upload and add it to the Fabric.js canvas
  onLogoUpload(event: any): void {
    if (!this.isPdfLoaded()) {
      alert('Please upload a PDF before adding a logo.');
      return;
    }

    const file = event.target.files[0];
    if (file && file.type.startsWith('image')) {
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        const img = await fabric.Image.fromURL(e.target.result);

        this.uploadedLogo = img.set({
          left: 50, // Default initial position
          top: 50,
          scaleX: 100 / img.width!,
          scaleY: 100 / img.height!,
          selectable: true, // Make the logo draggable and resizable
        });

        // Add the logo to the Fabric.js canvas
        this.fabricCanvas!.add(this.uploadedLogo);
        this.fabricCanvas!.renderAll();
      };
      reader.readAsDataURL(file);
    }
  }

  // Add Textbox to the Fabric.js canvas
  addText(): void {
    if (!this.isPdfLoaded() || !this.inputText) {
      alert('Please enter text and upload a PDF.');
      return;
    }

    const textBox = new fabric.Textbox(this.inputText, {
      left: 50,
      top: 50,
      width: 150,
      fontSize: this.selectedFontSize,
      fill: '#000000',
      selectable: true, // Make text draggable and resizable
    });

    this.fabricCanvas!.add(textBox); // Add text to the canvas
    this.fabricCanvas!.renderAll();
  }

  // Export the modified PDF
  downloadModifiedPdf(): void {
  // Get the width and height of the Fabric.js canvas
  const canvasWidth = this.fabricCanvas!.getWidth();
  const canvasHeight = this.fabricCanvas!.getHeight();

  // Create a new PDF with the same dimensions as the Fabric.js canvas
  const pdf = new jsPDF({
    orientation: canvasWidth > canvasHeight ? 'landscape' : 'portrait', // Adjust orientation
    unit: 'px',
    format: [canvasWidth, canvasHeight], // Set format to match the canvas size
  });

  // Convert the Fabric.js canvas with PDF and added objects (logo, text) to an image
  const imgData = this.fabricCanvas!.toDataURL({
    format: 'png',
    multiplier: 1, // Keep the same resolution
  });

  // Add the image to the PDF at the original dimensions
  pdf.addImage(imgData, 'PNG', 0, 0, canvasWidth, canvasHeight);

  // Save the modified PDF
  pdf.save('modified.pdf');
}



  // Check if the PDF is loaded
  isPdfLoaded(): boolean {
    return this.pdfDoc !== undefined && this.fabricCanvas !== null;
  }
}
