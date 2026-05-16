import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from 'app/shared/material.module';

interface CatalogoItem {
  titulo: string;
  descripcion: string;
  icono: string;
  link: string;
}

@Component({
  selector: 'app-admin-actividades',
  imports: [MaterialModule, RouterLink],
  templateUrl: './admin-actividades.component.html',
  styleUrl: './admin-actividades.component.scss'
})
export class AdminActividadesComponent {
  catalogos: CatalogoItem[] = [
    {
      titulo: 'Catalogo de actividades',
      descripcion: 'Gestiona el catalogo general de actividades disponibles.',
      icono: 'heroicons_outline:clipboard-document-list',
      link: '/admin/catalogos/actividades'
    },
    {
      titulo: 'Conceptos',
      descripcion: 'Administra los conceptos usados en hoteles y cotizaciones.',
      icono: 'heroicons_outline:light-bulb',
      link: '/admin/catalogos/conceptos'
    },
    {
      titulo: 'Continentes',
      descripcion: 'Configura continentes para destinos internacionales.',
      icono: 'heroicons_outline:globe-americas',
      link: '/admin/catalogos/continentes'
    },
    {
      titulo: 'Descuentos',
      descripcion: 'Administra los tipos de descuento que usa el sistema.',
      icono: 'heroicons_outline:ticket',
      link: '/admin/catalogos/descuentos'
    },
    {
      titulo: 'Panel de Destinos',
      descripcion: 'Configura tipos de destino, destinos y su orden de visualizacion.',
      icono: 'heroicons_outline:map-pin',
      link: '/admin/destinos'
    },
    {
      titulo: 'Idiomas',
      descripcion: 'Gestiona idiomas habilitados para contenido y traducciones.',
      icono: 'heroicons_outline:language',
      link: '/admin/catalogos/idiomas'
    },
    {
      titulo: 'Politicas',
      descripcion: 'Administra politicas usadas en reservas y tarifas.',
      icono: 'heroicons_outline:document-text',
      link: '/admin/catalogos/politicas'
    },
    {
      titulo: 'Regimen de hotel',
      descripcion: 'Gestiona regimenes disponibles para hoteles.',
      icono: 'heroicons_outline:building-office',
      link: '/admin/catalogos/regimen-hotel'
    },
    {
      titulo: 'Tarifas',
      descripcion: 'Configura catalogos de tarifas aplicables en cotizaciones.',
      icono: 'heroicons_outline:currency-dollar',
      link: '/admin/catalogos/tarifas'
    },
    {
      titulo: 'Tipo imagen',
      descripcion: 'Administra tipos de imagen para galerias y contenido.',
      icono: 'heroicons_outline:photo',
      link: '/admin/catalogos/tipo-imagen'
    },
    {
      titulo: 'Tipos habitacion',
      descripcion: 'Gestiona tipos de habitacion disponibles por hotel.',
      icono: 'heroicons_outline:home-modern',
      link: '/admin/catalogos/tipos-habitacion'
    },
    {
      titulo: 'Catalogo de atracciones',
      descripcion: 'Administra atracciones principales por destino.',
      icono: 'heroicons_outline:sparkles',
      link: '/admin/catalogos/atracciones'
    }
  ];
}
