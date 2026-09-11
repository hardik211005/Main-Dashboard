import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { UcemService, PARENT_EMS_OPTIONS } from '../ucem.service';

@Component({
  selector: 'app-ne-filter-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './ne-filter-dialog.component.html',
  styleUrl: './ne-filter-dialog.component.scss'
})
export class NeFilterDialogComponent {
  readonly emsOptions = PARENT_EMS_OPTIONS;
  readonly tabs = ['Parent EMS', 'Core Type', 'Node Type', 'HW Type', 'SW Version', 'Status', 'Global Search'];
  readonly activeTab = signal('Parent EMS');
  readonly setAsDefault = signal(false);

  constructor(public ucem: UcemService) {}

  get allSelected(): boolean {
    return this.emsOptions.every(name => this.ucem.selectedParentEms().has(name));
  }

  apply(): void {
    this.ucem.closeFilterDialog();
  }
}
