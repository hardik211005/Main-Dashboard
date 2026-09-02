import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';

/**
 * Shell for every authenticated page (Dashboard, Access Control, UCEM, SON, EMS...).
 * The navbar lives here, ONE level above the router-outlet that swaps pages.
 * Angular's router only destroys/recreates components that sit *inside* the
 * outlet being swapped — since NavbarComponent now sits *outside* that outlet,
 * it stays mounted (no re-init, no flicker, no dropped subscriptions) across
 * every navigation between pages.
 */
@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <div class="shell">
      <app-navbar></app-navbar>
      <div class="shell-outlet" #shellOutlet>
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .shell {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .shell-outlet {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
    }
  `]
})
export class MainLayoutComponent implements OnDestroy {
  @ViewChild('shellOutlet') private shellOutlet?: ElementRef<HTMLDivElement>;
  private navSub: Subscription;

  constructor(router: Router) {
    // The router only scrolls `window` by default; our real scroll container
    // is `.shell-outlet` (html/body are overflow:hidden). Without this, a
    // scrolled-down list page (e.g. Users) leaves that scroll offset behind
    // when you navigate to a shorter page (e.g. Create User), so its top
    // ends up hidden under the navbar instead of the page opening at its top.
    this.navSub = router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.shellOutlet?.nativeElement.scrollTo({ top: 0 }));
  }

  ngOnDestroy(): void {
    this.navSub.unsubscribe();
  }
}