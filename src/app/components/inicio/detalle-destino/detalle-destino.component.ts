import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
  

  detallesDestino: IDetallesDestino;

  datosClima: IClima;
  mostrarMapa = false;
  ubicacion = "https://www.google.com/maps/place/Canc%C3%BAn,+Q.R./@21.1230253,-86.938805,12z/data=!3m1!4b1!4m6!3m5!1s0x8f4c2b05aef653db:0xce32b73c625fcd8a!8m2!3d21.161908!4d-86.8515279!16zL20vMDFxOTht?entry=ttu&g_ep=EgoyMDI2MDIxNi4wIKXMDSoASAFQAw%3D%3D"

  currentIndex = 0;
  intervalId: any;

  async ngOnInit() {
    this.datosService.getWeather(24.0215417, -104.7148075).subscribe(weather => {
      this.datosClima = weather;
    });

    const datosHotel = {
      ubicacion: this.ubicacion,
      nombre_hotel: "Mazatlán",
      vistaLejana: true,
    }
    const informacionDestino = await this.supabase.obtenerDetalleDestino(1, getDefaultLang());
    this.detallesDestino = informacionDestino[0];
    console.log(this.detallesDestino);

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

  regresar(){
    this.router.navigate(['/inicio']);
  }
}
