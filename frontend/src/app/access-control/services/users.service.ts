import { environment } from '../../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../../auth.service';
import { AccessUser, CreateUserPayload } from '../models/user.model';

const API_URL = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private http: HttpClient, private authService: AuthService) {}

  private options() {
    return {
      headers: new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`)
    };
  }

  getUsers(): Observable<AccessUser[]> {
    return this.http.get<AccessUser[]>(`${API_URL}/access-users`, this.options());
  }

  createUser(payload: CreateUserPayload): Observable<any> {
    return this.http.post(`${API_URL}/access-users`, payload, this.options());
  }

  updateUser(id: string, payload: Partial<CreateUserPayload> & { email?: string }): Observable<any> {
    return this.http.put(`${API_URL}/access-users/${id}`, payload, this.options());
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${API_URL}/access-users/${id}`, this.options());
  }
}
