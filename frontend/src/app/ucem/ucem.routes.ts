import { Routes } from '@angular/router';

export const ucemRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./ucem.component').then(m => m.UcemComponent)
  }
];
