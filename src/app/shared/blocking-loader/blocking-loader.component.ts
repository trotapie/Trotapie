import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MaterialModule } from 'app/shared/material.module';

@Component({
  selector: 'app-blocking-loader',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './blocking-loader.component.html',
  styleUrl: './blocking-loader.component.scss'
})
export class BlockingLoaderComponent {
  @Input() open = false;
  @Input() title = 'Cargando...';
  @Input() message = 'Espera un momento mientras terminamos la operacion.';
  @Input() showBackdrop = true;
}
