import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  salary?: number;
  createdAt?: string;
}

const API_URL = 'http://127.0.0.1:5050/api';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  constructor(private http: HttpClient, private authService: AuthService) {}

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`
    });
  }

  getEmployees(): Observable<{ employees: Employee[] }> {
    return this.http.get<{ employees: Employee[] }>(`${API_URL}/employees`, {
      headers: this.authHeaders()
    });
  }

  createEmployee(employee: Partial<Employee>): Observable<any> {
    return this.http.post(`${API_URL}/employees`, employee, {
      headers: this.authHeaders()
    });
  }

  updateEmployee(id: string, employee: Partial<Employee>): Observable<any> {
    return this.http.put(`${API_URL}/employees/${id}`, employee, {
      headers: this.authHeaders()
    });
  }

  deleteEmployee(id: string): Observable<any> {
    return this.http.delete(`${API_URL}/employees/${id}`, {
      headers: this.authHeaders()
    });
  }
}
