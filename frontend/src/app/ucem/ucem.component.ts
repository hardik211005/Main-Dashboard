import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

import { UcemService } from './ucem.service';
import { NeTreeComponent } from './ne-tree/ne-tree.component';
import { CommandBuilderComponent } from './command-builder/command-builder.component';
import { ResponsePanelComponent } from './response-panel/response-panel.component';
import { NodeInfoPopoverComponent } from './node-info-popover/node-info-popover.component';
import { NeFilterDialogComponent } from './ne-filter-dialog/ne-filter-dialog.component';

type MobilePanel = 'list' | 'builder' | 'response';

@Component({
  selector: 'app-ucem',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    NeTreeComponent,
    CommandBuilderComponent,
    ResponsePanelComponent,
    NodeInfoPopoverComponent,
    NeFilterDialogComponent
  ],
  templateUrl: './ucem.component.html',
  styleUrl: './ucem.component.scss'
})
export class UcemComponent {
  readonly activeTab = signal<'CLI' | 'Batch'>('CLI');
  readonly mobilePanel = signal<MobilePanel>('list');

  constructor(public ucem: UcemService) {}
}
