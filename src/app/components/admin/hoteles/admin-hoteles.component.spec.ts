import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminHotelesComponent } from './admin-hoteles.component';

describe('AdminHotelesComponent', () => {
  let component: AdminHotelesComponent;
  let fixture: ComponentFixture<AdminHotelesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminHotelesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminHotelesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
