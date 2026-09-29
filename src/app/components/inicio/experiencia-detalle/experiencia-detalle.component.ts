import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Subscription } from 'rxjs';
import { MaterialModule } from 'app/shared/material.module';
import { FooterComponent } from 'app/footer/footer.component';
import { ExperienciasService, ExperienciaTipo, FichaExperiencia } from 'app/core/experiencias.service';
import { TpInputComponent } from 'app/shared/tp-input/tp-input.component';

@Component({
  selector: 'app-experiencia-detalle', standalone: true,
  imports: [MaterialModule, FormsModule, TranslocoModule, RouterLink, FooterComponent, TpInputComponent],
  templateUrl: './experiencia-detalle.component.html'
})
export class ExperienciaDetalleComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ExperienciasService);
  readonly transloco = inject(TranslocoService);
  private sub?: Subscription;
  ficha: FichaExperiencia | null = null;
  cargando = true;
  error = '';
  fotoActual = 0;
  desde = '';
  hasta = '';
  adultos = 2;
  ninos = 0;

  ngOnInit(): void {
    this.sub = this.transloco.langChanges$.subscribe(() => { void this.cargar(); });
  }
  ngOnDestroy(): void { this.sub?.unsubscribe(); }
  get fotos(): string[] { return this.ficha ? [this.ficha.imagen_principal, ...this.ficha.imagenes.filter((url) => url !== this.ficha?.imagen_principal)] : []; }
  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    return new Intl.DateTimeFormat(this.transloco.getActiveLang(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${fecha}T12:00:00Z`));
  }
  async cargar(): Promise<void> {
    const tipo = this.route.snapshot.paramMap.get('tipo');
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if ((tipo !== 'cabana' && tipo !== 'promocion') || !Number.isInteger(id) || id <= 0) { this.error = this.transloco.translate('experiencia-no-disponible'); this.cargando = false; return; }
    this.cargando = true; this.error = '';
    try {
      this.ficha = (await this.service.listar(tipo as ExperienciaTipo, this.transloco.getActiveLang())).find((item) => item.id === id) ?? null;
      if (!this.ficha) this.error = this.transloco.translate('experiencia-no-disponible');
    } catch { this.error = this.transloco.translate('error-experiencias'); }
    finally { this.cargando = false; }
  }
  cotizar(): void {
    const ficha = this.ficha;
    if (!ficha) return;
    if (this.desde && this.hasta && this.hasta < this.desde) { this.error = this.transloco.translate('fecha-invalida-experiencia'); return; }
    const minimo = ficha.tipo === 'cabana' ? ficha.disponible_desde : ficha.viaje_desde;
    const maximo = ficha.tipo === 'cabana' ? ficha.disponible_hasta : ficha.viaje_hasta;
    if ([this.desde, this.hasta].some((fecha) => fecha && ((minimo && fecha < minimo) || (maximo && fecha > maximo)))) { this.error = this.transloco.translate('fechas-fuera-rango-experiencia'); return; }
    if (ficha.tipo === 'cabana' && (this.adultos > ficha.adultos_max || this.ninos > ficha.ninos_max || this.adultos < 1 || this.ninos < 0)) { this.error = this.transloco.translate('capacidad-excedida'); return; }
    const partes = [
      this.transloco.translate('mensaje-cotizacion-experiencia'),
      `${ficha.tipo === 'cabana' ? this.transloco.translate('cabanas') : this.transloco.translate('promociones')}: ${ficha.nombre}`,
      `${this.transloco.translate('ubicacion-experiencia')}: ${ficha.hotelNombre || ficha.destinoNombre}`,
      this.desde ? `${this.transloco.translate('fecha-inicio-experiencia')}: ${this.desde}` : '',
      this.hasta ? `${this.transloco.translate('fecha-fin-experiencia')}: ${this.hasta}` : '',
      `${this.transloco.translate('adultos-experiencia')}: ${this.adultos}`, `${this.transloco.translate('ninos-experiencia')}: ${this.ninos}`,
      `${this.transloco.translate('referencia-experiencia')}: ${window.location.href}`
    ].filter(Boolean);
    window.open(`https://wa.me/526188032003?text=${encodeURIComponent(partes.join('\n'))}`, '_blank', 'noopener,noreferrer');
  }
}
