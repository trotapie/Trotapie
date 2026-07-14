import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
import { log } from 'fabric/fabric-impl';

interface CarouselSlide {
  imagen_url: string;
  nombre: string;
  descripcion: string;
  oscurecer_fondo: boolean;
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



  detallesDestino: IDetallesDestino;

  datosClima: IClima;
  ipPublica = '';
  paisCode = '';
  tempUnit = { unit: 'celsius', symbol: '°C' };
  mostrarMapa = false;
  currentIndex = 0;
  intervalId: any;
  slides: CarouselSlide[] = [];

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    const informacionDestino = await this.supabase.obtenerDetalleDestino(id, getDefaultLang());
    if (!informacionDestino) {
      this.cargarInfo();
      return;
    }
    this.detallesDestino = informacionDestino[0];
    console.log('[detalle-destino] detalle inicial recibido:', this.detallesDestino);
    this.construirSlidesCarrusel();

    this.ipQueryService.getCurrentIpInfo().subscribe((response) => {
      this.ipPublica = response.ip;
      this.paisCode = response.location.country_code;
      this.tempUnit = this.temperatureUnitsService.getUnit(this.paisCode);
    });

    const coordenadas = this.extraerCoordenadasDesdeUrl(this.detallesDestino.ubicacion);
    this.datosService.getWeather(coordenadas.lat, coordenadas.lng).subscribe(weather => {
      this.datosClima = weather;
    });

    const datosHotel = {
      ubicacion: this.detallesDestino.ubicacion,
      nombre_hotel: this.detallesDestino.nombre,
      vistaLejana: true,
    }

    this._translocoService.langChanges$.subscribe(async (activeLang) => {
      const informacionDestino = await this.supabase.obtenerDetalleDestino(id, activeLang);
      this.detallesDestino = informacionDestino[0];
      console.log('[detalle-destino] detalle actualizado por idioma:', activeLang, this.detallesDestino);
      this.construirSlidesCarrusel();
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
          ? [{ imagen_url: actividad.imagen_fondo }]
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
          nombre: actividad.nombre,
          descripcion: actividad.descripcion,
          oscurecer_fondo: Boolean(imagen.oscurecer_fondo ?? false)
        }));
    });

    this.startCarousel();
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
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
    const match = url.match(regex);

    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      return { lat, lng };
    }

    return null;
  }
}
