import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { EmpleadosComponent } from './empleados.component';
import { SupabaseService } from 'app/core/supabase.service';

describe('EmpleadosComponent', () => {
  let component: EmpleadosComponent;
  let fixture: ComponentFixture<EmpleadosComponent>;
  const supabaseMock = {
    empleados: jasmine.createSpy('empleados').and.resolveTo({ data: [], error: null }),
    crearEmpleadoAdmin: jasmine.createSpy('crearEmpleadoAdmin').and.resolveTo({ id: 1, nombre: 'Empleado test' }),
    actualizarEmpleadoAdmin: jasmine.createSpy('actualizarEmpleadoAdmin').and.resolveTo({ id: 1, nombre: 'Empleado test' }),
    actualizarEstatusEmpleadoAdmin: jasmine.createSpy('actualizarEstatusEmpleadoAdmin').and.resolveTo({ id: 1, nombre: 'Empleado test', estatus_id: 2 })
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmpleadosComponent, NoopAnimationsModule],
      providers: [
        { provide: SupabaseService, useValue: supabaseMock }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmpleadosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
