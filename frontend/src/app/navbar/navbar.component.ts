import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Subject, filter, takeUntil } from 'rxjs';
import { AuthService } from '../auth.service';
import { PermissionService } from '../access-control/services/permission.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatToolbarModule, MatIconModule, MatMenuModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  currentUser$;
  isDarkMode = false;

  // Resolved once per permissions change instead of calling a method from
  // the template (template method calls re-run on every change-detection
  // pass, which adds up on a navbar that's now shared across pages).
  canAccessDashboard = false;
  canAccessUcem = false;
  canAccessSon = false;
  canAccessEms = false;
  canAccessHelp = false;
  canAccessUserManagement = false;
  isAccessControlActive = false;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private permissionService: PermissionService,
    private router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;

    const savedTheme = localStorage.getItem('dashboard-theme');
    this.isDarkMode = savedTheme === 'dark';
    document.documentElement.classList.toggle('dark-theme', this.isDarkMode);
  }

  ngOnInit(): void {
    this.permissionService.permissions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.canAccessDashboard = this.permissionService.can('Dashboard', 'read');
        this.canAccessUcem = this.permissionService.can('UCEM', 'read');
        this.canAccessSon = this.permissionService.can('SON', 'read');
        this.canAccessEms = this.permissionService.can('EMS', 'read');
        this.canAccessHelp = this.permissionService.can('Help', 'read');
        this.canAccessUserManagement = this.permissionService.can('UserManagement', 'read');
      });

    // The Access Control nav item is now a dropdown button (Roles/Users),
    // not a routerLink, so routerLinkActive can't highlight it for us —
    // track the active state ourselves from the current URL instead.
    this.isAccessControlActive = this.router.url.startsWith('/access-control');
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(event => {
        this.isAccessControlActive = event.urlAfterRedirects.startsWith('/access-control');
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    document.documentElement.classList.toggle('dark-theme', this.isDarkMode);
    localStorage.setItem('dashboard-theme', this.isDarkMode ? 'dark' : 'light');
    window.dispatchEvent(new CustomEvent('dashboard-theme-change', { detail: { dark: this.isDarkMode } }));
  }

  go(path: string): void {
    this.router.navigate([path]);
  }

  onLogout(): void {
    this.authService.logout();
  }
}