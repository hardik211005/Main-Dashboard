import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { IdleTimeoutService } from '../core/idle-timeout.service';

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
      background-color: #f5f6fa;
    }
    :host-context(.dark-theme) .shell {
      background-color: #151b28;
    }
    .shell-outlet {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      background-color: inherit;
    }
  `]
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('shellOutlet') private shellOutlet?: ElementRef<HTMLDivElement>;
  private navSub: Subscription;

  constructor(router: Router, private idleTimeout: IdleTimeoutService) {
    this.navSub = router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.shellOutlet?.nativeElement.scrollTo({ top: 0 }));
  }

  ngOnInit(): void {
    // Only authenticated routes render this component, so the idle timer
    // naturally starts/stops with the user's session.
    this.idleTimeout.start();
  }

  ngOnDestroy(): void {
    this.navSub.unsubscribe();
    this.idleTimeout.stop();
  }
}