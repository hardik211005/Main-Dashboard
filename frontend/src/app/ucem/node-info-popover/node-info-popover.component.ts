import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { UcemService } from '../ucem.service';

@Component({
  selector: 'app-node-info-popover',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './node-info-popover.component.html',
  styleUrl: './node-info-popover.component.scss'
})
export class NodeInfoPopoverComponent {
  constructor(public ucem: UcemService) {}
}
