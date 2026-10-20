import { DOCUMENT } from '@angular/common';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { FuseConfigService } from '@fuse/services/config';
import { AuthService } from 'app/core/auth/auth.service';
import { CatalogosAdminService } from 'app/core/catalogos-admin.service';
import { CotizacionesService } from 'app/core/cotizaciones.service';
import { DestinosService } from 'app/core/destinos.service';
import { EmpleadosService } from 'app/core/empleados.service';
import { SupabaseService } from 'app/core/supabase.service';
import { AdminComponent } from './admin.component';

describe('Dashboard refresh scheduling', () => {
  let component: AdminComponent;
  let documentState: { hidden: boolean; removeEventListener: jasmine.Spy };

  beforeEach(() => {
    documentState = { hidden: false, removeEventListener: jasmine.createSpy() };
    TestBed.configureTestingModule({ providers: [
      { provide: DOCUMENT, useValue: documentState },
      ...[Router, FuseConfigService, AuthService, CatalogosAdminService,
        CotizacionesService, DestinosService, EmpleadosService, SupabaseService]
        .map((provide) => ({ provide, useValue: {} })),
    ] });
    component = TestBed.runInInjectionContext(() => new AdminComponent());
  });

  it('waits two minutes from completion before refreshing', fakeAsync(() => {
    const refresh = spyOn(component, 'recargarDashboard').and.resolveTo();
    (component as any)._lastRefreshFinishedAt = Date.now();
    (component as any)._scheduleRefresh();
    tick(119_999);
    expect(refresh).not.toHaveBeenCalled();
    tick(1);
    expect(refresh).toHaveBeenCalledOnceWith(true);
    component.ngOnDestroy();
  }));

  it('pauses when hidden and refreshes stale data on return', fakeAsync(() => {
    const refresh = spyOn(component, 'recargarDashboard').and.resolveTo();
    (component as any)._lastRefreshFinishedAt = Date.now();
    (component as any)._scheduleRefresh();
    documentState.hidden = true;
    (component as any)._visibilityListener();
    tick(300_000);
    expect(refresh).not.toHaveBeenCalled();
    documentState.hidden = false;
    (component as any)._visibilityListener();
    tick(0);
    expect(refresh).toHaveBeenCalledOnceWith(true);
    component.ngOnDestroy();
  }));

  it('does not schedule during a load or after destruction', fakeAsync(() => {
    const refresh = spyOn(component, 'recargarDashboard').and.resolveTo();
    component.isLoading = true;
    (component as any)._scheduleRefresh();
    tick(300_000);
    component.isLoading = false;
    component.ngOnDestroy();
    (component as any)._scheduleRefresh();
    tick(300_000);
    expect(refresh).not.toHaveBeenCalled();
  }));

  it('backs off after failures', fakeAsync(() => {
    const refresh = spyOn(component, 'recargarDashboard').and.resolveTo();
    (component as any)._lastRefreshFinishedAt = Date.now();
    (component as any)._failedRefreshes = 1;
    (component as any)._scheduleRefresh();
    tick(239_999);
    expect(refresh).not.toHaveBeenCalled();
    tick(1);
    expect(refresh).toHaveBeenCalledOnceWith(true);
    component.ngOnDestroy();
  }));
});
