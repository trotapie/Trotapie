import { Component, ElementRef, HostListener, inject, Input, OnChanges, OnDestroy, OnInit, QueryList, SimpleChanges, ViewChild, ViewChildren } from '@angular/core';
import { MaterialModule } from '../material.module';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Router } from '@angular/router';
import { BotCotizadorComponent } from 'app/bot-cotizador/bot-cotizador.component';
import { IDetalleHotel } from 'app/components/hoteles/hoteles.interface';
import { backdropFade, modalScaleFade } from 'app/shared/animations';

@Component({
  selector: 'app-imagenes-carrusel',
  imports: [MaterialModule, TranslocoModule, BotCotizadorComponent],
  templateUrl: './imagenes-carrusel.component.html',
  styleUrl: './imagenes-carrusel.component.scss',
  animations: [modalScaleFade, backdropFade],
})
export class ImagenesCarruselComponent implements OnInit, OnChanges, OnDestroy {
  private _translocoService = inject(TranslocoService);
  private router = inject(Router)
  @Input() imagenesCargadas: any[] = [];
  @Input() hotel: IDetalleHotel;
  @Input() soloModal = false;

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
  modalAbierto = false;
  mostrarBot = false;
  trackById = (_: number, item: any) => item.id;

  private autoplayInterval: any = null;

  @ViewChild('overlay') overlay?: ElementRef<HTMLDivElement>;
  @ViewChildren('thumbBtn') thumbBtns?: QueryList<ElementRef<HTMLButtonElement>>;

  ngOnInit(): void {
    const url = this.router.url;
    this.esCotizacion = url.includes('cotizacion') ? true : false
    this.cargarImagenes();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['imagenesCargadas'] && !changes['imagenesCargadas'].firstChange) {
      this.cargarImagenes();
    }
  }

  iniciarAutoplay(): void {
    this.detenerAutoplay();

    this.autoplayInterval = setInterval(() => {
      if (this.isOpen && this.imagenesFilter.length > 1) {
        this.next();
      }
    }, 5000);
  }

  detenerAutoplay(): void {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  ngOnDestroy(): void {
    this.detenerAutoplay();
  }

  private cargarImagenes(): void {
    const urls: string[] = (this.imagenesCargadas ?? [])
      .map((x: any) => typeof x === 'string' ? x : this.esCotizacion ? x?.url : x?.url_imagen)
      .filter((x: string | undefined): x is string => !!x);

    this.imagenes = [];
    this.imagenesFilter = [];
    for (const url of urls) {
      this.imagenes.push(url);
      this.imagenesFilter.push(url);
    }

    this.tiposImagen = Array.from(
      new Map(
        (this.imagenesCargadas ?? [])
          .map((imagen: any) => imagen?.tipo)
          .filter((tipo: any) => tipo?.id)
          .map((tipo: any) => [tipo.id, tipo])
      ).values()
    );
  }

  open(i: number, event: MouseEvent) {
    if (!this.imagenesFilter.length) return;
    this.currentIndex = i;
    this.updateCurrent();

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const originX = ((event.clientX - rect.left) / rect.width) * 100;
    const originY = ((event.clientY - rect.top) / rect.height) * 100;
    this.origin = `${originX}% ${originY}%`;

    this.isOpen = true;
    this.iniciarAutoplay();
    setTimeout(() => (this.show = true), 10);
  }

  close() {
    this.detenerAutoplay();

    this.show = false;
    setTimeout(() => (this.isOpen = false), 300);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) this.close();
  }

  next(event?: Event) {
    event?.stopPropagation();
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
    this.detenerAutoplay();
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
        .map((x: any) => this.obtenerUrlImagen(x))
        .filter((x: string | undefined): x is string => !!x);
    } else {
      this.imagenesFilter = (this.imagenesCargadas ?? [])
        .filter((x: any) => x?.tipo_imagen_id === this.selectedTipoId)
        .map((x: any) => this.obtenerUrlImagen(x))
        .filter((x: string | undefined): x is string => !!x);
    }
    this.currentIndex = 0;
    this.updateCurrent();

  }

  private obtenerUrlImagen(imagen: any): string | undefined {
    return typeof imagen === 'string'
      ? imagen
      : this.esCotizacion ? imagen?.url : imagen?.url_imagen;
  }

  getTipoLabel(tipo: any): string {
    const lang = this._translocoService.getActiveLang?.() ?? 'es';
    const t = (tipo.traducciones || []).find((x: any) => x.lang === lang);
    return t?.descripcion ?? tipo.clave ?? 'Tipo';
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.mostrarBot = false;

  }

  abrirModal() {
    this.mostrarBot = true;
  }

  onDragStart(event: PointerEvent) {
    event.preventDefault();
  }

  onThumbsWheel(event: WheelEvent) {
    const el = event.currentTarget as HTMLElement | null;
    if (!el) return;

    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
      ? event.deltaY
      : event.deltaX;

    el.scrollLeft += delta;

  }

}
