import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from 'app/shared/material.module';
import { TpInputComponent } from 'app/shared/tp-input/tp-input.component';
import { TpDateInputComponent } from 'app/shared/tp-date-input/tp-date-input.component';
import { TpSelectSearchComponent } from 'app/shared/tp-select-search/tp-select-search.component';
import { TpActionsMenuComponent } from 'app/shared/tp-actions-menu/tp-actions-menu.component';
import { EstatusComponent } from 'app/shared/estatus/estatus.component';
import { ExperienciasAdminBase } from '../experiencias/experiencias-admin.base';

@Component({
  selector: 'app-admin-cabanas',
  standalone: true,
  imports: [FormsModule, MaterialModule, TpInputComponent, TpDateInputComponent, TpSelectSearchComponent, TpActionsMenuComponent, EstatusComponent],
  templateUrl: './admin-cabanas.component.html',
  styleUrl: '../experiencias/admin-experiencias.component.scss'
})
export class AdminCabanasComponent extends ExperienciasAdminBase {
  override tipo = 'cabana' as const;
}
