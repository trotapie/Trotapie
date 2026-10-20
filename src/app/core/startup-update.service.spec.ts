import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { StartupUpdateService } from './startup-update.service';

describe('StartupUpdateService', () => {
    let updates: { isEnabled: boolean; checkForUpdate: jasmine.Spy };

    beforeEach(() => {
        updates = {
            isEnabled: true,
            checkForUpdate: jasmine.createSpy('checkForUpdate').and.resolveTo(false),
        };
        TestBed.configureTestingModule({
            providers: [{ provide: SwUpdate, useValue: updates }],
        });
    });

    it('permite entrar inmediatamente si el service worker esta deshabilitado', () => {
        updates.isEnabled = false;
        const service = TestBed.inject(StartupUpdateService);
        expect(service.ready()).toBeTrue();
        expect(updates.checkForUpdate).not.toHaveBeenCalled();
    });

    it('comprueba una sola vez y permite entrar si no hay novedades', fakeAsync(() => {
        const service = TestBed.inject(StartupUpdateService);
        expect(service.ready()).toBeFalse();
        flushMicrotasks();
        expect(service.ready()).toBeTrue();
        tick(60000);
        expect(updates.checkForUpdate).toHaveBeenCalledTimes(1);
    }));

    it('permite entrar si la comprobacion falla', fakeAsync(() => {
        updates.checkForUpdate.and.rejectWith(new Error('Offline'));
        const service = TestBed.inject(StartupUpdateService);
        flushMicrotasks();
        expect(service.ready()).toBeTrue();
    }));

    it('no intenta recargar si la actualizacion termina despues del plazo', fakeAsync(() => {
        let finish!: (updated: boolean) => void;
        updates.checkForUpdate.and.returnValue(new Promise<boolean>((resolve) => {
            finish = resolve;
        }));
        const storageWrite = spyOn(Storage.prototype, 'setItem');
        const service = TestBed.inject(StartupUpdateService);
        tick(2000);
        expect(service.ready()).toBeTrue();
        finish(true);
        flushMicrotasks();
        expect(storageWrite).not.toHaveBeenCalled();
        expect(updates.checkForUpdate).toHaveBeenCalledTimes(1);
    }));
});
