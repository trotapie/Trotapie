import { Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SupabaseService } from 'app/core/supabase.service';
import { MaterialModule } from 'app/shared/material.module';
import { ICotizacion } from './cotizacion.interface';
import { DateI18nPipe } from 'app/core/i18n/date-i18n.pipe';

type Tile = { key: string; url: string; alt: string; class: string };
@Component({
  selector: 'app-modificar-cotizacion',
  imports: [MaterialModule, RouterLink, DateI18nPipe],
  templateUrl: './cotizacion.component.html',
  styleUrl: './cotizacion.component.scss',
  standalone: true
})

export class CotizacionComponent implements OnInit {
  private router = inject(Router)
  private title = inject(Title);
  private meta = inject(Meta);
  private route = inject(ActivatedRoute)
  private supabase = inject(SupabaseService);
  cargando = true;

  informacionCotizacion: ICotizacion
  esEdicion: boolean;

  async ngOnInit() {
    try {
      this.cargando = true;

      const url = this.router.url;
      const id = this.route.snapshot.paramMap.get('id');
      this.informacionCotizacion = await this.supabase.obtenerCotizacionPorPublicId(id);
      console.log(this.informacionCotizacion);

      this.esEdicion = url.includes('edicion-cotizacion') ? true : false

      this.title.setTitle('Reserva tu viaje a Cancún - Cotización | Trotapie');

      this.meta.updateTag({
        name: 'description',
        content: 'Cotiza tu viaje a Cancún con los mejores hoteles en Trotapie.'
      });

      this.meta.updateTag({
        property: 'og:title',
        content: 'Reserva tu viaje a Cancún - Cotización'
      });

      this.meta.updateTag({
        property: 'og:description',
        content: 'Cotiza hoteles en Cancún fácil y rápido con Trotapie.'
      });

      this.meta.updateTag({
        property: 'og:image',
        content: 'https://app.trotapie.com/assets/images/og/cancun-cotizacion.jpg'
      });

      this.meta.updateTag({
        property: 'og:url',
        content: window.location.href
      });
    } finally {
      this.cargando = false;
    }
  }

  get fotos(): string[] {
    return (this.informacionCotizacion?.imagenes ?? [])
      .map(x => x?.url)
      .filter((u): u is string => !!u)
      .slice(0, 8);
  }

  fotoUrl(i: number): string {
    return this.fotos[i] ?? this.informacionCotizacion?.fondo ?? '';
  }

  getFullStars(rating: number): any[] {
    rating = rating === undefined ? 0 : rating;

    return Array(Math.floor(rating));
  }

  hasHalfStar(rating: number): boolean {
    const decimal = rating % 1;
    return decimal >= 0.25 && decimal < 0.75;
  }

  getEmptyStars(rating: number): any[] {
    rating = rating === undefined ? 0 : rating;

    const full = Math.floor(rating);
    const half = this.hasHalfStar(rating) ? 1 : 0;
    return Array(5 - full - half);
  }

}
