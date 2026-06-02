import { Component, Input, ViewEncapsulation } from '@angular/core';
import { fuseAnimations } from '@fuse/animations';
import { MaterialModule } from 'app/shared/material.module';
import { Estatus } from './estatus.enum';

@Component({
    selector: 'app-status-badge',
    templateUrl: './estatus.component.html',
    imports: [MaterialModule],
    encapsulation: ViewEncapsulation.None,
    animations: fuseAnimations,
})
export class EstatusComponent {
    @Input() status: Estatus = 'Nuevo';

    estatusSky: Estatus[] = ['EN PROCESO', 'En proceso'];
    estatusYellow: Estatus[] = ['Pendiente', 'Nuevo', 'INACTIVO'];
    estatusGreen: Estatus[] = ['Cotizado', 'Confirmada', 'CONFIRMADA', 'ACTIVO'];
    estatusPurple: Estatus[] = ['Cerrado'];
    estatusBrown: Estatus[] = [];
    estatusRed: Estatus[] = ['Cancelado'];
    estatusOrange: Estatus[] = [];
}
