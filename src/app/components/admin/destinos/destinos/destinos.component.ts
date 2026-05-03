import { Component, inject, OnInit } from '@angular/core';
import { MaterialModule } from 'app/shared/material.module';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { SupabaseService } from 'app/core/supabase.service';

@Component({
  selector: 'app-destinos',
  standalone: true,
  imports: [
    MaterialModule,
    DragDropModule
  ],
  templateUrl: './destinos.component.html',
  styleUrl: './destinos.component.scss'
})
export class DestinosComponent implements OnInit {
  private supabase = inject(SupabaseService);

  displayedColumns = ['orden', 'destino', 'tipoDestino','acciones'];

  dataSource = []= [];

  async ngOnInit() {
        const informacionDestino = await this.supabase.consultarDestinos();
        this.dataSource = informacionDestino
  }
  drop(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.dataSource, event.previousIndex, event.currentIndex);

    this.dataSource = [...this.dataSource];

    console.log('Nuevo orden:', this.dataSource);
  }
}