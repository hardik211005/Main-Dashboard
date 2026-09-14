import { Injectable, NgZone } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, Subscription, fromEvent, merge, of, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { AuthService } from '../auth.service';

const IDLE_TIMEOUT_MS = 2 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'scroll'];

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
