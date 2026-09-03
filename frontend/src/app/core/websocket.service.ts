import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { AuthService } from '../auth.service';

export interface DashboardSocketEvent {
  type?: string;
  event?: string;
  executionId?: string;
  commandId?: string;
  nodeId?: string;
  nodeName?: string;
  circle?: string;
  status?: 'RUNNING' | 'SUCCESS' | 'FAILED';
  previousStatus?: string;
  stats?: {
    commandExecuted: number;
    totalFailed: number;
    totalSuccess: number;
    successRate: number;
  };
  timestamp?: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private socket?: WebSocket;
  private eventsSubject = new Subject<DashboardSocketEvent>();
  readonly events$ = this.eventsSubject.asObservable();

  constructor(private authService: AuthService, private zone: NgZone) {}

  connect(): void {
  if (
    this.socket &&
    (this.socket.readyState === WebSocket.OPEN ||
      this.socket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

    const token = this.authService.getToken();
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.socket = new WebSocket(`${protocol}//127.0.0.1:5050/ws`);

    this.socket.onopen = () => {
      this.socket?.send(JSON.stringify({ type: 'auth', token }));
    };

    this.socket.onmessage = (message) => {
      this.zone.run(() => {
        try {
          const event = JSON.parse(message.data) as DashboardSocketEvent;
          if (event.type === 'error') {
            console.warn('WebSocket:', event.message);
            return;
          }
          this.eventsSubject.next(event);
        } catch {
          console.warn('Invalid WebSocket message');
        }
      });
    };

    this.socket.onerror = () => {
    };
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = undefined;
  }
}
