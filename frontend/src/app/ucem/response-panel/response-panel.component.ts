import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { UcemService } from '../ucem.service';

@Component({
  selector: 'app-response-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './response-panel.component.html',
  styleUrl: './response-panel.component.scss'
})
export class ResponsePanelComponent {
  constructor(public ucem: UcemService) {}

  resultClass(result: string): string {
    return 'result result-' + result.toLowerCase();
  }

  @HostListener('document:click')
  onDocClick(): void {
    if (this.ucem.responseMenuOpen()) this.ucem.closeResponseMenu();
  }
}
