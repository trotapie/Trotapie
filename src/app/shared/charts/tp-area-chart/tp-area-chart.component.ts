import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'app/shared/material.module';

export interface TpChartPoint {
  label: string;
  value: number;
  date?: string;
}

@Component({
  selector: 'tp-area-chart',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './tp-area-chart.component.html',
  styleUrl: './tp-area-chart.component.scss'
})
export class TpAreaChartComponent implements OnInit, OnChanges {
  @ViewChild('svgRef', { static: false }) svgRef!: ElementRef<SVGSVGElement>;

  @Input() data: TpChartPoint[] = [];
  @Input() strokeColor = '#057a55';
  @Input() gradientStart = 'rgba(5, 122, 85, 0.35)';
  @Input() gradientEnd = 'rgba(5, 122, 85, 0.01)';
  @Input() height = 300;
  @Output() pointClick = new EventEmitter<{ label: string; value: number; index: number }>();

  Math = Math;
  gradientId = 'tp-area-grad-' + Math.random().toString(36).substring(2, 9);
  
  width = 800;
  viewBox = '0 0 800 300';
  
  paddingLeft = 40;
  paddingRight = 25;
  paddingTop = 25;
  paddingBottom = 40;
  
  computedPoints: { x: number; y: number; data: TpChartPoint; rawIndex: number }[] = [];
  linePath = '';
  areaPath = '';
  gridLines: { y: number; value: number }[] = [];
  
  activePointIndex: number | null = null;

  ngOnInit(): void {
    this.recalculate();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['height']) {
      this.recalculate();
    }
  }

  recalculate(): void {
    if (!this.data || this.data.length === 0) {
      this.linePath = '';
      this.areaPath = '';
      this.computedPoints = [];
      this.gridLines = [];
      return;
    }

    this.viewBox = `0 0 ${this.width} ${this.height}`;

    const drawWidth = this.width - this.paddingLeft - this.paddingRight;
    const drawHeight = this.height - this.paddingTop - this.paddingBottom;

    const values = this.data.map(d => d.value);
    const maxVal = Math.max(...values, 1);

    // Horizontal Grid lines (4 intervals)
    this.gridLines = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const val = Math.round((maxVal / steps) * i);
      const y = this.paddingTop + drawHeight - (val / maxVal) * drawHeight;
      this.gridLines.push({ y, value: val });
    }

    // Point coordinates
    const count = this.data.length;
    const stepX = count > 1 ? drawWidth / (count - 1) : drawWidth;

    this.computedPoints = this.data.map((item, idx) => {
      const x = this.paddingLeft + (count > 1 ? idx * stepX : drawWidth / 2);
      const y = this.paddingTop + drawHeight - (item.value / maxVal) * drawHeight;
      return { x, y, data: item, rawIndex: idx };
    });

    if (this.computedPoints.length === 1) {
      const pt = this.computedPoints[0];
      this.linePath = `M ${pt.x - 30} ${pt.y} L ${pt.x + 30} ${pt.y}`;
      this.areaPath = `M ${pt.x - 30} ${pt.y} L ${pt.x + 30} ${pt.y} L ${pt.x + 30} ${this.height - this.paddingBottom} L ${pt.x - 30} ${this.height - this.paddingBottom} Z`;
      return;
    }

    // Smooth Bézier curve
    let dLine = `M ${this.computedPoints[0].x} ${this.computedPoints[0].y}`;
    for (let i = 0; i < this.computedPoints.length - 1; i++) {
      const p0 = this.computedPoints[i];
      const p1 = this.computedPoints[i + 1];
      const cx1 = p0.x + stepX * 0.4;
      const cy1 = p0.y;
      const cx2 = p1.x - stepX * 0.4;
      const cy2 = p1.y;
      dLine += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p1.x} ${p1.y}`;
    }

    this.linePath = dLine;
    const lastPt = this.computedPoints[this.computedPoints.length - 1];
    const firstPt = this.computedPoints[0];
    const bottomY = this.height - this.paddingBottom;

    this.areaPath = `${dLine} L ${lastPt.x} ${bottomY} L ${firstPt.x} ${bottomY} Z`;
  }

  onSvgMouseMove(event: MouseEvent): void {
    if (!this.computedPoints.length || !this.svgRef) return;

    const svgRect = this.svgRef.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - svgRect.left;
    const svgScaleX = this.width / svgRect.width;
    const chartX = mouseX * svgScaleX;

    let minDistance = Infinity;
    let closestIndex = 0;

    this.computedPoints.forEach((pt, idx) => {
      const dist = Math.abs(pt.x - chartX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = idx;
      }
    });

    this.activePointIndex = closestIndex;
  }

  hoverPoint(idx: number | null): void {
    this.activePointIndex = idx;
  }

  onPointClick(pt: { data: TpChartPoint; rawIndex: number }): void {
    this.pointClick.emit({ label: pt.data.label, value: pt.data.value, index: pt.rawIndex });
  }

  get sampledXLabels() {
    if (!this.computedPoints.length) return [];
    const drawWidth = this.width - this.paddingLeft - this.paddingRight;
    const count = this.computedPoints.length;
    const step = Math.ceil(count / 10);

    return this.computedPoints
      .filter((_, idx) => idx % step === 0 || idx === count - 1)
      .map(pt => ({
        label: pt.data.label,
        xPercent: ((pt.x - this.paddingLeft) / drawWidth) * 100,
      }));
  }

  get activePoint() {
    if (this.activePointIndex === null || !this.computedPoints[this.activePointIndex]) {
      return null;
    }
    return this.computedPoints[this.activePointIndex];
  }
}
