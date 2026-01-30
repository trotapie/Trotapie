import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ApexOptions } from 'apexcharts';
import { MaterialModule } from 'app/shared/material.module';
import { AnalyticsService } from './analytics.service';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin',
  imports: [MaterialModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit, OnDestroy {

  private _analyticsService = inject(AnalyticsService)
  private _router = inject(Router)


  chartVisitors: ApexOptions;
  chartConversions: ApexOptions;
  chartImpressions: ApexOptions;
  chartVisits: ApexOptions;
  chartVisitorsVsPageViews: ApexOptions;
  chartNewVsReturning: ApexOptions;
  chartGender: ApexOptions;
  chartAge: ApexOptions;
  chartLanguage: ApexOptions;
  data: any;

  private _unsubscribeAll: Subject<any> = new Subject<any>();

  ngOnInit(): void {

    // MOCK DATA TEMPORAL
    this.data = {
      visitors: {
        series: [
          {
            name: 'Visitors',
            data: [
              [new Date('2025-01-01').getTime(), 1200],
              [new Date('2025-01-02').getTime(), 1800],
              [new Date('2025-01-03').getTime(), 1500],
              [new Date('2025-01-04').getTime(), 2200],
              [new Date('2025-01-05').getTime(), 1900],
              [new Date('2025-01-06').getTime(), 2500],
              [new Date('2025-01-07').getTime(), 2300],
            ],
          },
        ],
      },

      conversions: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: [
          {
            name: 'Conversions',
            data: [12, 19, 15, 22, 18, 25, 23],
          },
        ],
      },

      impressions: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: [
          {
            name: 'Impressions',
            data: [300, 420, 380, 500, 460, 610, 590],
          },
        ],
      },

      visits: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        series: [
          {
            name: 'Visits',
            data: [80, 95, 90, 110, 105, 130, 125],
          },
        ],
      },

      visitorsVsPageViews: {
        series: [
          {
            name: 'Visitors',
            data: [
              [new Date('2025-01-01').getTime(), 1200],
              [new Date('2025-01-07').getTime(), 2300],
            ],
          },
          {
            name: 'Page Views',
            data: [
              [new Date('2025-01-01').getTime(), 2000],
              [new Date('2025-01-07').getTime(), 3200],
            ],
          },
        ],
      },

      newVsReturning: {
        labels: ['New', 'Returning'],
        series: [62, 38],
      },

      gender: {
        labels: ['Male', 'Female'],
        series: [58, 42],
      },

      age: {
        labels: ['18–24', '25–34', '35–44', '45–54', '55+'],
        series: [18, 32, 24, 16, 10],
      },

      language: {
        labels: ['Spanish', 'English'],
        series: [72, 28],
      },
    };

    // Construye los charts con el mock
    this._prepareChartData();
  }

  ngOnDestroy(): void {

  }

  private _prepareChartData(): void {
    // Visitors
    this.chartVisitors = {
      chart: {
        animations: {
          speed: 400,
          animateGradually: {
            enabled: false,
          },
        },
        fontFamily: 'inherit',
        foreColor: 'inherit',
        width: '100%',
        height: '100%',
        type: 'area',
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
      },
      colors: ['#818CF8'],
      dataLabels: {
        enabled: false,
      },
      fill: {
        colors: ['#312E81'],
      },
      grid: {
        show: true,
        borderColor: '#334155',
        padding: {
          top: 10,
          bottom: -40,
          left: 0,
          right: 0,
        },
        position: 'back',
        xaxis: {
          lines: {
            show: true,
          },
        },
      },
      series: this.data.visitors.series,
      stroke: {
        width: 2,
      },
      tooltip: {
        followCursor: true,
        theme: 'dark',
        x: {
          format: 'MMM dd, yyyy',
        },
        y: {
          formatter: (value: number): string => `${value}`,
        },
      },
      xaxis: {
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        crosshairs: {
          stroke: {
            color: '#475569',
            dashArray: 0,
            width: 2,
          },
        },
        labels: {
          offsetY: -20,
          style: {
            colors: '#CBD5E1',
          },
        },
        tickAmount: 20,
        tooltip: {
          enabled: false,
        },
        type: 'datetime',
      },
      yaxis: {
        axisTicks: {
          show: false,
        },
        axisBorder: {
          show: false,
        },
        min: (min): number => min - 750,
        max: (max): number => max + 250,
        tickAmount: 5,
        show: false,
      },
    };

    // Conversions
    this.chartConversions = {
      chart: {
        animations: {
          enabled: false,
        },
        fontFamily: 'inherit',
        foreColor: 'inherit',
        height: '100%',
        type: 'area',
        sparkline: {
          enabled: true,
        },
      },
      colors: ['#38BDF8'],
      fill: {
        colors: ['#38BDF8'],
        opacity: 0.5,
      },
      series: this.data.conversions.series,
      stroke: {
        curve: 'smooth',
      },
      tooltip: {
        followCursor: true,
        theme: 'dark',
      },
      xaxis: {
        type: 'category',
        categories: this.data.conversions.labels,
      },
      yaxis: {
        labels: {
          formatter: (val): string => val.toString(),
        },
      },
    };

    // Impressions
    this.chartImpressions = {
      chart: {
        animations: {
          enabled: false,
        },
        fontFamily: 'inherit',
        foreColor: 'inherit',
        height: '100%',
        type: 'area',
        sparkline: {
          enabled: true,
        },
      },
      colors: ['#34D399'],
      fill: {
        colors: ['#34D399'],
        opacity: 0.5,
      },
      series: this.data.impressions.series,
      stroke: {
        curve: 'smooth',
      },
      tooltip: {
        followCursor: true,
        theme: 'dark',
      },
      xaxis: {
        type: 'category',
        categories: this.data.impressions.labels,
      },
      yaxis: {
        labels: {
          formatter: (val): string => val.toString(),
        },
      },
    };

    // Visits
    this.chartVisits = {
      chart: {
        animations: {
          enabled: false,
        },
        fontFamily: 'inherit',
        foreColor: 'inherit',
        height: '100%',
        type: 'area',
        sparkline: {
          enabled: true,
        },
      },
      colors: ['#FB7185'],
      fill: {
        colors: ['#FB7185'],
        opacity: 0.5,
      },
      series: this.data.visits.series,
      stroke: {
        curve: 'smooth',
      },
      tooltip: {
        followCursor: true,
        theme: 'dark',
      },
      xaxis: {
        type: 'category',
        categories: this.data.visits.labels,
      },
      yaxis: {
        labels: {
          formatter: (val): string => val.toString(),
        },
      },
    };

    // Visitors vs Page Views
    this.chartVisitorsVsPageViews = {
      chart: {
        animations: {
          enabled: false,
        },
        fontFamily: 'inherit',
        foreColor: 'inherit',
        height: '100%',
        type: 'area',
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
      },
      colors: ['#64748B', '#94A3B8'],
      dataLabels: {
        enabled: false,
      },
      fill: {
        colors: ['#64748B', '#94A3B8'],
        opacity: 0.5,
      },
      grid: {
        show: false,
        padding: {
          bottom: -40,
          left: 0,
          right: 0,
        },
      },
      legend: {
        show: false,
      },
      series: this.data.visitorsVsPageViews.series,
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      tooltip: {
        followCursor: true,
        theme: 'dark',
        x: {
          format: 'MMM dd, yyyy',
        },
      },
      xaxis: {
        axisBorder: {
          show: false,
        },
        labels: {
          offsetY: -20,
          rotate: 0,
          style: {
            colors: 'var(--fuse-text-secondary)',
          },
        },
        tickAmount: 3,
        tooltip: {
          enabled: false,
        },
        type: 'datetime',
      },
      yaxis: {
        labels: {
          style: {
            colors: 'var(--fuse-text-secondary)',
          },
        },
        max: (max): number => max + 250,
        min: (min): number => min - 250,
        show: false,
        tickAmount: 5,
      },
    };

    // New vs. returning
    this.chartNewVsReturning = {
      chart: {
        animations: {
          speed: 400,
          animateGradually: {
            enabled: false,
          },
        },
        fontFamily: 'inherit',
        foreColor: 'inherit',
        height: '100%',
        type: 'donut',
        sparkline: {
          enabled: true,
        },
      },
      colors: ['#3182CE', '#63B3ED'],
      labels: this.data.newVsReturning.labels,
      plotOptions: {
        pie: {
          customScale: 0.9,
          expandOnClick: false,
          donut: {
            size: '70%',
          },
        },
      },
      series: this.data.newVsReturning.series,
      states: {
        hover: {
          filter: {
            type: 'none',
          },
        },
        active: {
          filter: {
            type: 'none',
          },
        },
      },
      tooltip: {
        enabled: true,
        fillSeriesColor: false,
        theme: 'dark',
        custom: ({
          seriesIndex,
          w,
        }): string => `<div class="flex items-center h-8 min-h-8 max-h-8 px-3">
                                                    <div class="w-3 h-3 rounded-full" style="background-color: ${w.config.colors[seriesIndex]};"></div>
                                                    <div class="ml-2 text-md leading-none">${w.config.labels[seriesIndex]}:</div>
                                                    <div class="ml-2 text-md font-bold leading-none">${w.config.series[seriesIndex]}%</div>
                                                </div>`,
      },
    };

    // Gender
    this.chartGender = {
      chart: {
        animations: {
          speed: 400,
          animateGradually: {
            enabled: false,
          },
        },
        fontFamily: 'inherit',
        foreColor: 'inherit',
        height: '100%',
        type: 'donut',
        sparkline: {
          enabled: true,
        },
      },
      colors: ['#319795', '#4FD1C5'],
      labels: this.data.gender.labels,
      plotOptions: {
        pie: {
          customScale: 0.9,
          expandOnClick: false,
          donut: {
            size: '70%',
          },
        },
      },
      series: this.data.gender.series,
      states: {
        hover: {
          filter: {
            type: 'none',
          },
        },
        active: {
          filter: {
            type: 'none',
          },
        },
      },
      tooltip: {
        enabled: true,
        fillSeriesColor: false,
        theme: 'dark',
        custom: ({
          seriesIndex,
          w,
        }): string => `<div class="flex items-center h-8 min-h-8 max-h-8 px-3">
                                                     <div class="w-3 h-3 rounded-full" style="background-color: ${w.config.colors[seriesIndex]};"></div>
                                                     <div class="ml-2 text-md leading-none">${w.config.labels[seriesIndex]}:</div>
                                                     <div class="ml-2 text-md font-bold leading-none">${w.config.series[seriesIndex]}%</div>
                                                 </div>`,
      },
    };

    // Age
    this.chartAge = {
      chart: {
        animations: {
          speed: 400,
          animateGradually: {
            enabled: false,
          },
        },
        fontFamily: 'inherit',
        foreColor: 'inherit',
        height: '100%',
        type: 'donut',
        sparkline: {
          enabled: true,
        },
      },
      colors: ['#DD6B20', '#F6AD55'],
      labels: this.data.age.labels,
      plotOptions: {
        pie: {
          customScale: 0.9,
          expandOnClick: false,
          donut: {
            size: '70%',
          },
        },
      },
      series: this.data.age.series,
      states: {
        hover: {
          filter: {
            type: 'none',
          },
        },
        active: {
          filter: {
            type: 'none',
          },
        },
      },
      tooltip: {
        enabled: true,
        fillSeriesColor: false,
        theme: 'dark',
        custom: ({
          seriesIndex,
          w,
        }): string => `<div class="flex items-center h-8 min-h-8 max-h-8 px-3">
                                                    <div class="w-3 h-3 rounded-full" style="background-color: ${w.config.colors[seriesIndex]};"></div>
                                                    <div class="ml-2 text-md leading-none">${w.config.labels[seriesIndex]}:</div>
                                                    <div class="ml-2 text-md font-bold leading-none">${w.config.series[seriesIndex]}%</div>
                                                </div>`,
      },
    };

    // Language
    this.chartLanguage = {
      chart: {
        animations: {
          speed: 400,
          animateGradually: {
            enabled: false,
          },
        },
        fontFamily: 'inherit',
        foreColor: 'inherit',
        height: '100%',
        type: 'donut',
        sparkline: {
          enabled: true,
        },
      },
      colors: ['#805AD5', '#B794F4'],
      labels: this.data.language.labels,
      plotOptions: {
        pie: {
          customScale: 0.9,
          expandOnClick: false,
          donut: {
            size: '70%',
          },
        },
      },
      series: this.data.language.series,
      states: {
        hover: {
          filter: {
            type: 'none',
          },
        },
        active: {
          filter: {
            type: 'none',
          },
        },
      },
      tooltip: {
        enabled: true,
        fillSeriesColor: false,
        theme: 'dark',
        custom: ({
          seriesIndex,
          w,
        }): string => `<div class="flex items-center h-8 min-h-8 max-h-8 px-3">
                                                    <div class="w-3 h-3 rounded-full" style="background-color: ${w.config.colors[seriesIndex]};"></div>
                                                    <div class="ml-2 text-md leading-none">${w.config.labels[seriesIndex]}:</div>
                                                    <div class="ml-2 text-md font-bold leading-none">${w.config.series[seriesIndex]}%</div>
                                                </div>`,
      },
    };
  }

  private _fixSvgFill(element: Element): void {
    // Current URL
    const currentURL = this._router.url;

    // 1. Find all elements with 'fill' attribute within the element
    // 2. Filter out the ones that doesn't have cross reference so we only left with the ones that use the 'url(#id)' syntax
    // 3. Insert the 'currentURL' at the front of the 'fill' attribute value
    Array.from(element.querySelectorAll('*[fill]'))
      .filter((el) => el.getAttribute('fill').indexOf('url(') !== -1)
      .forEach((el) => {
        const attrVal = el.getAttribute('fill');
        el.setAttribute(
          'fill',
          `url(${currentURL}${attrVal.slice(attrVal.indexOf('#'))}`
        );
      });
  }

}
