import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminActividadesComponent } from './admin-actividades.component';

describe('AdminActividadesComponent', () => {
  let component: AdminActividadesComponent;
  let fixture: ComponentFixture<AdminActividadesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminActividadesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminActividadesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
