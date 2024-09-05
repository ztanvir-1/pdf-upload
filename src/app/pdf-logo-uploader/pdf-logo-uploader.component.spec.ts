import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfLogoUploaderComponent } from './pdf-logo-uploader.component';

describe('PdfLogoUploaderComponent', () => {
  let component: PdfLogoUploaderComponent;
  let fixture: ComponentFixture<PdfLogoUploaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfLogoUploaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfLogoUploaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
