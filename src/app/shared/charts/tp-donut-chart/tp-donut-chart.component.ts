import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'app/shared/material.module';

export interface TpDonutSegment {
  label: string;
  value: number;
  color?: string;
}

@Component({
  selector: 'tp-donut-chart',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './tp-donut-chart.component.html',
  styleUrl: './tp-donut-chart.component.scss'
})
export class TpDonutChartComponent implements OnInit, OnChanges {
  @Input() data: TpDonutSegment[] = [];
  @Input() title = 'Total';
  @Input() centerSubtext?: string;
  @Input() height = 280;
  @Output() segmentClick = new EventEmitter<{ label: string; value: number; index: number }>();

  defaultColors = ['#057a55', '#0ea5e9', '#6366f1', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];
  
  total = 0;
  segments: {
    label: string;
    value: number;
    color: string;
    percentage: number;
    dashArray: string;
    dashOffset: number;
    rawIndex: number;
  }[] = [];

  activeSegmentIndex: number | null = null;
  circumference = 502.65; // 2 * PI * 80

  ngOnInit(): void {
    this.recalculate();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.recalculate();
    }
  }

  recalculate(): void {
    const validItems = (this.data || []).filter(item => item && typeof item.value === 'number');

    this.total = validItems.reduce((sum, item) => sum + Math.max(item.value, 0), 0);
    
    if (this.total === 0 || validItems.length === 0) {
      this.segments = [];
      return;
    }

    let currentOffset = 0;

    this.segments = validItems.map((item, idx) => {
      const val = Math.max(item.value, 0);
      const frac = val / this.total;
      const strokeLen = frac * this.circumference;
      const color = item.color || this.defaultColors[idx % this.defaultColors.length];
      const percentage = Number((frac * 100).toFixed(1));

      const segment = {
        label: item.label,
        value: val,
        color,
        percentage,
        dashArray: `${strokeLen} ${this.circumference}`,
        dashOffset: -currentOffset,
        rawIndex: idx,
      };

      currentOffset += strokeLen;
      return segment;
    });
  }

  hoverSegment(idx: number | null): void {
    this.activeSegmentIndex = idx;
  }

  onSegmentClick(seg: { label: string; value: number; rawIndex: number }): void {
    this.segmentClick.emit({ label: seg.label, value: seg.value, index: seg.rawIndex });
  }

  get activeSegment() {
    if (this.activeSegmentIndex === null || !this.segments[this.activeSegmentIndex]) {
      return null;
    }
    return this.segments[this.activeSegmentIndex];
  }
}
