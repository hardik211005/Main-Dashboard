import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { UcemService } from '../ucem.service';

@Component({
  selector: 'app-ne-tree',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './ne-tree.component.html',
  styleUrl: './ne-tree.component.scss'
})
export class NeTreeComponent {
  constructor(public ucem: UcemService) {}

  statusClass(status: string): string {
    return 'dot dot-' + status;
  }
}
