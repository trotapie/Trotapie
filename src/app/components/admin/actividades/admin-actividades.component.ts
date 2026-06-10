import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from 'app/shared/material.module';

interface CatalogoItem {
  titulo: string;
  descripcion: string;
  icono: string;
  imagen: string;
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
      titulo: 'Catalogo de amenidades',
      descripcion: 'Gestiona el catalogo general de amenidades disponibles.',
      icono: 'heroicons_outline:clipboard-document-list',
      imagen: 'https://images.unsplash.com/photo-1551918120-9739cb430c6d?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      link: '/admin/catalogos/amenidades'
    },
    {
      titulo: 'Conceptos',
      descripcion: 'Administra los conceptos usados en hoteles y cotizaciones.',
      icono: 'heroicons_outline:light-bulb',
      imagen: 'https://images.unsplash.com/photo-1554647286-f365d7defc2d?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      link: '/admin/catalogos/conceptos'
    },
    {
      titulo: 'Continentes',
      descripcion: 'Configura continentes para destinos internacionales.',
      icono: 'heroicons_outline:globe-americas',
      imagen: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      link: '/admin/catalogos/continentes'
    },
    {
      titulo: 'Descuentos',
      descripcion: 'Administra los tipos de descuento que usa el sistema.',
      icono: 'heroicons_outline:ticket',
      imagen: 'https://plus.unsplash.com/premium_photo-1678916731958-d180d6e5db8a?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      link: '/admin/catalogos/descuentos'
    },
    {
      titulo: 'Estatus de empleado',
      descripcion: 'Gestiona estatus de empleados para habilitar o inhabilitar perfiles.',
      icono: 'heroicons_outline:user-circle',
      imagen: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      link: '/admin/catalogos/estatus-empleado'
    },
    {
      titulo: 'Estatus de cotizacion',
      descripcion: 'Administra estados del flujo comercial de cotizaciones.',
      icono: 'heroicons_outline:clipboard-document-check',
      imagen: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      link: '/admin/catalogos/estatus-cotizacion'
    },
    {
      titulo: 'Idiomas',
      descripcion: 'Gestiona idiomas habilitados para contenido y traducciones.',
      icono: 'heroicons_outline:language',
      imagen: 'https://images.unsplash.com/photo-1673515334893-2c20c91d0e93?q=80&w=1471&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      link: '/admin/catalogos/idiomas'
    },
    {
      titulo: 'Politicas',
      descripcion: 'Administra politicas usadas en reservas y tarifas.',
      icono: 'heroicons_outline:document-text',
      imagen: 'https://plus.unsplash.com/premium_photo-1682089273091-2394be619ebf?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NjR8fHJlc2VydmFjaW9ufGVufDB8fDB8fHww',
      link: '/admin/catalogos/politicas'
    },
    {
      titulo: 'Regimen de hotel',
      descripcion: 'Gestiona regimenes disponibles para hoteles.',
      icono: 'heroicons_outline:building-office',
      imagen: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      link: '/admin/catalogos/regimen-hotel'
    },
    {
      titulo: 'Tarifas',
      descripcion: 'Configura catalogos de tarifas aplicables en cotizaciones.',
      icono: 'heroicons_outline:currency-dollar',
      imagen: 'https://plus.unsplash.com/premium_photo-1661425505025-238c888750f7?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8dGFyaWZhfGVufDB8fDB8fHww',
      link: '/admin/catalogos/tarifas'
    },
    {
      titulo: 'Tipo imagen',
      descripcion: 'Administra tipos de imagen para galerias y contenido.',
      icono: 'heroicons_outline:photo',
      imagen: 'https://thumbs.dreamstime.com/b/collage-del-hotel-26578272.jpg',
      link: '/admin/catalogos/tipo-imagen'
    },
    {
      titulo: 'Tipos habitacion',
      descripcion: 'Gestiona tipos de habitacion disponibles por hotel.',
      icono: 'heroicons_outline:home-modern',
      imagen: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      link: '/admin/catalogos/tipos-habitacion'
    },
    {
      titulo: 'Catalogo de atracciones',
      descripcion: 'Administra atracciones principales por destino.',
      icono: 'heroicons_outline:sparkles',
      imagen: 'https://images.unsplash.com/photo-1561174356-638d86f24f04?q=80&w=1450&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      link: '/admin/catalogos/atracciones'
    }
  ];
}
