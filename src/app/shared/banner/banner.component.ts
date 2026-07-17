import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EmpleadoFirma } from 'app/core/cotizaciones.service';

@Component({
  selector: 'app-banner',
  standalone: true,
  templateUrl: './banner.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerComponent {
  empleado = input<EmpleadoFirma | null>(null);

  emailHref = computed(() => {
    const email = this.empleado()?.email?.trim();
    return email ? `mailto:${email}` : null;
  });

  whatsappHref = computed(() => {
    const telefono = this.empleado()?.telefono?.replace(/\D/g, '') ?? '';
    return telefono ? `https://wa.me/${telefono}` : null;
  });
}
