import { HttpClient } from '@angular/common/http';
import { Component, inject, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HOTELES_DATA } from 'assets/data/hoteles';
import { IHoteles } from './hoeteles.interface';
import { MaterialModule } from 'app/shared/material.module';

@Component({
    selector: 'hoteles',
    standalone: true,
    templateUrl: './hoteles.component.html',
    imports: [MaterialModule],
    encapsulation: ViewEncapsulation.None,
})
export class HotelesComponent {
    private formBuilder = inject(FormBuilder);

    /**
     * Constructor
     */

    hotelesForm: FormGroup;
    listaHoteles: IHoteles[];
    constructor(private http: HttpClient) {
    }

    ngOnInit() {
       console.log(HOTELES_DATA);
       this.listaHoteles = HOTELES_DATA;
        this.hotelesForm = this.formBuilder.group({
                hotelSeleccionado: ['']
            });
    }
}
