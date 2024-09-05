import { Component, ViewChild, ElementRef } from '@angular/core';
import { PDFDocumentProxy, getDocument } from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';
import { ParsrService } from '../services/parsr/parsr.service';

@Component({
  selector: 'app-pdf-viewer',
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.scss'],
  standalone: true,
})
export class PdfViewerComponent {
  htmlContent:string | null = null;

  constructor(private parsrService:ParsrService){}
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      this.parsrService.uploadPdf(file).subscribe(
        (response) => {
          this.htmlContent = response.html; // Assuming the response contains an `html` field
        },
        (error) => {
          console.error('Error uploading PDF:', error);
        }
      );
    }
  }
}
