// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient) { }

  getData<T>(endpoint:string): Observable<any> {
    return this.http.get<T>(endpoint);  // This will become 'http://localhost:3000/endpoint' or 'https://api.example.com/endpoint' based on the environment
  }

  postData<T, X>(endpoint:string, obj:T, headers:any = null): Observable<any> {
    return this.http.post<X>(endpoint, obj, headers);  // This will become 'http://localhost:3000/endpoint' or 'https://api.example.com/endpoint' based on the environment
  }

  putData<T, X>(endpoint:string, obj:T): Observable<any> {
    return this.http.put<X>(endpoint, obj);  // This will become 'http://localhost:3000/endpoint' or 'https://api.example.com/endpoint' based on the environment
  }
}
