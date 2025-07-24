import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DatosService {
  private url = 'https://script.google.com/macros/s/AKfycbyhBAdrLnNLcvH93749J9OQMEMQlhlqCSTz9qcOZJ-DV48FFCmml8GSqFZOxYGBXEH7Ag/exec'; // tu URL real

  constructor(private http: HttpClient) {}

  obtenerJson(): Observable<any> {
    return this.http.get<any>(this.url);
  }
}