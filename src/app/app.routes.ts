import { Routes } from '@angular/router';
import { PdfLogoUploaderComponent } from './pdf-logo-uploader/pdf-logo-uploader.component';
import { TestComponentComponent } from './test-component/test-component.component';
import { PdfViewerComponent } from './pdf-viewer/pdf-viewer.component';

export const routes: Routes = [
  { path: 'pdf-uploader', component: PdfLogoUploaderComponent },
  { path: 'test', component: TestComponentComponent },
  { path: 'pdf-viewer', component: PdfViewerComponent },
  // change the root path to pdf-uploader if needed
  { path: '', redirectTo: 'pdf-uploader', pathMatch: 'full' },
];
