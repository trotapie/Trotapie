# Sistema de Diseño y Estructura Visual Unificada - Trotapie

## 1. Propósito y Visión General
Este documento establece el **Sistema de Diseño y la Estructura Visual Unificada** para la plataforma **Trotapie** (Angular 19, Fuse Admin, Tailwind CSS, Supabase).

El objetivo es garantizar que **todas las pantallas, módulos, formularios, tablas, modales y componentes compartidos tengan exactamente la misma anatomía visual, jerarquía, paleta, espaciado y comportamiento**, ofreciendo una experiencia de usuario rápida, predecible y de nivel profesional.

---

## 2. Anatomía Maestra de Pantalla (Estructura de 3 Niveles)

Toda pantalla administrativa o de gestión en Trotapie debe construirse siguiendo obligatoriamente este esquema de 3 niveles:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ NIVEL 1: HEADER STICKY (Breadcrumb, Título H1, Subtítulo, Botones de Acción)│
├─────────────────────────────────────────────────────────────────────────────┤
│ NIVEL 2: FRANJA DE KPIs / STATS CARDS (Métricas rápidas en cuadrícula)     │
├─────────────────────────────────────────────────────────────────────────────┤
│ NIVEL 3: PANEL PRINCIPAL (Toolbar con Búsqueda/Filtros + Tabla o Grid)      │
│          └─ Barra Flotante de Guardado / Paginación (si aplica)             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1. Nivel 1: Header de Pantalla (Sticky Page Header)
- **Ubicación:** Superior, fijo (`sticky top-0 z-[100]`), con fondo translúcido y desenfoque (`backdrop-blur-md`).
- **Lado Izquierdo:**
  - **Eyebrow / Breadcrumb:** Ruta de navegación superior en tamaño micro (`text-xs text-gray-500 dark:text-gray-400`) con separadores `/`.
  - **Título Principal (H1):** `text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white`.
  - **Subtítulo:** Descripción concisa de una sola línea en `text-xs sm:text-sm text-gray-500 dark:text-gray-400`.
- **Lado Derecho (Grupo de Acciones):**
  - Botones secundarios (Regresar, Exportar, Filtrar) usando `mat-stroked-button` con icono.
  - Botón principal de acción (Crear, Nuevo, Guardar) usando `mat-flat-button color="primary"` con icono representativo a la izquierda (`mr-1.5`).

#### Plantilla HTML Oficial:
```html
<header class="sticky top-0 z-[100] mx-3 mt-2 rounded-2xl border border-gray-200/60 bg-white/80 px-4 py-3 backdrop-blur-md shadow-sm dark:border-gray-800/80 dark:bg-gray-900/80 sm:mx-6 md:px-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
            <!-- Breadcrumb / Eyebrow -->
            <div class="flex items-center gap-2 text-xs">
                <span class="font-medium text-primary">Módulo Principal</span>
                <span class="text-gray-400">/</span>
                <span class="font-semibold text-gray-600 dark:text-gray-300">Subsección Actual</span>
            </div>
            <!-- Título y Descripción -->
            <h1 class="mt-0.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                Nombre de la Vista
            </h1>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                Descripción funcional de lo que el usuario administra en esta pantalla.
            </p>
        </div>

        <!-- Acciones Principales (Siempre con Iconos) -->
        <div class="flex flex-wrap items-center gap-2">
            <button mat-stroked-button [routerLink]="['/admin/anterior']" class="rounded-xl">
                <mat-icon class="mr-1.5 icon-size-4">arrow_back</mat-icon>
                Regresar
            </button>
            <button mat-flat-button color="primary" class="rounded-xl text-white shadow-sm" (click)="accionPrincipal()">
                <mat-icon class="mr-1.5 icon-size-4">add</mat-icon>
                Nuevo Elemento
            </button>
        </div>
    </div>
</header>
```

---

### 2.2. Nivel 2: Franja de Métricas Rápidas (Stat Cards / KPIs)
- **Cuadrícula:** 2 columnas en mobile (`grid-cols-2`), 4 columnas en desktop (`sm:grid-cols-4`), con separación consistente `gap-3 sm:gap-4`.
- **Estructura Interna de la Card:**
  - Contenedor con borde fino, radio `rounded-2xl`, fondo blanco (`dark:bg-gray-900`) y sombra suave `shadow-sm`.
  - Icono a la izquierda encerrado en un badge cuadrado/redondeado (`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center`).
  - Label superior en `text-xs font-medium text-gray-500 dark:text-gray-400`.
  - Valor numérico grande en `text-lg sm:text-2xl font-bold text-gray-900 dark:text-white`.
  - Badge o pill auxiliar con estado semántico (ej. "Activos", "Pendientes", "Al día").

#### Plantilla HTML Oficial:
```html
<section class="mx-3 mt-4 grid grid-cols-2 gap-3 sm:mx-6 sm:grid-cols-4 sm:gap-4">
    <!-- Stat Item -->
    <div class="flex items-center gap-3 rounded-2xl border border-gray-200/70 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-4">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <mat-icon svgIcon="heroicons_outline:cube"></mat-icon>
        </div>
        <div class="min-w-0 flex-1">
            <span class="block truncate text-xs font-medium text-gray-500 dark:text-gray-400">Total Elementos</span>
            <div class="flex items-baseline gap-2">
                <span class="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">{{ totalItems }}</span>
                <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    Activos
                </span>
            </div>
        </div>
    </div>
</section>
```

---

### 2.3. Nivel 3: Panel Principal de Contenido (Main Panel)
- **Contenedor:** `rounded-3xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden`.
- **Subsección 1: Toolbar de Filtros y Búsqueda:**
  - Encabezado con título de la sección y resumen de registros.
  - Barra de búsqueda con `app-tp-search-input` o input integrado con debounce.
  - Filtros tipo "Pills" / "Chips" deslizables para módulos o estados.
- **Subsección 2: Área de Datos (Tabla o Grilla):**
  - Visualización sin padding excesivo, alineación impecable y headers estilizados.
- **Subsección 3: Estados Integrados (Loading, Empty, Error).**

#### Plantilla HTML Oficial:
```html
<main class="mx-3 my-4 space-y-4 sm:mx-6">
    <section class="overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <!-- Toolbar Superior del Panel -->
        <div class="flex flex-col gap-3 border-b border-gray-100 p-4 dark:border-gray-800/80 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
                <h2 class="text-lg font-bold text-gray-900 dark:text-white">Listado Principal</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400">Filtra, busca y gestiona los registros en tiempo real.</p>
            </div>
            <!-- Buscador Compartido -->
            <div class="w-full sm:w-80">
                <app-tp-search-input
                    [placeholder]="'Buscar por nombre, código o clave...'"
                    [searchAriaLabel]="'Buscar registros'"
                    (search)="onSearch($event)">
                </app-tp-search-input>
            </div>
        </div>

        <!-- Filtros por Píldoras (Pill Tabs) -->
        <div class="flex items-center gap-1.5 overflow-x-auto border-b border-gray-100 bg-gray-50/50 px-4 py-2.5 dark:border-gray-800/60 dark:bg-gray-900/40">
            <button type="button"
                class="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200"
                [class.bg-primary]="filtroActivo === 'todos'"
                [class.text-white]="filtroActivo === 'todos'"
                [class.bg-white]="filtroActivo !== 'todos'"
                [class.text-gray-700]="filtroActivo !== 'todos'"
                [class.border]="filtroActivo !== 'todos'"
                [class.border-gray-200]="filtroActivo !== 'todos'"
                (click)="cambiarFiltro('todos')">
                <mat-icon class="icon-size-3.5" [svgIcon]="filtroActivo === 'todos' ? 'heroicons_outline:check' : 'heroicons_outline:squares-2x2'"></mat-icon>
                <span>Todos</span>
                <span class="rounded-full bg-white/20 px-1.5 py-0.2 text-[0.65rem]">{{ totalItems }}</span>
            </button>
        </div>

        <!-- Tabla o Contenido Principal -->
        <div class="overflow-x-auto">
            <!-- (Ver Especificación de Tablas en Sección 5) -->
        </div>
    </section>
</main>
```

---

## 3. Sistema de Tokens y Paleta de Color

Para preservar consistencia absoluta entre vistas claras y oscuras, usa exclusivamente estos tokens y convenciones:

### 3.1. Paleta Primaria e Identidad
- **Primary Main:** `colors.indigo[600]` / `#2196F3` (Marca Trotapie).
- **Primary Hover:** `indigo-700` / `blue-600`.
- **Primary Subtle / Tint:** `bg-primary/10 text-primary` o `bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400`.

### 3.2. Escala de Grises y Superficies (Slate/Gray)
- **Fondo General de Aplicación:** `bg-gray-50 dark:bg-gray-950`.
- **Fondo de Cards y Paneles (`bg-card`):** `bg-white dark:bg-gray-900`.
- **Fondo de Subpaneles / Tablas Header:** `bg-gray-50/80 dark:bg-gray-800/60`.
- **Bordes Predeterminados:** `border-gray-200/80 dark:border-gray-800`.
- **Bordes Sutiles / Divisores:** `border-gray-100 dark:border-gray-800/70`.

### 3.3. Colores Semánticos de Estado
| Estado | Texto | Fondo Sutil | Borde |
| :--- | :--- | :--- | :--- |
| **Éxito / Activo** | `text-emerald-600 dark:text-emerald-400` | `bg-emerald-50 dark:bg-emerald-950/40` | `border-emerald-200 dark:border-emerald-800/50` |
| **Advertencia / Pendiente**| `text-amber-600 dark:text-amber-400` | `bg-amber-50 dark:bg-amber-950/40` | `border-amber-200 dark:border-amber-800/50` |
| **Error / Peligro / Eliminar**| `text-red-600 dark:text-red-400` | `bg-red-50 dark:bg-red-950/40` | `border-red-200 dark:border-red-900/50` |
| **Informativo / Neutro** | `text-slate-600 dark:text-slate-400` | `bg-slate-100 dark:bg-slate-800` | `border-slate-200 dark:border-slate-700` |

---

## 4. Tipografía y Jerarquía de Textos

- **Familia Tipográfica:** `Arial, "Century Gothic", sans-serif`. Monospace: `"IBM Plex Mono"`.
- **Escala de Jerarquía Obligatoria:**
  1. **H1 (Título de Pantalla):** `text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white`.
  2. **H2 (Título de Card/Panel/Modal):** `text-lg sm:text-xl font-bold text-gray-900 dark:text-white`.
  3. **H3 (Subtítulo de Bloque/Grupo):** `text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200`.
  4. **Cuerpo / Textos de Tabla:** `text-xs sm:text-sm text-gray-700 dark:text-gray-300`.
  5. **Labels y Ayudas:** `text-xs font-medium text-gray-500 dark:text-gray-400`.
  6. **Códigos Técnicos / IDs / Slugs:** `font-mono text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200`.

---

## 5. Patrones Oficiales de Componentes UI

### 5.1. Tablas de Datos (`mat-table` y Tablas Estándar)
- **Cabeceras:** `bg-gray-50/90 dark:bg-gray-800/70 text-[0.72rem] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 py-3.5 px-4`.
- **Filas de Datos:** Borde inferior `border-b border-gray-100 dark:border-gray-800/60`, hover suave `hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors`.
- **Columna de Acciones:** Alineada a la derecha o centrada, con botones iconicos agrupados (`tp-actions-menu` o botones de icono con tooltip).

```html
<table mat-table [dataSource]="datos" class="w-full">
    <!-- Columna Nombre -->
    <ng-container matColumnDef="nombre">
        <th mat-header-cell *matHeaderCellDef class="text-xs font-bold uppercase tracking-wider text-gray-500">Nombre</th>
        <td mat-cell *matCellDef="let item" class="py-3.5 px-4 font-medium text-gray-900 dark:text-white">
            {{ item.nombre }}
        </td>
    </ng-container>

    <!-- Columna Estado / Switch -->
    <ng-container matColumnDef="activo">
        <th mat-header-cell *matHeaderCellDef class="text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Estado</th>
        <td mat-cell *matCellDef="let item" class="py-3.5 px-4 text-center">
            <app-custom-switch [checked]="item.activo" (change)="toggleEstado(item)"></app-custom-switch>
        </td>
    </ng-container>

    <!-- Columna Acciones -->
    <ng-container matColumnDef="acciones">
        <th mat-header-cell *matHeaderCellDef class="text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Acciones</th>
        <td mat-cell *matCellDef="let item" class="py-3.5 px-4 text-right">
            <div class="flex items-center justify-end gap-1">
                <button mat-icon-button matTooltip="Editar" (click)="abrirEditar(item)" class="text-gray-600 hover:text-primary dark:text-gray-400" aria-label="Editar">
                    <mat-icon class="icon-size-4" svgIcon="heroicons_outline:pencil-square"></mat-icon>
                </button>
                <button mat-icon-button matTooltip="Eliminar" (click)="abrirEliminar(item)" class="text-gray-400 hover:text-red-600" aria-label="Eliminar">
                    <mat-icon class="icon-size-4" svgIcon="heroicons_outline:trash"></mat-icon>
                </button>
            </div>
        </td>
    </ng-container>

    <tr mat-header-row *matHeaderRowDef="columnas"></tr>
    <tr mat-row *matRowDef="let row; columns: columnas" class="hover:bg-gray-50/50 dark:hover:bg-gray-800/30"></tr>
</table>
```

---

### 5.2. Controles de Formulario Compartidos

#### A. Campos de Texto y Área (`app-tp-input` / `app-tp-textarea`)
- Usa `app-tp-input` para inputs estándar (texto, números, fecha, email, moneda).
- Siempre define `label`, `placeholder`, `[required]="true"` cuando aplique, y pasa el mensaje de error con `[error]="..."`.
```html
<app-tp-input
    label="Nombre completo"
    placeholder="Ej. Juan Pérez"
    [required]="true"
    [error]="form.get('nombre')?.invalid && form.get('nombre')?.touched ? 'El nombre es obligatorio' : ''"
    formControlName="nombre">
</app-tp-input>
```

#### B. Selects con Búsqueda (`app-tp-select-search`)
- Sigue el patrón visual aprobado: etiqueta superior clara, campo de borde redondeado `rounded-xl`, indicador chevron a la derecha y modal overlay con buscador integrado y check en opción activa.
```html
<app-tp-select-search
    label="Destino principal"
    placeholder="Selecciona un destino..."
    searchPlaceholder="Buscar destino..."
    [options]="destinosOpciones"
    [required]="true"
    formControlName="destino_id">
</app-tp-select-search>
```

#### C. Switches y Toggles (`app-custom-switch`)
- Sigue el patrón aprobado: etiqueta clara a la izquierda, switch alineado a la derecha con indicador verde y micro-iconos (check/cross).
```html
<div class="flex items-center justify-between rounded-xl border border-gray-200/80 bg-gray-50/50 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
    <div>
        <span class="text-sm font-semibold text-gray-900 dark:text-white">Publicar circuito</span>
        <p class="text-xs text-gray-500 dark:text-gray-400">Permite que los clientes vean y coticen este circuito.</p>
    </div>
    <app-custom-switch [checked]="form.get('activo')?.value" (change)="form.get('activo')?.setValue($event)"></app-custom-switch>
</div>
```

---

### 5.3. Modales y Diálogos de Confirmación

Todo modal en Trotapie debe tener la siguiente estructura estandarizada:
1. **Backdrop:** `fixed inset-0 z-[3000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4`.
2. **Contenedor Modal:** `rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl border border-gray-100 dark:border-gray-800 max-w-lg w-full`.
3. **Cabecera:** Badge con icono temático (`bg-primary/10 text-primary` o `bg-red-100 text-red-600`), Título H2 y botón de cerrar `close` con icono.
4. **Cuerpo:** Espaciado vertical `space-y-4` con inputs o texto explicativo.
5. **Footer:** Separador superior `border-t border-gray-100 dark:border-gray-800 pt-3`, botón Cancelar (`mat-stroked-button`) con icono a la izquierda del botón de Acción (`mat-flat-button color="primary"` o `color="warn"`).

#### Plantilla Oficial de Modal Destructivo (Eliminación):
```html
@if (modalEliminarAbierto) {
<div class="fixed inset-0 z-[3025] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/65 backdrop-blur-sm" (click)="cerrarModalEliminar()"></div>
    <div class="relative z-10 w-full max-w-md rounded-2xl border border-red-100 bg-white p-6 shadow-2xl dark:border-red-950/40 dark:bg-gray-900">
        <!-- Header con Icono de Alerta -->
        <div class="flex items-center gap-3 text-red-600 dark:text-red-400">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/50">
                <mat-icon svgIcon="heroicons_outline:trash"></mat-icon>
            </div>
            <div>
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">Confirmar Eliminación</h2>
                <span class="text-xs font-semibold text-red-600 dark:text-red-400">Acción irreversible</span>
            </div>
        </div>

        <!-- Mensaje de Advertencia -->
        <div class="mt-4 rounded-xl bg-gray-50 p-3.5 text-sm text-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
            <p>¿Estás seguro de que deseas eliminar este elemento? Esta operación no se puede deshacer.</p>
        </div>

        <!-- Botones de Acción (Ambos con Icono Obligatorio) -->
        <div class="mt-6 flex justify-end gap-2">
            <button mat-stroked-button (click)="cerrarModalEliminar()" [disabled]="eliminando">
                <mat-icon class="mr-1.5 icon-size-4">close</mat-icon>
                Cancelar
            </button>
            <button mat-flat-button color="warn" class="text-white" (click)="confirmarEliminar()" [disabled]="eliminando">
                <mat-icon class="mr-1.5 icon-size-4">{{ eliminando ? 'sync' : 'delete' }}</mat-icon>
                {{ eliminando ? 'Eliminando...' : 'Eliminar definitivamente' }}
            </button>
        </div>
    </div>
</div>
}
```

---

### 5.4. Barra Flotante de Cambios Pendientes (Floating Save Bar)

Para pantallas con edición en matriz o múltiples cambios acumulables (ej. Roles, Permisos, Tarifarios), se utiliza una barra flotante en la parte inferior:

```html
@if (hayCambios) {
<div class="fixed bottom-6 inset-x-0 mx-auto z-[200] flex max-w-2xl items-center justify-between rounded-2xl border border-gray-200/90 bg-white/95 px-5 py-3.5 shadow-2xl backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/95">
    <div class="flex items-center gap-3">
        <span class="h-3 w-3 rounded-full bg-amber-500 animate-pulse"></span>
        <p class="text-xs font-semibold text-gray-900 dark:text-white sm:text-sm">
            Hay cambios sin guardar
        </p>
    </div>
    <div class="flex items-center gap-2">
        <button mat-stroked-button (click)="descartarCambios()" [disabled]="guardando" class="rounded-xl text-xs">
            <mat-icon class="mr-1 icon-size-4">undo</mat-icon>
            Descartar
        </button>
        <button mat-flat-button color="primary" class="rounded-xl text-xs text-white" (click)="guardarCambios()" [disabled]="guardando">
            <mat-icon class="mr-1.5 icon-size-4">{{ guardando ? 'sync' : 'save' }}</mat-icon>
            {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
        </button>
    </div>
</div>
}
```

---

### 5.5. Regla Obligatoria de Botones y Acciones (Botones Siempre con Iconos)

> [!IMPORTANT]
> **REGLA ESTRICTA DE BOTONES:** **ABSOLUTAMENTE TODOS los botones del sistema deben incluir un icono contextual** (`mat-icon` de Material Icons o Heroicons). No se permiten botones planos con únicamente texto.

#### Reglas de Implementación para Botones:
1. **Posición y Espaciado:** El icono debe ubicarse **a la izquierda del texto**, con espaciado consistente:
   - Botones estándar/compactos: `<mat-icon class="mr-1.5 icon-size-4">icono</mat-icon>`
   - Botones principales/grandes: `<mat-icon class="mr-2 icon-size-5">icono</mat-icon>`
2. **Botones Exclusivamente Icónicos (`mat-icon-button`):**
   - Deben incluir obligatoriamente atributo accesible `[attr.aria-label]="..."` y tooltip explicativo `[matTooltip]="..."`.
3. **Estado de Carga Asíncrona (Loading):**
   - Cuando el botón pasa a estado de carga (`guardando`, `cargando`, `eliminando`), el icono debe mutar dinámicamente al icono de sincronización o animación:
     - `<mat-icon class="mr-1.5 icon-size-4">{{ cargando ? 'sync' : 'save' }}</mat-icon>`
4. **Catálogo Estándar de Iconos por Acción:**

| Acción | Tipo de Botón | Icono Recomendado | Ejemplo de Código |
| :--- | :--- | :--- | :--- |
| **Crear / Nuevo** | `mat-flat-button color="primary"` | `add` / `heroicons_outline:plus` | `<mat-icon class="mr-1.5 icon-size-4">add</mat-icon> Nuevo registro` |
| **Guardar / Confirmar**| `mat-flat-button color="primary"` | `save` / `check` / `heroicons_outline:check` | `<mat-icon class="mr-1.5 icon-size-4">save</mat-icon> Guardar` |
| **Cancelar / Salir** | `mat-stroked-button` | `close` / `heroicons_outline:x-mark` | `<mat-icon class="mr-1.5 icon-size-4">close</mat-icon> Cancelar` |
| **Regresar / Volver** | `mat-stroked-button` | `arrow_back` / `heroicons_outline:arrow-left`| `<mat-icon class="mr-1.5 icon-size-4">arrow_back</mat-icon> Regresar` |
| **Editar / Modificar**| `mat-stroked-button` o `mat-icon-button` | `heroicons_outline:pencil-square` | `<mat-icon class="mr-1.5 icon-size-4" svgIcon="heroicons_outline:pencil-square"></mat-icon> Editar` |
| **Eliminar / Borrar** | `mat-flat-button color="warn"` | `delete` / `heroicons_outline:trash` | `<mat-icon class="mr-1.5 icon-size-4">delete</mat-icon> Eliminar` |
| **Descartar / Deshacer**| `mat-stroked-button` | `undo` / `heroicons_outline:arrow-uturn-left` | `<mat-icon class="mr-1 icon-size-4">undo</mat-icon> Descartar` |
| **Filtrar / Búsqueda** | `mat-stroked-button` | `search` / `heroicons_outline:magnifying-glass` | `<mat-icon class="mr-1.5 icon-size-4">search</mat-icon> Filtrar` |
| **Exportar / Descargar**| `mat-stroked-button` | `download` / `heroicons_outline:arrow-down-tray`| `<mat-icon class="mr-1.5 icon-size-4">download</mat-icon> Exportar` |

---

## 6. Estados Obligatorios de Pantalla

Toda vista o contenedor de datos debe manejar e implementar con elegancia los 4 estados:

### 6.1. Loading State (Esqueleto o Spinner Limpio)
- En tablas: Filas skeleton con efecto shimmer (`roles-skeleton-row`).
- En páginas/componentes completos: `mat-progress-spinner` centrado o `app-blocking-loader`.

### 6.2. Empty State (Estado Vacío Amigable)
- Debe contener: Icono en gris neutro (`heroicons_outline:inbox` o `magnifying-glass`), título explicativo, texto breve y botón primario para crear el primer elemento.
```html
<div class="flex flex-col items-center justify-center p-12 text-center">
    <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800">
        <mat-icon class="icon-size-8" svgIcon="heroicons_outline:folder-open"></mat-icon>
    </div>
    <h3 class="mt-4 text-base font-bold text-gray-900 dark:text-white">No hay registros disponibles</h3>
    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm">
        Comienza agregando un nuevo registro para comenzar a operar.
    </p>
    <button mat-flat-button color="primary" class="mt-4 text-white" (click)="abrirModalCrear()">
        <mat-icon class="mr-1.5 icon-size-4">add</mat-icon>
        Crear primer registro
    </button>
</div>
```

### 6.3. Error State (Alerta Accionable)
- Banner con borde fino rojo `border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 rounded-xl p-3.5 flex items-center gap-2`.

### 6.4. Success / Feedback (Toast / Notificación)
- Utiliza el servicio central de toasts (`tp-toast` o `gooey-toast`) con mensajes concisos de éxito tras completar mutaciones.

---

## 7. Reglas de Responsive Design y Adaptabilidad

- **Móvil (< 600px):**
  - El Header de página apila el título y las acciones verticalmente (`flex-col`).
  - Los botones de acción ocupan el ancho completo o se distribuyen uniformemente.
  - Las tablas deben permitir scroll horizontal suave (`overflow-x-auto`) sin desbordar el viewport general.
  - Los modales deben adaptarse a `max-w-full m-3` con contenido desplazable.
- **Tablet (600px - 960px):**
  - Franja de KPIs en 2 filas x 2 columnas.
- **Desktop (960px+):**
  - Franja de KPIs en 4 columnas en 1 fila.
  - Acciones principales a la derecha alineadas con el título.

---

## 8. Checklist de Validación Visual para Desarrolladores

Antes de dar por terminada cualquier vista o componente en Trotapie, verifica:

- [ ] **¿TODOS los botones incluyen su icono contextual correspondiente a la izquierda del texto (`mr-1.5 icon-size-4`) o con tooltip accesible si son solo iconos?**
- [ ] ¿El Header de página sigue la anatomía Sticky con Breadcrumb, H1, Subtítulo y botones a la derecha?
- [ ] ¿La franja de métricas/KPIs usa la cuadrícula responsive `grid-cols-2 sm:grid-cols-4`?
- [ ] ¿El panel principal usa `rounded-3xl border border-gray-200/80 bg-white dark:bg-gray-900 shadow-sm`?
- [ ] ¿Los campos de formulario usan los componentes oficiales (`app-tp-input`, `app-tp-select-search`, `app-custom-switch`)?
- [ ] ¿Las acciones destructivas (eliminar) están protegidas por el modal oficial de confirmación con color `warn`?
- [ ] ¿La pantalla maneja explícitamente estados de `loading`, `empty` y `error`?
- [ ] ¿Se verificó que los contrastes y fondos funcionen perfectamente tanto en modo Claro como en Dark Mode?
- [ ] ¿No se modificó la lógica de negocio ni contratos de datos existentes?

---

## 9. Stack Tecnológico de Referencia
- **Angular 19** (Standalone Components, Signals, Control Flow `@if`, `@for`)
- **Fuse Admin Platform** (Estructura de Layouts, Menús, Helpers de Iconos)
- **Tailwind CSS 3.x** (Con paleta Slate/Gray, plugin de icon-size y theming dinámico)
- **Angular Material / CDK** (Overlay, Buttons, Icons, Tooltips, Tables)
- **Supabase** (PostgreSQL, Auth, Storage, Edge Functions)
