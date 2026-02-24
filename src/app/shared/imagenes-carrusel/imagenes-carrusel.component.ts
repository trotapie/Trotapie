import { Component, ElementRef, inject, Input, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { MaterialModule } from '../material.module';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { SupabaseService } from 'app/core/supabase.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-imagenes-carrusel',
  imports: [MaterialModule, TranslocoModule],
  templateUrl: './imagenes-carrusel.component.html',
  styleUrl: './imagenes-carrusel.component.scss'
})
export class ImagenesCarruselComponent implements OnInit {
  private _translocoService = inject(TranslocoService);
  private supabase = inject(SupabaseService);
  private router = inject(Router)
  @Input() imagenesCargadas: any[] = [];

  imagenes: string[] = [];
  imagenesFilter: string[] = [];
  isOpen = false;
  currentIndex = 0;
  current: { src: string; alt?: string } = { src: '' };
  origin = 'center center';
  show = false;
  selectedTipoId: number = 0;
  tiposImagen: any[] = [];
  esCotizacion: boolean;


  @ViewChild('overlay') overlay?: ElementRef<HTMLDivElement>;
  @ViewChildren('thumbBtn') thumbBtns?: QueryList<ElementRef<HTMLButtonElement>>;

  ngOnInit(): void {
    const url = this.router.url;
    this.esCotizacion = url.includes('cotizacion') ? true : false
    this.cargarImagenesConDelay()
  }

  async cargarImagenesConDelay() {
    const urls: string[] = (this.imagenesCargadas ?? [])
      .map((x: any) => typeof x === 'string' ? x : this.esCotizacion ? x?.url : x?.url_imagen)
      .filter((x: string | undefined): x is string => !!x);

    this.imagenes = [];
    for (const url of urls) {
      this.imagenes.push(url);
      this.imagenesFilter.push(url);
    }

    this.obtenerTipoImagen()

  }

  open(i: number, event: MouseEvent) {
    this.currentIndex = i;
    this.updateCurrent();

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const originX = ((event.clientX - rect.left) / rect.width) * 100;
    const originY = ((event.clientY - rect.top) / rect.height) * 100;
    this.origin = `${originX}% ${originY}%`;

    this.isOpen = true;
    setTimeout(() => (this.show = true), 10);
  }

  close() {
    this.show = false;
    setTimeout(() => (this.isOpen = false), 300);
  }

  next(event: Event) {
    event.stopPropagation();
    this.currentIndex = (this.currentIndex + 1) % this.imagenesFilter.length;
    this.updateCurrent();
  }

  prev(event: Event) {
    event.stopPropagation();
    this.currentIndex = (this.currentIndex - 1 + this.imagenesFilter.length) % this.imagenesFilter.length;
    this.updateCurrent();
  }

  goTo(i: number, event: Event) {
    event.stopPropagation();
    this.currentIndex = i;
    this.updateCurrent();
  }

  onBackdrop(event: MouseEvent) {
    if (event.target === this.overlay?.nativeElement) this.close();
  }

  private updateCurrent() {
    this.current = {
      src: this.imagenesFilter[this.currentIndex],
      alt: `Imagen ${this.currentIndex + 1}/${this.imagenesFilter.length}`
    };
    // (Opcional) asegurar miniatura activa a la vista
    setTimeout(() => {
      const btn = this.thumbBtns?.get(this.currentIndex)?.nativeElement;
      btn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  }

  onTipoChange(tipoId: number | null) {
    this.selectedTipoId = tipoId;
    if (this.selectedTipoId === 0) {
      this.imagenesFilter = (this.imagenesCargadas ?? [])
        .map((x: any) => this.esCotizacion ? x?.url : x?.url_imagen)
        .filter((x: string | undefined): x is string => !!x);
    } else {
      this.imagenesFilter = (this.imagenesCargadas ?? [])
        .filter((x: any) => x?.tipo_imagen_id === this.selectedTipoId)
        .map((x: any) => this.esCotizacion ? x?.url : x?.url_imagen)
        .filter((x: string | undefined): x is string => !!x);
    }
    this.currentIndex = 0;
    this.updateCurrent();

  }

  async obtenerTipoImagen() {
    const data = await this.supabase.obtenerTiposImagenHotel();
    let tipoImagenId: number[] = [];
    this.imagenesCargadas.forEach(imagen => {
      if (tipoImagenId.length === 0) {
        tipoImagenId.push(imagen.tipo_imagen_id);
      } else if (!tipoImagenId.includes(imagen.tipo_imagen_id)) {
        tipoImagenId.push(imagen.tipo_imagen_id);
      }
    });
    this.tiposImagen = data.filter(tipo => tipoImagenId.includes(tipo.id));
  }

  getTipoLabel(tipo: any): string {
    const lang = this._translocoService.getActiveLang?.() ?? 'es';
    const t = (tipo.traducciones || []).find((x: any) => x.lang === lang);
    return t?.descripcion ?? tipo.clave ?? 'Tipo';
  }
}
