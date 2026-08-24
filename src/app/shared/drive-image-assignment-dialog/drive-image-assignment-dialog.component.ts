import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, Output, Input, inject } from '@angular/core';
import {
  IDriveActividadImportFolder,
  IDriveActividadImportImage
} from 'app/core/supabase.service';
import { ActividadesService } from 'app/core/actividades.service';
import { MaterialModule } from 'app/shared/material.module';
import { TpSelectSearchComponent, TpSelectSearchOption } from 'app/shared/tp-select-search/tp-select-search.component';

export interface DriveImageAssignmentTarget {
  id: number;
  label: string;
}

export interface DriveImageAssignment {
  targetId: number;
  folderName: string;
  images: IDriveActividadImportImage[];
}

interface DriveFolderDraft {
  id: string;
  name: string;
  images: IDriveActividadImportImage[];
  targetId: number | null;
  rootImages: Array<{
    image: IDriveActividadImportImage;
    targetId: number | null;
  }>;
}

@Component({
  selector: 'app-drive-image-assignment-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, TpSelectSearchComponent],
  templateUrl: './drive-image-assignment-dialog.component.html'
})
export class DriveImageAssignmentDialogComponent {
  private readonly actividadesService = inject(ActividadesService);

  @Input({ required: true }) targets: DriveImageAssignmentTarget[] = [];
  @Input() saving = false;
  @Output() readonly cancelled = new EventEmitter<void>();
  @Output() readonly confirmed = new EventEmitter<DriveImageAssignment[]>();

  driveUrl = '';
  loading = false;
  error = '';
  folders: DriveFolderDraft[] = [];

  get selectedImageCount(): number {
    return this.assignments.reduce((total, assignment) => total + assignment.images.length, 0);
  }

  get targetOptions(): TpSelectSearchOption[] {
    return this.targets.map((target) => ({ value: target.id, label: target.label }));
  }

  get assignments(): DriveImageAssignment[] {
    const grouped = new Map<string, DriveImageAssignment>();

    const add = (targetId: number | null, folderName: string, images: IDriveActividadImportImage[]) => {
      if (!targetId || !images.length) {
        return;
      }

      const key = `${targetId}:${folderName}`;
      const assignment = grouped.get(key) ?? { targetId, folderName, images: [] };
      assignment.images.push(...images);
      grouped.set(key, assignment);
    };

    this.folders.forEach((folder) => {
      if (folder.rootImages.length) {
        folder.rootImages.forEach((rootImage) => {
          add(rootImage.targetId, folder.name, [rootImage.image]);
        });
        return;
      }

      add(folder.targetId, folder.name, folder.images);
    });

    return [...grouped.values()];
  }

  async search(): Promise<void> {
    const driveUrl = this.driveUrl.trim();
    if (!driveUrl) {
      this.error = 'Pega la URL o el ID de una carpeta de Drive.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.folders = [];

    try {
      const folders = await this.actividadesService.obtenerImagenesActividadDesdeDrive(driveUrl);
      this.folders = folders.map((folder, index) => this.createDraft(folder, index));
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron consultar las imágenes de Drive.';
    } finally {
      this.loading = false;
    }
  }

  confirm(): void {
    const assignments = this.assignments;
    if (!assignments.length) {
      this.error = 'Asigna al menos una atracción para cargar las imágenes.';
      return;
    }

    this.confirmed.emit(assignments);
  }

  private createDraft(folder: IDriveActividadImportFolder, index: number): DriveFolderDraft {
    const isRoot = !folder.nombre?.trim();
    return {
      id: folder.id || `drive-folder-${index}`,
      name: folder.nombre?.trim() || 'Sin carpeta',
      images: folder.imagenes,
      targetId: null,
      rootImages: isRoot
        ? folder.imagenes.map((image) => ({ image, targetId: null }))
        : []
    };
  }
}
