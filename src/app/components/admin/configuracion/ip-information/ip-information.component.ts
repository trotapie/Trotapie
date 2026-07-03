import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IpQueryResponse } from 'app/core/models/ip-query.model';
import { IpQueryService } from 'app/core/services/ip-query.service';
import { MaterialModule } from 'app/shared/material.module';

@Component({
  selector: 'app-ip-information',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MaterialModule],
  templateUrl: './ip-information.component.html',
  styleUrl: './ip-information.component.scss',
})
export class IpInformationComponent implements OnInit {
  private readonly ipQueryService = inject(IpQueryService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ipControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly currentData = signal<IpQueryResponse | null>(null);
  readonly queryLabel = signal('Tu IP pública');
  readonly lastQueryType = signal<'current' | 'specific'>('current');
  readonly lastSpecificIp = signal('');

  readonly hasData = computed(() => this.currentData() !== null);

  ngOnInit(): void {
    this.loadCurrentIpInfo();
  }

  loadCurrentIpInfo(): void {
    this.lastQueryType.set('current');
    this.executeQuery(this.ipQueryService.getCurrentIpInfo(), 'Tu IP pública');
  }

  consultSpecificIp(): void {
    if (this.loading()) {
      return;
    }

    this.ipControl.markAsTouched();

    if (this.ipControl.invalid) {
      this.errorMessage.set('Escribe una IP válida para continuar.');
      return;
    }

    const ip = this.ipControl.value.trim();
    this.lastQueryType.set('specific');
    this.lastSpecificIp.set(ip);
    this.executeQuery(this.ipQueryService.getIpInfo(ip), ip);
  }

  retryLastQuery(): void {
    if (this.lastQueryType() === 'specific') {
      const ip = this.lastSpecificIp().trim();
      if (ip) {
        this.executeQuery(this.ipQueryService.getIpInfo(ip), ip);
        return;
      }
    }

    this.loadCurrentIpInfo();
  }

  resetSearch(): void {
    this.ipControl.setValue('');
    this.ipControl.markAsUntouched();
    this.errorMessage.set('');
  }

  booleanLabel(value: boolean): string {
    return value ? 'Sí' : 'No';
  }

  private executeQuery(request$: Observable<IpQueryResponse>, label: string): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: (response) => {
          this.currentData.set(response);
          this.queryLabel.set(label);
        },
        error: (error: unknown) => {
          this.errorMessage.set(error instanceof Error ? error.message : 'No se pudo consultar la IP.');
        },
      });
  }

  get locationSummary(): string {
    const data = this.currentData();
    if (!data) {
      return '';
    }

    return [data.location.city, data.location.state, data.location.country].filter(Boolean).join(', ');
  }
}
