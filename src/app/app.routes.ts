import { Routes } from '@angular/router';
import { PdfLogoUploaderComponent } from './pdf-logo-uploader/pdf-logo-uploader.component';
import { TestComponentComponent } from './test-component/test-component.component';
import { PdfViewerComponent } from './pdf-viewer/pdf-viewer.component';
import { PdfLogo2Component } from './pdf-logo-2/pdf-logo-2.component';

export const routes: Routes = [
  { path: 'pdf-uploader', component: PdfLogoUploaderComponent },
  { path: 'test', component: TestComponentComponent },
  { path: 'pdf-viewer', component: PdfViewerComponent },
  { path: 'pdf-box', component: PdfLogo2Component },
  // change the root path to pdf-uploader if needed
  { path: '', redirectTo: 'pdf-uploader', pathMatch: 'full' },
];
