import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';

import { DashboardService, DashboardData, ExecutionHistoryItem, CircleItem } from './dashboard.service';
import { WebSocketService, DashboardSocketEvent } from '../core/websocket.service';

Chart.register(...registerables);

interface StatCard {
  icon: string;
  label: string;
  value: string;
  subLabel?: string;
  iconBg: string;
  iconColor: string;
}

interface ExecutionRow {
  id: string;
  subId: string;
  action: string;
  timestamp: string;
  status: 'Failed' | 'Running' | 'Success';
  circle: string;
}

interface LegendItem {
  label: string;
  color: string;
  hidden: boolean;
}

const ALL_CIRCLES = 'All circles';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  private rawData?: DashboardData;

  stats: StatCard[] = [];
  executionHistory: ExecutionRow[] = [];

  commandStatusTotal = 0;
  commandStatus: { label: string; value: number; color: string }[] = [];

  nodeAvailabilityLabels: string[] = [];
  nodeAvailabilityDown: any[] = [];
  nodeAvailabilityUp: number[] = [];

  commandsPerNodeLabels: string[] = [];
  commandsPerNodeFailed: number[] = [];
  commandsPerNodeSuccess: number[] = [];

  commandsPerNodeLegend: LegendItem[] = [
    { label: 'Failed', color: '#e0433d', hidden: false },
    { label: 'Success', color: '#12a37f', hidden: false }
  ];

  circleOptions: CircleItem[] = [];
  readonly allCircles = ALL_CIRCLES;
  selectedExecCircle = ALL_CIRCLES;
  selectedNodeAvailCircle = ALL_CIRCLES;
  selectedCommandStatusCircle = ALL_CIRCLES;
  selectedCommandsPerNodeCircle = ALL_CIRCLES;

  loading = true;

  @ViewChild('nodeAvailabilityCanvas') nodeAvailabilityCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('commandStatusCanvas') commandStatusCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('commandsPerNodeCanvas') commandsPerNodeCanvas!: ElementRef<HTMLCanvasElement>;

  private nodeAvailabilityChart?: Chart;
  private commandStatusChart?: Chart;
  private commandsPerNodeChart?: Chart;
  private websocketSubscription?: Subscription;

  private dataLoaded = false;
  private viewInitialized = false;

  isDarkMode = false;

  private readonly themeChangeHandler = (event: Event): void => {
    const customEvent = event as CustomEvent<{ dark: boolean }>;
    this.isDarkMode = customEvent.detail?.dark ?? document.documentElement.classList.contains('dark-theme');
    this.refreshChartsForTheme();
    this.cdr.detectChanges();
  };

  constructor(
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
    private webSocketService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.isDarkMode = document.documentElement.classList.contains('dark-theme');
    window.addEventListener('dashboard-theme-change', this.themeChangeHandler);
    this.webSocketService.connect();
    this.websocketSubscription = this.webSocketService.events$.subscribe(event => this.handleCommandStatusChanged(event));

    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.rawData = data;
        this.circleOptions = data.circles;
        this.applyData();
        this.dataLoaded = true;
        this.loading = false;
        this.cdr.detectChanges();
        this.tryRenderCharts();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.tryRenderCharts();
  }

  ngOnDestroy(): void {
    window.removeEventListener('dashboard-theme-change', this.themeChangeHandler);
    this.websocketSubscription?.unsubscribe();
    this.webSocketService.disconnect();
    this.nodeAvailabilityChart?.destroy();
    this.commandStatusChart?.destroy();
    this.commandsPerNodeChart?.destroy();
  }

  onExecCircleChange(): void {
    this.applyExecutionHistory();
    this.cdr.detectChanges();
  }

  onNodeAvailCircleChange(): void {
    this.applyNodeAvailability();
    this.updateNodeAvailabilityChart();
  }

  onCommandStatusCircleChange(): void {
    this.applyCommandStatus();
    this.updateCommandStatusChart();
  }

  onCommandsPerNodeCircleChange(): void {
    this.applyCommandsPerNode();
    this.updateCommandsPerNodeChart();
  }

  private handleCommandStatusChanged(event: DashboardSocketEvent): void {
    if ((event.type || event.event) !== 'COMMAND_STATUS_CHANGED' || !event.status || !this.rawData) return;

    const match = this.rawData.executionHistory.find(e =>
      e.executionId === event.executionId ||
      e.nodeId === event.nodeId ||
      e.nodeId === event.commandId
    );

    if (!match) return;

    match.status = event.status;
    this.applyExecutionHistory();

    if (event.stats) {
      const totalNodes = this.rawData.circles.reduce((sum, c) => sum + c.totalNodes, 0);
      this.stats = [
        { icon: 'device_hub', label: 'Total Nodes', value: totalNodes.toLocaleString(), iconBg: '#e6ecff', iconColor: '#3d5be0' },
        { icon: 'terminal', label: 'Command Executed', value: String(event.stats.commandExecuted), iconBg: '#e6ecff', iconColor: '#3d5be0' },
        { icon: 'cancel', label: 'Total Failed', value: String(event.stats.totalFailed), iconBg: '#fde8e8', iconColor: '#e0433d' },
        { icon: 'trending_up', label: 'Success Rate', value: `${event.stats.successRate}%`, subLabel: '(Using Top Circles)', iconBg: '#e3f7f1', iconColor: '#12a37f' }
      ];
    } else {
      this.applyStats();
    }

    this.cdr.detectChanges();
  }

  private refreshChartsForTheme(): void {
    if (!this.dataLoaded || !this.viewInitialized) return;

    this.nodeAvailabilityChart?.destroy();
    this.commandStatusChart?.destroy();
    this.commandsPerNodeChart?.destroy();

    this.renderNodeAvailabilityChart();
    this.renderCommandStatusChart();
    this.renderCommandsPerNodeChart();
  }

  private applyData(): void {
    if (!this.rawData) return;

    this.applyStats();
    this.applyExecutionHistory();
    this.applyNodeAvailability();
    this.applyCommandStatus();
    this.applyCommandsPerNode();
  }

  private applyStats(): void {
    const data = this.rawData!;
    const totalNodes = data.circles.reduce((sum, c) => sum + c.totalNodes, 0);
    const commandExecuted = data.executionHistory.length;
    const totalFailed = data.executionHistory.filter(e => e.status === 'FAILED').length;
    const totalSuccess = data.executionHistory.filter(e => e.status === 'SUCCESS').length;
    const successRate = commandExecuted > 0 ? Math.round((totalSuccess / commandExecuted) * 100) : 0;

    this.stats = [
      { icon: 'device_hub', label: 'Total Nodes', value: totalNodes.toLocaleString(), iconBg: '#e6ecff', iconColor: '#3d5be0' },
      { icon: 'terminal', label: 'Command Executed', value: String(commandExecuted), iconBg: '#e6ecff', iconColor: '#3d5be0' },
      { icon: 'cancel', label: 'Total Failed', value: String(totalFailed), iconBg: '#fde8e8', iconColor: '#e0433d' },
      {
        icon: 'trending_up',
        label: 'Success Rate',
        value: `${successRate}%`,
        subLabel: '(Using Top Circles)',
        iconBg: '#e3f7f1',
        iconColor: '#12a37f'
      }
    ];
  }

  private applyExecutionHistory(): void {
    const data = this.rawData!;
    const filtered = this.selectedExecCircle === ALL_CIRCLES
      ? data.executionHistory
      : data.executionHistory.filter(e => e.circle === this.selectedExecCircle);

    this.executionHistory = filtered.map(e => this.mapExecutionRow(e));
  }

  private applyNodeAvailability(): void {
    const data = this.rawData!;
    const filtered = this.selectedNodeAvailCircle === ALL_CIRCLES
      ? data.circles
      : data.circles.filter(c => c.circleCode === this.selectedNodeAvailCircle);

    this.nodeAvailabilityLabels = filtered.map(c => c.circleCode);
    this.nodeAvailabilityUp = filtered.map(c => c.upNodes);
    this.nodeAvailabilityDown = filtered.map(c => {
      const visualDown = Math.max(c.downNodes, Math.round(c.upNodes * 0.55));
      return [c.upNodes, c.upNodes + visualDown];
    });
  }

  private applyCommandStatus(): void {
    this.commandStatus = [
      { label: 'Live', value: 1562, color: '#2f8f16' },
      { label: 'Alarm', value: 470, color: '#e58a00' },
      { label: 'Down', value: 360, color: '#c9233f' },
      { label: 'Unknown', value: 300, color: '#8f83b5' }
    ];
    this.commandStatusTotal = 1562;
  }

  private applyCommandsPerNode(): void {
    const data = this.rawData!;

    const selectedCircle = this.selectedCommandsPerNodeCircle;
    const source = selectedCircle === ALL_CIRCLES
      ? data.commandsPerNode
      : data.commandsPerNode.filter((n: any) =>
          n.circle === selectedCircle ||
          n.circleCode === selectedCircle ||
          n.circle_code === selectedCircle
        );
    const nodes = selectedCircle !== ALL_CIRCLES && source.length === 0
      ? data.commandsPerNode
      : source;

    this.commandsPerNodeLabels = nodes.map((n: any) => n.nodeLabel);
    this.commandsPerNodeFailed = nodes.map((n: any) => n.failed);
    this.commandsPerNodeSuccess = nodes.map((n: any) => n.success);
  }

  private mapExecutionRow(e: ExecutionHistoryItem): ExecutionRow {
    const statusMap: Record<ExecutionHistoryItem['status'], ExecutionRow['status']> = {
      FAILED: 'Failed',
      RUNNING: 'Running',
      SUCCESS: 'Success'
    };

    const date = new Date(e.scheduledAt);
    const timestamp = isNaN(date.getTime())
      ? e.scheduledAt
      : `${date.toLocaleDateString('en-GB')} ; ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

    return {
      id: e.nodeId,
      subId: e.nodeName,
      action: e.scheduleName,
      timestamp,
      status: statusMap[e.status],
      circle: e.circle
    };
  }

  private titleCase(value: string): string {
    return value.charAt(0) + value.slice(1).toLowerCase();
  }

  private tryRenderCharts(): void {
    if (!this.dataLoaded || !this.viewInitialized) return;

    this.renderNodeAvailabilityChart();
    this.renderCommandStatusChart();
    this.renderCommandsPerNodeChart();

    setTimeout(() => {
      this.nodeAvailabilityChart?.resize();
      this.commandStatusChart?.resize();
      this.commandsPerNodeChart?.resize();
    }, 0);
  }

  private renderNodeAvailabilityChart(): void {
    this.nodeAvailabilityChart = new Chart<'bar'>(this.nodeAvailabilityCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: this.nodeAvailabilityLabels,
        datasets: [
          {
            label: 'Up',
            data: this.nodeAvailabilityUp,
            backgroundColor: '#3f7f31',
            borderRadius: 5,
            maxBarThickness: 9,
            categoryPercentage: 0.44,
            barPercentage: 0.9,
            grouped: false,
            stack: undefined
          },
          {
            label: 'Down',
            data: this.nodeAvailabilityDown,
            backgroundColor: '#c9382e',
            borderRadius: 5,
            maxBarThickness: 9,
            categoryPercentage: 0.44,
            barPercentage: 0.9,
            grouped: false,
            stack: undefined
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            stacked: false,
            grid: { display: false },
            border: { color: this.isDarkMode ? '#465269' : '#dfe4ec' },
            ticks: { color: this.isDarkMode ? '#aeb8cc' : '#6f7785', font: { size: 10 }, autoSkip: false, maxRotation: 0, padding: 7 },
            title: { display: true, text: 'Circles', color: this.isDarkMode ? '#aeb8cc' : '#737b8a', font: { size: 10 }, padding: { top: 8 } }
          },
          y: {
            stacked: false,
            beginAtZero: true,
            title: { display: true, text: 'Node Count', color: this.isDarkMode ? '#aeb8cc' : '#737b8a', font: { size: 10 } },
            grid: { color: this.isDarkMode ? '#303b50' : '#e9edf3', lineWidth: 1 },
            border: { display: false },
            ticks: { color: this.isDarkMode ? '#aeb8cc' : '#6f7785', font: { size: 10 }, padding: 6 }
          }
        }
      }
    });
  }

  private updateNodeAvailabilityChart(): void {
    if (!this.nodeAvailabilityChart) return;
    this.nodeAvailabilityChart.data.labels = this.nodeAvailabilityLabels;
    this.nodeAvailabilityChart.data.datasets[0].data = this.nodeAvailabilityUp;
    this.nodeAvailabilityChart.data.datasets[1].data = this.nodeAvailabilityDown;
    this.nodeAvailabilityChart.update();
  }

  private updateCommandStatusChart(): void {
    if (!this.commandStatusChart) return;

    this.commandStatusChart.data.labels = this.commandStatus.map(s => s.label);
    this.commandStatusChart.data.datasets[0].data = this.commandStatus.map(s => s.value);
    this.commandStatusChart.data.datasets[0].backgroundColor = this.commandStatus.map(s => s.color);
    this.commandStatusChart.update();
  }

  private updateCommandsPerNodeChart(): void {
    if (!this.commandsPerNodeChart) return;

    this.commandsPerNodeChart.data.labels = this.commandsPerNodeLabels;
    this.commandsPerNodeChart.data.datasets[0].data = this.commandsPerNodeFailed;
    this.commandsPerNodeChart.data.datasets[1].data = this.commandsPerNodeSuccess;
    this.commandsPerNodeChart.update();
  }

  private renderCommandStatusChart(): void {
    const total = this.commandStatusTotal;

    const centerTextPlugin = {
      id: 'centerText',
      afterDraw: (chart: Chart) => {
        const { ctx } = chart;
        const meta = chart.getDatasetMeta(0);
        const firstArc = meta.data?.[0] as any;
        if (!firstArc) return;

        const centerX = firstArc.x;
        const centerY = firstArc.y;
        const innerRadius = firstArc.innerRadius;

        ctx.save();
        ctx.shadowColor = this.isDarkMode ? 'rgba(0, 0, 0, 0.55)' : 'rgba(15, 23, 42, 0.28)';
        ctx.shadowBlur = 9;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;

        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius - 14, 0, Math.PI * 2);
        ctx.fillStyle = this.isDarkMode ? '#202a3b' : '#f2f2ef';
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = '700 20px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
        ctx.fillStyle = this.isDarkMode ? '#f4f7fb' : '#111827';
        ctx.fillText(String(this.commandStatusTotal), centerX, centerY - 10);

        ctx.font = '400 10px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
        ctx.fillStyle = this.isDarkMode ? '#aeb8cc' : '#667085';
        ctx.fillText('Total', centerX, centerY + 8);
        ctx.fillText('Commands', centerX, centerY + 21);

        ctx.restore();
      }
    };

    this.commandStatusChart = new Chart<'doughnut'>(this.commandStatusCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.commandStatus.map(s => s.label),
        datasets: [{
          data: this.commandStatus.map(s => s.value),
          backgroundColor: this.commandStatus.map(s => s.color),
          borderColor: '#ffffff',
          borderWidth: 2,
          spacing: 0,
          hoverOffset: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        events: []
      },
      plugins: [centerTextPlugin]
    });
  }

  private renderCommandsPerNodeChart(): void {
    this.commandsPerNodeChart = new Chart<'line'>(this.commandsPerNodeCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: this.commandsPerNodeLabels,
        datasets: [
          {
            label: 'Failed',
            data: this.commandsPerNodeFailed,
            borderColor: '#d85b63',
            backgroundColor: 'rgba(224, 67, 61, 0.10)',
            fill: true,
            tension: 0.34,
            pointRadius: 0,
            borderWidth: 2.2
          },
          {
            label: 'Success',
            data: this.commandsPerNodeSuccess,
            borderColor: '#6f9f63',
            backgroundColor: 'rgba(18, 163, 127, 0.10)',
            fill: true,
            tension: 0.34,
            pointRadius: 0,
            borderWidth: 2.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            displayColors: true
          }
        },
        layout: { padding: { top: 6, right: 4, bottom: 0, left: 0 } },
        scales: {
          x: {
            grid: { display: false },
            border: { color: this.isDarkMode ? '#465269' : '#dfe4ec' },
            ticks: { color: this.isDarkMode ? '#aeb8cc' : '#6f7785', font: { size: 10 }, maxRotation: 0 },
            title: {
              display: true,
              text: 'Nodes',
              color: this.isDarkMode ? '#aeb8cc' : '#6f7785',
              font: { size: 10, weight: 400 },
              padding: { top: 7 }
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: this.isDarkMode ? '#303b50' : '#e9edf3', lineWidth: 1 },
            border: { display: false },
            ticks: { color: this.isDarkMode ? '#aeb8cc' : '#6f7785', font: { size: 10 }, padding: 6 },
            title: {
              display: true,
              text: 'Count',
              color: this.isDarkMode ? '#aeb8cc' : '#6f7785',
              font: { size: 10, weight: 400 },
              padding: { bottom: 6 }
            }
          }
        }
      }
    });
  }

  toggleCommandsPerNodeDataset(index: number): void {
    if (!this.commandsPerNodeChart) return;

    const clickedIsOnlyVisible = this.commandsPerNodeLegend.every((item, i) =>
      i === index ? !item.hidden : item.hidden
    );
    this.commandsPerNodeLegend.forEach((item, i) => {
      item.hidden = clickedIsOnlyVisible ? false : i !== index;

      const meta = this.commandsPerNodeChart!.getDatasetMeta(i);
      meta.hidden = item.hidden;
    });

    this.commandsPerNodeChart.update('active');
  }
}