import { Routes } from '@angular/router';
import { CircuitosComponent } from './circuitos.component';
import { CircuitoDetalleComponent } from './circuito-detalle/circuito-detalle.component';

export default [
    { path: '', component: CircuitosComponent },
    { path: ':id/:nombre', component: CircuitoDetalleComponent },
] as Routes;
