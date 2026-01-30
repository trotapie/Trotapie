import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegimenHotelesComponent } from './regimen-hoteles.component';

describe('RegimenHotelesComponent', () => {
  let component: RegimenHotelesComponent;
  let fixture: ComponentFixture<RegimenHotelesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegimenHotelesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegimenHotelesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
