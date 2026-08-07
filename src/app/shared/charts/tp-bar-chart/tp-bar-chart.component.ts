import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'app/shared/material.module';

export interface TpBarItem {
  label: string;
  value: number;
  color?: string;
}

@Component({
  selector: 'tp-bar-chart',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './tp-bar-chart.component.html',
  styleUrl: './tp-bar-chart.component.scss'
})
export class TpBarChartComponent implements OnInit, OnChanges {
  @Input() data: TpBarItem[] = [];
  @Input() height = 280;
  @Output() barClick = new EventEmitter<{ label: string; value: number; index: number }>();

  defaultColors = ['#0ea5e9', '#057a55', '#f59e0b', '#ef4444', '#6366f1'];
  
  width = 800;
  viewBox = '0 0 800 280';
  
  paddingLeft = 30;
  paddingRight = 30;
  paddingTop = 35;
  paddingBottom = 45;
  
  bars: {
    label: string;
    value: number;
    color: string;
    x: number;
    y: number;
    barWidth: number;
    barHeight: number;
    xPercent: number;
    widthPercent: number;
    topPx: number;
    rawIndex: number;
  }[] = [];

  gridLines: { y: number; value: number }[] = [];
  activeBarIndex: number | null = null;

  ngOnInit(): void {
    this.recalculate();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['height']) {
      this.recalculate();
    }
  }

  recalculate(): void {
    const validItems = (this.data || []).filter(item => item && typeof item.value === 'number');

    if (validItems.length === 0) {
      this.bars = [];
      this.gridLines = [];
      return;
    }

    this.viewBox = `0 0 ${this.width} ${this.height}`;

    const drawWidth = this.width - this.paddingLeft - this.paddingRight;
    const drawHeight = this.height - this.paddingTop - this.paddingBottom;

    const values = validItems.map(d => d.value);
    const maxVal = Math.max(...values, 1);

    // Horizontal Grid lines (4 steps)
    this.gridLines = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const val = Math.round((maxVal / steps) * i);
      const y = this.paddingTop + drawHeight - (val / maxVal) * drawHeight;
      this.gridLines.push({ y, value: val });
    }

    const count = validItems.length;
    const slotWidth = drawWidth / count;
    const barWidth = Math.min(slotWidth * 0.45, 52);

    this.bars = validItems.map((item, idx) => {
      const val = Math.max(item.value, 0);
      const h = (val / maxVal) * drawHeight;
      const x = this.paddingLeft + idx * slotWidth + (slotWidth - barWidth) / 2;
      const y = this.paddingTop + drawHeight - h;
      const color = item.color || this.defaultColors[idx % this.defaultColors.length];

      return {
        label: item.label,
        value: val,
        color,
        x,
        y,
        barWidth,
        barHeight: Math.max(h, 4),
        xPercent: ((x - this.paddingLeft) / drawWidth) * 100,
        widthPercent: (barWidth / drawWidth) * 100,
        topPx: y,
        rawIndex: idx,
      };
    });
  }

  hoverBar(idx: number | null): void {
    this.activeBarIndex = idx;
  }

  onBarClick(bar: { label: string; value: number; rawIndex: number }): void {
    this.barClick.emit({ label: bar.label, value: bar.value, index: bar.rawIndex });
  }

  get activeBar() {
    if (this.activeBarIndex === null || !this.bars[this.activeBarIndex]) {
      return null;
    }
    return this.bars[this.activeBarIndex];
  }
}
