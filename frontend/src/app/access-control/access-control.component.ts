import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-access-control',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './access-control.component.html',
  styleUrl: './access-control.component.scss'
})
export class AccessControlComponent {
  private router = inject(Router);

  isFormPage = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects.includes('/create')),
      startWith(this.router.url.includes('/create'))
    ),
    { initialValue: this.router.url.includes('/create') }
  );
}