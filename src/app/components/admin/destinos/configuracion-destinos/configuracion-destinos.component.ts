import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from 'app/shared/material.module';

@Component({
  selector: 'app-configuracion-destinos',
  standalone: true,
  imports: [MaterialModule, RouterLink],
  templateUrl: './configuracion-destinos.component.html',
  styleUrl: './configuracion-destinos.component.scss'
})
export class ConfiguracionDestinosComponent {
  readonly secciones = [
    { titulo: 'Catálogo de destinos', descripcion: 'Administra los destinos nacionales e internacionales disponibles.', icono: 'heroicons_outline:map-pin', ruta: '/admin/destinos/catalogo-destinos', imagen: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1200&auto=format&fit=crop' },
    { titulo: 'Continentes', descripcion: 'Configura la cobertura internacional y su estructura geográfica.', icono: 'heroicons_outline:globe-alt', ruta: '/admin/destinos/continentes', imagen: 'https://images.unsplash.com/photo-1530789253388-582c481c54b0?q=80&w=1200&auto=format&fit=crop' },
    { titulo: 'Países', descripcion: 'Organiza los países disponibles para cada continente.', icono: 'heroicons_outline:flag', ruta: '/admin/destinos/paises', imagen: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?q=80&w=1200&auto=format&fit=crop' },
    { titulo: 'Divisiones de área', descripcion: 'Gestiona las divisiones que organizan los destinos por país.', icono: 'heroicons_outline:squares-2x2', ruta: '/admin/destinos/divisiones-area', imagen: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=1200&auto=format&fit=crop' }
  ];
}
