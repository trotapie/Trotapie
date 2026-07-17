import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CotizacionesService, EmpleadoFirma } from 'app/core/cotizaciones.service';
import { BannerComponent } from './banner.component';

@Component({
  selector: 'app-banner-preview',
  standalone: true,
  imports: [BannerComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="preview-page">
      <section class="preview-panel">
        <p class="eyebrow">Vista temporal</p>
        <h1>Previsualizar firma de cotizacion</h1>
        <p>La firma de ejemplo se muestra abajo. Ingresa un folio publico para comprobar los datos reales del asesor asignado.</p>
        <form (ngSubmit)="cargar()">
          <label for="public-id">Folio publico</label>
          <div class="form-row">
            <input id="public-id" name="publicId" [(ngModel)]="publicId" placeholder="Ej. 3a0e..." autocomplete="off" />
            <button type="submit" [disabled]="cargando || !publicId.trim()">{{ cargando ? 'Cargando...' : 'Ver firma' }}</button>
          </div>
        </form>
        @if (error) { <p class="message error">{{ error }}</p> }
        @if (mostrarFirma) { <p class="message success">Mostrando la firma.</p> }
      </section>

      @if (mostrarFirma) {
        <section id="banner-preview" class="banner-wrap" aria-label="Vista previa de firma">
          <app-banner [empleado]="empleado"></app-banner>
        </section>
      }
    </main>
  `,
  styles: [`
    .preview-page { min-height: 100vh; padding: 48px 24px 80px; background: #f3f7f6; font-family: Montserrat, 'Trebuchet MS', sans-serif; }
    .preview-panel, .banner-wrap { width: min(100%, 1240px); margin: 0 auto; }
    .preview-panel { margin-bottom: 32px; padding: 28px; border: 1px solid #d9e5e2; border-radius: 20px; background: #fff; box-shadow: 0 12px 30px rgb(0 77 68 / 8%); color: #075e54; }
    .eyebrow { margin: 0 0 6px; color: #d39100; font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    h1 { margin: 0; font-size: 28px; } p { line-height: 1.5; } form { margin-top: 20px; } label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 700; }
    .form-row { display: flex; gap: 12px; } input { min-width: 0; flex: 1; padding: 12px 14px; border: 1px solid #b9cdc7; border-radius: 10px; color: #123f3a; font: inherit; }
    button { padding: 12px 18px; border: 0; border-radius: 10px; background: #008b78; color: #fff; font: inherit; font-weight: 700; cursor: pointer; } button:disabled { cursor: wait; opacity: .6; }
    .message { margin: 14px 0 0; font-size: 14px; font-weight: 600; }.success { color: #007868; }.error { color: #b42318; }
    @media (max-width: 600px) { .preview-page { padding: 24px 16px 48px; } .preview-panel { padding: 22px; } .form-row { flex-direction: column; } button { width: 100%; } }
  `],
})
export class BannerPreviewComponent {
  private readonly cotizaciones = inject(CotizacionesService);
  private readonly document = inject(DOCUMENT);

  publicId = '';
  empleado: EmpleadoFirma | null = null;
  mostrarFirma = false;
  cargando = false;
  error = '';

  async cargar(): Promise<void> {
    this.error = '';
    this.empleado = null;
    this.cargando = true;

    try {
      this.empleado = await this.cotizaciones.obtenerEmpleadoFirmaPorCotizacion(this.publicId);
      this.mostrarFirma = true;
      if (!this.empleado) {
        this.error = 'No se encontro un empleado asociado a esa cotizacion. La firma se muestra vacia.';
      }
    } catch {
      this.error = 'No se pudieron cargar los datos del empleado. Verifica el folio e intenta de nuevo.';
    } finally {
      this.cargando = false;
    }

    setTimeout(() => {
      this.document.getElementById('banner-preview')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}
