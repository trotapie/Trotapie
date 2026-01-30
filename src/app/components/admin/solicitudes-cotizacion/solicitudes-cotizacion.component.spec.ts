import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolicitudesCotizacionComponent } from './solicitudes-cotizacion.component';

describe('SolicitudesCotizacionComponent', () => {
  let component: SolicitudesCotizacionComponent;
  let fixture: ComponentFixture<SolicitudesCotizacionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolicitudesCotizacionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SolicitudesCotizacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
