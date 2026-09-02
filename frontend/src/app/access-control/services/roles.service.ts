import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../auth.service';
import { Role, RolePayload } from '../models/role.model';

const API_URL = 'http://127.0.0.1:5050/api';

@Injectable({ providedIn: 'root' })
export class RolesService {
  constructor(private http: HttpClient, private authService: AuthService) {}

  private options() {
    return {
      headers: new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`)
    };
  }

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${API_URL}/roles`, this.options());
  }

  getRole(id: string): Observable<Role> {
    return this.http.get<Role>(`${API_URL}/roles/${id}`, this.options());
  }

  createRole(payload: RolePayload): Observable<any> {
    return this.http.post(`${API_URL}/roles`, payload, this.options());
  }

  updateRole(id: string, payload: RolePayload): Observable<any> {
    return this.http.put(`${API_URL}/roles/${id}`, payload, this.options());
  }

  deleteRole(id: string): Observable<any> {
    return this.http.delete(`${API_URL}/roles/${id}`, this.options());
  }
}
