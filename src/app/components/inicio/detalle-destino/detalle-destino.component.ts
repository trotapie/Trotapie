import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatosService } from 'app/components/hoteles/hoteles.service';
import { MapaComponent } from 'app/components/hoteles/mapa/mapa.component';
import { DestinosService } from 'app/core/destinos.service';
import { IpQueryService } from 'app/core/services/ip-query.service';
import { TemperatureUnitsService } from 'app/core/services/temperature-units.service';
import { celsiusToFahrenheit } from 'app/core/utils/temperature-utils';
import { FooterComponent } from 'app/footer/footer.component';
import { IClima } from 'app/interface/clima.interface';
import { MaterialModule } from 'app/shared/material.module';
import { IDetallesDestino } from './detalle-destino.interface';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { getDefaultLang } from 'app/lang.utils';
import { distinctUntilChanged, filter } from 'rxjs';

interface CarouselSlide {
  imagen_url: string;
  nombre: string;
  descripcion: string;
  oscurecer_fondo: boolean;
  texto_color: string;
  titulo_font_size: number;
  descripcion_font_size: number;
  overlay_color: string;
  overlay_opacidad: number;
  blur_px: number;
  efecto_destino: 'fondo' | 'texto' | 'ambos';
  etiqueta_font_size: number;
  etiqueta_color: string;
  etiqueta_texto: string | null;
  overlay_posicion: string;
  overlay_x: number | null;
  overlay_y: number | null;
}

@Component({
  selector: 'app-detalle-destino',
  imports: [FooterComponent, MapaComponent, MaterialModule, TranslocoModule],
  templateUrl: './detalle-destino.component.html',
  styleUrl: './detalle-destino.component.scss'
})
export class DetalleDestinoComponent implements OnInit {
  private datosService = inject(DatosService);
  private router = inject(Router);
  private supabase = inject(DestinosService);
  private ipQueryService = inject(IpQueryService);
  private temperatureUnitsService = inject(TemperatureUnitsService);
  private _translocoService = inject(TranslocoService);
  private route = inject(ActivatedRoute)
  private destroyRef = inject(DestroyRef);



  detallesDestino: IDetallesDestino;

  datosClima: IClima;
  ipPublica = '';
  paisCode = '';
  tempUnit = { unit: 'celsius', symbol: '°C' };
  mostrarMapa = false;
  currentIndex = 0;
  intervalId: any;
  slides: CarouselSlide[] = [];
  cargandoDatosRapidos = true;
  cargandoGaleria = true;
  errorDatosRapidos = '';
  errorGaleria = '';

  async ngOnInit() {
    const catalogoDestinoId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(catalogoDestinoId) || catalogoDestinoId <= 0) {
      this.cargarInfo();
      return;
    }

    const idiomaInicial = getDefaultLang();
    const informacionDestino = await this.supabase.obtenerDetalleBasicoDestino(catalogoDestinoId, idiomaInicial);
    if (!informacionDestino?.[0]) {
      this.cargarInfo();
      return;
    }
    this.asignarDetalleBasico(informacionDestino[0]);
    this.cargarSeccionesSecundarias(idiomaInicial);

    this.ipQueryService.getCurrentIpInfo().subscribe((response) => {
      this.ipPublica = response.ip;
      this.paisCode = response.location.country_code;
      this.tempUnit = this.temperatureUnitsService.getUnit(this.paisCode);
    });

    const coordenadas = this.extraerCoordenadasDesdeUrl(this.detallesDestino?.ubicacion);
    if (coordenadas) {
      this.datosService.getWeather(coordenadas?.lat, coordenadas?.lng).subscribe(weather => {
        this.datosClima = weather;
      });
    }

    const datosHotel = {
      ubicacion: this.detallesDestino?.ubicacion,
      nombre_hotel: this.detallesDestino?.nombre,
      vistaLejana: true,
    }

    this._translocoService.langChanges$.pipe(
      distinctUntilChanged(),
      filter((activeLang) => activeLang !== idiomaInicial),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((activeLang) => {
      void this.recargarPorIdioma(catalogoDestinoId, activeLang);
    });

    sessionStorage.setItem('hotel', JSON.stringify(datosHotel))
  }

  abrirUbicacion() {
    this.mostrarMapa = !this.mostrarMapa;
  }

  startCarousel() {
    clearInterval(this.intervalId);
    if (this.slides.length <= 1) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.slides.length;
    }, 3000);
  }

  colorConOpacidad(color: string | null | undefined, opacidad: number | string | null | undefined): string {
    const hex = /^#[0-9a-fA-F]{6}$/.test(String(color ?? '').trim())
      ? String(color).trim()
      : '#0F172A';
    const valor = Number(opacidad);
    const alpha = Number.isFinite(valor) ? Math.min(1, Math.max(0, valor)) : 0;
    const red = Number.parseInt(hex.slice(1, 3), 16);
    const green = Number.parseInt(hex.slice(3, 5), 16);
    const blue = Number.parseInt(hex.slice(5, 7), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  private construirSlidesCarrusel() {
    this.currentIndex = 0;
    const actividadesMostradas = new Set<number>();

    this.slides = (this.detallesDestino?.atracciones_principales ?? []).flatMap((actividad) => {
      if (actividadesMostradas.has(actividad.id)) {
        return [];
      }
      actividadesMostradas.add(actividad.id);

      const urlsMostradas = new Set<string>();
      // The service already returns only active gallery images. Keep legacy RPC
      // responses working too, where `activa` is not included on the image.
        const imagenes = actividad.imagenes?.length
          ? actividad.imagenes.filter((imagen) => imagen.activa !== false)
          : actividad.imagen_fondo
            ? [{ imagen_url: actividad.imagen_fondo, nombre: '', descripcion: '' }]
            : [];

      return imagenes
        .filter((imagen) => {
          if (urlsMostradas.has(imagen.imagen_url)) {
            return false;
          }
          urlsMostradas.add(imagen.imagen_url);
          return true;
        })
        .map((imagen) => ({
          imagen_url: imagen.imagen_url,
           nombre: imagen.nombre ?? '',
           descripcion: imagen.descripcion ?? '',
          oscurecer_fondo: Boolean(imagen.oscurecer_fondo ?? false),
          texto_color: imagen.texto_color ?? '#FFFFFF',
          titulo_font_size: Number(imagen.titulo_font_size ?? 48),
          descripcion_font_size: Number(imagen.descripcion_font_size ?? 18),
          overlay_color: imagen.overlay_color ?? '#0F172A',
          overlay_opacidad: Number(imagen.overlay_opacidad ?? 0),
          blur_px: Number(imagen.blur_px ?? 0),
          efecto_destino: imagen.efecto_destino === 'texto' || imagen.efecto_destino === 'ambos'
            ? imagen.efecto_destino
            : 'fondo',
          etiqueta_font_size: Number(imagen.etiqueta_font_size ?? 12),
          etiqueta_color: imagen.etiqueta_color ?? '#F9B44B',
          etiqueta_texto: imagen.etiqueta_texto ?? null,
          overlay_posicion: imagen.overlay_posicion ?? 'bottom-left',
          overlay_x: imagen.overlay_x === null || imagen.overlay_x === undefined ? null : Number(imagen.overlay_x),
          overlay_y: imagen.overlay_y === null || imagen.overlay_y === undefined ? null : Number(imagen.overlay_y)
        }));
    });

    this.startCarousel();
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }

  getOverlayStyle(slide: CarouselSlide): Record<string, string> {
    const positions: Record<string, { x: number; y: number; translateX: string; translateY: string }> = {
      'top-left': { x: 0, y: 0, translateX: '0%', translateY: '0%' },
      'top-center': { x: 50, y: 0, translateX: '-50%', translateY: '0%' },
      'top-right': { x: 100, y: 0, translateX: '-100%', translateY: '0%' },
      'center-left': { x: 0, y: 50, translateX: '0%', translateY: '-50%' },
      center: { x: 50, y: 50, translateX: '-50%', translateY: '-50%' },
      'center-right': { x: 100, y: 50, translateX: '-100%', translateY: '-50%' },
      'bottom-left': { x: 0, y: 100, translateX: '0%', translateY: '-100%' },
      'bottom-center': { x: 50, y: 100, translateX: '-50%', translateY: '-100%' },
      'bottom-right': { x: 100, y: 100, translateX: '-100%', translateY: '-100%' }
    };
    const position = slide.overlay_posicion === 'custom'
      ? {
          x: Number.isFinite(slide.overlay_x) ? Number(slide.overlay_x) : 0,
          y: Number.isFinite(slide.overlay_y) ? Number(slide.overlay_y) : 100,
          translateX: '-50%',
          translateY: '-50%'
        }
      : positions[slide.overlay_posicion] ?? positions['bottom-left'];

    return {
      left: `${position.x}%`,
      top: `${position.y}%`,
      transform: `translate(${position.translateX}, ${position.translateY})`
    };
  }

  etiquetaEstaPosicionada(slide: CarouselSlide): boolean {
    return slide.overlay_posicion !== 'bottom-left' || slide.overlay_x !== null || slide.overlay_y !== null;
  }

  private async recargarPorIdioma(catalogoDestinoId: number, idioma: string): Promise<void> {
    try {
      const informacionDestino = await this.supabase.obtenerDetalleBasicoDestino(catalogoDestinoId, idioma);
      if (!informacionDestino?.[0]) return;

      this.asignarDetalleBasico(informacionDestino[0]);
      this.cargarSeccionesSecundarias(idioma);
    } catch (error) {
      console.error('No se pudo actualizar el detalle del destino.', error);
    }
  }

  private asignarDetalleBasico(detalle: Omit<IDetallesDestino, 'datos_rapidos' | 'atracciones_principales'>): void {
    this.detallesDestino = {
      ...detalle,
      datos_rapidos: [],
      atracciones_principales: []
    };
    this.slides = [];
    this.currentIndex = 0;
  }

  private cargarSeccionesSecundarias(idioma: string): void {
    this.cargandoDatosRapidos = true;
    this.cargandoGaleria = true;
    this.errorDatosRapidos = '';
    this.errorGaleria = '';

    void this.cargarDatosRapidos(idioma);
    void this.cargarGaleria(idioma);
  }

  private async cargarDatosRapidos(idioma: string): Promise<void> {
    try {
      this.detallesDestino.datos_rapidos = await this.supabase.obtenerDatosRapidosDestino(
        this.detallesDestino.detalle_id,
        idioma
      ) as IDetallesDestino['datos_rapidos'];
    } catch (error) {
      this.errorDatosRapidos = 'No se pudieron cargar los datos rápidos.';
      console.error(this.errorDatosRapidos, error);
    } finally {
      this.cargandoDatosRapidos = false;
    }
  }

  private async cargarGaleria(idioma: string): Promise<void> {
    try {
      this.detallesDestino.atracciones_principales = await this.supabase.obtenerGaleriaDestino(
        this.detallesDestino.detalle_id,
        idioma
      ) as IDetallesDestino['atracciones_principales'];
      this.construirSlidesCarrusel();
    } catch (error) {
      this.errorGaleria = 'No se pudieron cargar las imágenes.';
      console.error(this.errorGaleria, error);
    } finally {
      this.cargandoGaleria = false;
    }
  }

  cargarInfo() {
    this.router.navigate(['/hoteles']);
  }

  regresar() {
    this.router.navigate(['/inicio']);
  }

  get temperaturaDisplay(): { valor: string; simbolo: string } | null {
    const temp = this.datosClima?.current_weather?.temperature;
    if (temp == null) return null;

    if (this.tempUnit.unit === 'fahrenheit') {
      return { valor: celsiusToFahrenheit(temp).toFixed(1), simbolo: this.tempUnit.symbol };
    }
    return { valor: String(temp), simbolo: this.tempUnit.symbol };
  }

  extraerCoordenadasDesdeUrl(url: string): { lat: number, lng: number } | null {
    const regex = /!3d([-0-9.]+)!4d([-0-9.]+)/;
    const match = url?.match(regex);

    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      return { lat, lng };
    }

    return null;
  }
}
