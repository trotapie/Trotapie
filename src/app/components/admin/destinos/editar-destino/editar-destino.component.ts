import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DestinosService, DivisionAreaCatalogo, TipoTuristicoCatalogo } from 'app/core/destinos.service';
import { BlockingLoaderComponent } from 'app/shared/blocking-loader/blocking-loader.component';
import { MaterialModule } from 'app/shared/material.module';
import { CustomSwitchComponent } from 'app/shared/custom-switch/custom-switch.component';
import { TpInputComponent } from 'app/shared/tp-input/tp-input.component';
import { TpSelectSearchComponent, TpSelectSearchOption } from 'app/shared/tp-select-search/tp-select-search.component';

interface ITipoDestino {
  id: number;
  nombre: string;
}

interface IContinente {
  id: number;
  nombre: string;
}

interface IDestinoPadre {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-editar-destino',
  standalone: true,
  imports: [MaterialModule, BlockingLoaderComponent, CustomSwitchComponent, TpInputComponent, TpSelectSearchComponent],
  templateUrl: './editar-destino.component.html',
  styleUrl: './editar-destino.component.scss'
})
export class EditarDestinoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly supabase = inject(DestinosService);
  private readonly fb = inject(FormBuilder);

  destinoId!: number;
  esCreacion = false;
  esCatalogo = false;
  cargando = true;
  guardando = false;
  error = '';
  mostrarModalExito = false;

  tiposDestino: ITipoDestino[] = [];
  continentes: IContinente[] = [];
  destinosPadre: IDestinoPadre[] = [];
  divisionesArea: DivisionAreaCatalogo[] = [];
  tiposTuristicos: TipoTuristicoCatalogo[] = [];

  form = this.fb.group({
    nombre: ['', [Validators.required]],
    orden: [null as number | null, [Validators.min(0)]],
    prioridad: [2 as 1 | 2, [Validators.required]],
    tipo_turistico_id: [null as number | null],
    tipo_desino_id: [null as number | null, [Validators.required]],
    destino_padre_id: [{ value: null as number | null, disabled: true }],
    continente_id: [{ value: null as number | null, disabled: true }],
    division_area_id: [null as number | null],
    imagen_destino: [''],
    imagen_cotizacion: [''],
    activo: [true]
  });

  get esTipoDos(): boolean {
    return Number(this.form.get('tipo_desino_id')?.value) === 2;
  }

  async ngOnInit() {
    const idRaw = this.route.snapshot.paramMap.get('id');
    const id = Number(idRaw);
    this.esCreacion = !idRaw;
    this.esCatalogo = !this.esCreacion;

    try {
        if (this.esCatalogo) {
          const [divisionesArea, tiposTuristicos] = await Promise.all([
            this.supabase.obtenerCatalogoNacionalesDivisionAreas(),
            this.supabase.obtenerTiposTuristicosCatalogo(true)
          ]);
          this.divisionesArea = divisionesArea;
          this.tiposTuristicos = tiposTuristicos;
        this.configurarFormularioCatalogo();
      } else {
        await this.cargarCatalogos();
      }

      if (this.esCreacion) {
        this.form.patchValue({
          tipo_desino_id: 1
        });
        this.aplicarReglasPorTipo(1, false);
      } else {
        if (!Number.isFinite(id)) {
          throw new Error('No se encontro el destino a editar.');
        }

        this.destinoId = id;
        await this.cargarDestinoCatalogo(id);
      }

      this.form.get('tipo_desino_id')?.valueChanges.subscribe((tipoId) => {
        this.aplicarReglasPorTipo(Number(tipoId));
      });
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo cargar la informacion del destino.';
    } finally {
      this.cargando = false;
    }
  }

  async guardar() {
    if (this.form.invalid || (!this.esCreacion && !this.destinoId)) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.error = '';
    this.mostrarModalExito = false;

    try {
      const raw = this.form.getRawValue();

      if (this.esCatalogo) {
        await this.supabase.actualizarCatalogoDestinoAdmin(this.destinoId, {
          nombre: (raw.nombre ?? '').trim(),
          orden: this.parseNumber(raw.orden) ?? 0,
          prioridad: raw.prioridad === 1 ? 1 : 2,
          tipo_turistico_id: raw.tipo_turistico_id ?? null,
          division_area_id: raw.division_area_id ?? null,
          imagen_destino: this.limpiarTexto(raw.imagen_destino),
          activo: raw.activo ?? true
        });
        this.mostrarModalExito = true;
        return;
      }

      const tipoId = Number(raw.tipo_desino_id);
      const esTipoDos = tipoId === 2;
      const payload = {
        nombre: (raw.nombre ?? '').trim(),
        orden: this.parseNumber(raw.orden),
        tipo_desino_id: tipoId,
        destino_padre_id: esTipoDos ? (raw.destino_padre_id ?? null) : null,
        continente_id: esTipoDos ? (raw.continente_id ?? null) : null,
        imagen_destino: this.limpiarTexto(raw.imagen_destino),
        imagen_cotizacion: this.limpiarTexto(raw.imagen_cotizacion),
        activo: raw.activo ?? true
      };

      if (this.esCreacion) {
        await this.supabase.crearDestinoAdmin(payload);
      } else {
        await this.supabase.actualizarDestinoAdmin(this.destinoId, payload);
      }

      this.mostrarModalExito = true;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo guardar el destino.';
    } finally {
      this.guardando = false;
    }
  }

  cerrarModalExito() {
    this.mostrarModalExito = false;
    this.regresarAlListado();
  }

  regresar() {
    this.regresarAlListado();
  }

  get divisionesAreaOpciones(): TpSelectSearchOption[] {
    return this.divisionesArea.map((division) => ({ value: division.id, label: division.nombre }));
  }

  get tiposTuristicosOpciones(): TpSelectSearchOption[] {
    return this.tiposTuristicos.map((tipo) => ({
      value: tipo.id,
      label: tipo.activo ? tipo.nombre : `${tipo.nombre} (inactivo)`
    }));
  }

  desplazarASeccion(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private regresarAlListado() {
    this.router.navigate(['/admin/destinos/configurar-destinos'], { queryParams: this.route.snapshot.queryParams });
  }

  private async cargarCatalogos(destinoId?: number) {
    const [tiposDestino, continentesResponse, destinosPadre] = await Promise.all([
      this.supabase.obtenerTiposDestinoAdmin(),
      this.supabase.continentes(),
      this.supabase.obtenerDestinosPadreTipoDos(destinoId)
    ]);

    if (continentesResponse.error) {
      throw continentesResponse.error;
    }

    this.tiposDestino = tiposDestino ?? [];
    this.continentes = continentesResponse.data ?? [];
    this.destinosPadre = destinosPadre ?? [];
  }

  private async cargarDestinoCatalogo(id: number) {
    const data = await this.supabase.obtenerCatalogoDestinoAdmin(id);

    if (!data) {
      throw new Error('No se encontro el destino solicitado.');
    }

    this.form.patchValue({
      nombre: data.nombre ?? '',
      orden: data.orden ?? 0,
      prioridad: data.prioridad === 1 ? 1 : 2,
      tipo_turistico_id: data.tipo_turistico_id ?? null,
      division_area_id: data.division_area_id ?? null,
      imagen_destino: data.imagen_destino ?? '',
      activo: data.activo ?? true
    });
  }

  private configurarFormularioCatalogo() {
    const tipoControl = this.form.get('tipo_desino_id');
    tipoControl?.clearValidators();
    tipoControl?.updateValueAndValidity({ emitEvent: false });
  }

  private async cargarDestino(id: number) {
    const data = await this.supabase.obtenerDestinoPorId(id);

    if (!data) {
      throw new Error('No se encontro el destino solicitado.');
    }

    this.form.patchValue({
      nombre: data.nombre ?? '',
      orden: data.orden ?? null,
      tipo_desino_id: data.tipo_desino_id ?? null,
      destino_padre_id: data.destino_padre_id ?? null,
      continente_id: data.continente_id ?? null,
      imagen_destino: data.imagen_destino ?? '',
      imagen_cotizacion: data.imagen_cotizacion ?? '',
      activo: data.activo ?? true
    });

    this.aplicarReglasPorTipo(Number(data.tipo_desino_id), false);
  }

  private aplicarReglasPorTipo(tipoId: number, limpiarValores = true) {
    const destinoPadreControl = this.form.get('destino_padre_id');
    const continenteControl = this.form.get('continente_id');
    const habilitarCampos = tipoId === 2;

    if (habilitarCampos) {
      destinoPadreControl?.enable({ emitEvent: false });
      continenteControl?.enable({ emitEvent: false });
      return;
    }

    destinoPadreControl?.disable({ emitEvent: false });
    continenteControl?.disable({ emitEvent: false });

    if (limpiarValores) {
      this.form.patchValue(
        {
          destino_padre_id: null,
          continente_id: null
        },
        { emitEvent: false }
      );
    }
  }

  private limpiarTexto(value: string | null | undefined): string | null {
    const limpio = (value ?? '').trim();
    return limpio ? limpio : null;
  }

  private parseNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }
}
