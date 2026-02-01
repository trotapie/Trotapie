import { Component, inject, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { MaterialModule } from 'app/shared/material.module';

@Component({
  selector: 'app-modificar-cotizacion',
  imports: [MaterialModule, RouterLink],
  templateUrl: './cotizacion.component.html',
  styleUrl: './cotizacion.component.scss',
  standalone: true
})
export class CotizacionComponent implements OnInit {
  private router = inject(Router)
  private title = inject(Title);
  private meta = inject(Meta);

  esEdicion: boolean;

  ngOnInit() {

    const url = this.router.url;
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
  }
}
