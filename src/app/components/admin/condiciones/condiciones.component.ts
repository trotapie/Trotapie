import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from 'app/shared/material.module';

@Component({
  selector: 'app-condiciones',
  standalone: true,
  imports: [MaterialModule, RouterLink],
  templateUrl: './condiciones.component.html',
  styleUrl: './condiciones.component.scss',
})
export class CondicionesComponent {}
