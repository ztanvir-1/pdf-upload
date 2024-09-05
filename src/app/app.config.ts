import { ColorPickerModule } from 'ngx-color-picker';
import { NgxMatColorPickerModule } from '@angular-material-components/color-picker';
import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { apiPrefixInterceptor } from './interceptors/api-prefix.interceptor';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule } from '@angular/material/dialog';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes),
    provideAnimations(), provideAnimationsAsync(),
    provideHttpClient(withInterceptors([apiPrefixInterceptor])),
    importProvidersFrom(MatButtonModule, MatInputModule, MatDialogModule)
  ]
};
