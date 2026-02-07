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

    estatusSky: Estatus[] = [];
    estatusYellow: Estatus[] = ['Pendiente'];
    estatusGreen: Estatus[] = ['Cotizado'];
    estatusPurple: Estatus[] = [];
    estatusBrown: Estatus[] = [];
    estatusRed: Estatus[] = ['Cancelado'];
    estatusOrange: Estatus[] = [];
}
