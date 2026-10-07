import { Component, inject } from '@angular/core';
import { AuthService } from 'app/core/auth/auth.service';
import { RouterLink } from '@angular/router';
import { MaterialModule } from 'app/shared/material.module';

@Component({
  selector: 'app-configuracion-admin',
  imports: [MaterialModule, RouterLink],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.scss',
})
export class ConfiguracionAdminComponent {
  readonly auth = inject(AuthService);
}
