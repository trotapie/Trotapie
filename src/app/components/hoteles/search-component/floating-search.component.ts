import { Component, computed, effect, ElementRef, EventEmitter, HostListener, Input, Output, Signal, signal, SimpleChanges, ViewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from 'app/shared/material.module';
import { IHoteles } from '../hoteles.interface';

@Component({
    selector: 'app-floating-search',
    standalone: true,
    imports: [NgClass, FormsModule, MaterialModule],
    templateUrl: './floating-search.component.html',
})
export class FloatingSearchComponent {
    isOpen = signal(false);
    query = signal('');
    @Output() search = new EventEmitter<string>();
    @Input() data: IHoteles[] = [];
    @Input() debounceMs = 1000;
    @Output() filtered = new EventEmitter<IHoteles[]>();

    @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;

    term = signal('');
    private dataSig = signal<IHoteles[]>([]);

    private _focusEff = effect(() => {
        if (this.isOpen()) {
            queueMicrotask(() => this.inputEl?.nativeElement?.focus());
        }
    });

    ngOnInit() {
        const valor = sessionStorage.getItem('filtros');
        if (valor) {
            this.toggle()
            setTimeout(() => {
                this.term.set(valor);
                this.search.emit(valor);
                this.emitFiltered();
            }, 400);
        }
    }

    toggle() {
        const open = !this.isOpen();
        this.isOpen.set(open);
        if (!open) {
            this.term.set('');
            this.search.emit('');
            this.emitFiltered();
            sessionStorage.removeItem('filtros')
        }
    }

    submit() {
        this.search.emit(this.term());
        this.emitFiltered();
    }

    @HostListener('document:keydown.escape')
    onEsc() {
        if (this.isOpen()) this.toggle();
    }

    stop(ev: Event) { ev.stopPropagation(); }

    onInput(ev: Event) {
        const value = (ev.target as HTMLInputElement).value;
        sessionStorage.setItem('filtros', value);
        this.term.set(value);
        this.search.emit(value);
        this.emitFiltered();
    }

    private filteredData = computed<IHoteles[]>(() => {
        const t = this.term().toLowerCase().trim();
        const src = this.dataSig();
        if (!t) return src;

        return src
            .map(c => ({
                ...c,
                hoteles: c.hoteles.filter(h => h.nombre?.toLowerCase().includes(t))
            }))
            .filter(c => c.hoteles.length > 0);
    });

    private emitTimer: any = null;
    private emitFiltered() {
        const payload = this.filteredData();
        if (!this.debounceMs) {
            this.filtered.emit(payload);
            return;
        }
        clearTimeout(this.emitTimer);
        this.emitTimer = setTimeout(() => this.filtered.emit(payload), this.debounceMs);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['data']) {
            this.dataSig.set(this.data ?? []);
            this.emitFiltered();
        }
    }

}
