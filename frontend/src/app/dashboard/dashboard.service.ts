import { environment } from '../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth.service';

export interface ExecutionHistoryItem {
  executionId: string;
  nodeId: string;
  nodeName: string;
  scheduleName: string;
  scheduledAt: string;
  circle: string;
  status: 'FAILED' | 'RUNNING' | 'SUCCESS';
}

export interface CommandsPerNodeItem {
  nodeLabel: string;
  success: number;
  failed: number;
}

export interface CircleItem {
  circleCode: string;
  circleName: string;
  upNodes: number;
  downNodes: number;
  totalNodes: number;
}

export interface StatusBreakdownItem {
  status: string;
  count: number;
  colorHex: string;
}

export interface DashboardData {
  executionHistory: ExecutionHistoryItem[];
  commandsPerNode: CommandsPerNodeItem[];
  circles: CircleItem[];
  statusBreakdown: StatusBreakdownItem[];
}

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getDashboardData(): Observable<any> {
    const token = this.authService.getToken();

    const headers = new HttpHeaders().set(
      'Authorization',
      `Bearer ${token}`
    );

    return this.http.get<any>(
      `${this.apiUrl}/dashboard`,
      { headers }
    );
  }
}