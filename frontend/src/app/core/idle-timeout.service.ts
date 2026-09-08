import { Injectable, NgZone } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, Subscription, fromEvent, merge, of, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { AuthService } from '../auth.service';

// How long a user can be idle before they're auto-logged-out.
const IDLE_TIMEOUT_MS = 2 * 60 * 1000;

// Any of these counts as "the user is still here" and resets the timer.
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'scroll'];

/**
 * Watches for user activity anywhere in the app and force-logs-out after
 * IDLE_TIMEOUT_MS of no activity. Started/stopped by MainLayoutComponent so
 * it only ever runs while the user is on an authenticated route.
 */
@Injectable({ providedIn: 'root' })
export class IdleTimeoutService {
  private stop$ = new Subject<void>();
  private sub?: Subscription;
  private running = false;

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private zone: NgZone
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;

    this.zone.runOutsideAngular(() => {
      const activity$ = merge(...ACTIVITY_EVENTS.map(evt => fromEvent(document, evt, { passive: true })));

      // `of(0)` kicks off the very first timer as soon as start() runs, so
      // an idle user who never touches the page still gets logged out.
      this.sub = merge(of(0), activity$)
        .pipe(
          switchMap(() => timer(IDLE_TIMEOUT_MS)),
          takeUntil(this.stop$)
        )
        .subscribe(() => this.zone.run(() => this.onTimeout()));
    });
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.stop$.next();
    this.sub?.unsubscribe();
  }

  private onTimeout(): void {
    this.stop();
    if (!this.authService.isLoggedIn()) return;

    this.snackBar.open('Session expired due to inactivity. Please log in again.', 'Close', {
      duration: 6000,
      panelClass: 'idle-timeout-snackbar'
    });
    this.authService.logout();
  }
}
