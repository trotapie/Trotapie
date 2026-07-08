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
    estatusYellow: Estatus[] = ['Pendiente', 'PENDIENTE', 'Nuevo', 'INACTIVO'];
    estatusGreen: Estatus[] = ['Cotizado', 'COTIZADO', 'Confirmada', 'CONFIRMADA', 'ACTIVO'];
    estatusPurple: Estatus[] = ['Cerrado', 'CERRADO'];
    estatusBrown: Estatus[] = [];
    estatusRed: Estatus[] = ['Cancelado', 'CANCELADO'];
    estatusOrange: Estatus[] = [];

    get normalizedStatus(): Estatus {
        const value = String(this.status ?? '').trim();
        const upper = value.toUpperCase();

        if (upper === 'PENDIENTE') return 'PENDIENTE';
        if (upper === 'COTIZADO') return 'COTIZADO';
        if (upper === 'CONFIRMADA') return 'CONFIRMADA';
        if (upper === 'CERRADO') return 'CERRADO';
        if (upper === 'CANCELADO') return 'CANCELADO';
        if (upper === 'EN PROCESO') return 'EN PROCESO';
        if (upper === 'ACTIVO') return 'ACTIVO';
        if (upper === 'INACTIVO') return 'INACTIVO';

        return this.status;
    }

    get statusLabel(): string {
        return String(this.normalizedStatus ?? '').toUpperCase();
    }
}
