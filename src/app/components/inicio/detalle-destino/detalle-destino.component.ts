import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatosService } from 'app/components/hoteles/hoteles.service';
import { MapaComponent } from 'app/components/hoteles/mapa/mapa.component';
import { SupabaseService } from 'app/core/supabase.service';
import { FooterComponent } from 'app/footer/footer.component';
import { IClima } from 'app/interface/clima.interface';
import { MaterialModule } from 'app/shared/material.module';
import { IDetallesDestino } from './detalle-destino.interface';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { getDefaultLang } from 'app/lang.utils';

@Component({
  selector: 'app-detalle-destino',
  imports: [FooterComponent, MapaComponent, MaterialModule, TranslocoModule],
  templateUrl: './detalle-destino.component.html',
  styleUrl: './detalle-destino.component.scss'
})
export class DetalleDestinoComponent implements OnInit {
  private datosService = inject(DatosService);
  private router = inject(Router);
  private supabase = inject(SupabaseService);
  private _translocoService = inject(TranslocoService);
  private route = inject(ActivatedRoute)



  detallesDestino: IDetallesDestino;

  datosClima: IClima;
  mostrarMapa = false;
  currentIndex = 0;
  intervalId: any;

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    const informacionDestino = await this.supabase.obtenerDetalleDestino(id, getDefaultLang());
    this.detallesDestino = informacionDestino[0];
    if (!this.detallesDestino) {
      this.cargarInfo();
    }

    const coordenadas = this.extraerCoordenadasDesdeUrl(this.detallesDestino.ubicacion);
    this.datosService.getWeather(coordenadas.lat, coordenadas.lng).subscribe(weather => {
      this.datosClima = weather;
    });

    const datosHotel = {
      ubicacion: this.detallesDestino.ubicacion,
      nombre_hotel: "Mazatlán",
      vistaLejana: true,
    }

    this._translocoService.langChanges$.subscribe(async (activeLang) => {
      const informacionDestino = await this.supabase.obtenerDetalleDestino(1, activeLang);
      this.detallesDestino = informacionDestino[0];
    });
    
    sessionStorage.setItem('hotel', JSON.stringify(datosHotel))
    this.startCarousel();
  }

  abrirUbicacion() {
    this.mostrarMapa = !this.mostrarMapa;
  }

  startCarousel() {
    this.intervalId = setInterval(() => {
      this.currentIndex =
        (this.currentIndex + 1) % this.detallesDestino?.atracciones_principales.length;
    }, 3000);
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
