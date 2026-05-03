import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from 'app/shared/material.module';

@Component({
  selector: 'app-configuracion-destinos',
  imports: [MaterialModule, RouterLink],
  templateUrl: './configuracion-destinos.component.html',
  styleUrl: './configuracion-destinos.component.scss'
})
export class ConfiguracionDestinosComponent {

}
