import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-ac-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="ac-tabs">
      <a routerLink="roles" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: false }">Roles</a>
      <a routerLink="users" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: false }">Users</a>
    </div>
  `,
  styles: [`
    .ac-tabs { display:flex; gap:8px; border-bottom:1px solid #e6e9f0; margin-bottom:20px; }
    .ac-tabs a { text-decoration:none; color:#667085; font-weight:600; padding:11px 22px; border-radius:10px 10px 0 0; }
    .ac-tabs a.active { color:#2f3f9f; background:#f0f1ff; border-bottom:2px solid #4657c8; }
  `]
})
export class AcTabsComponent {}
