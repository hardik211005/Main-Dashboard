import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { UcemService } from '../ucem.service';
import { SelectComponent } from '../shared/select.component';

@Component({
  selector: 'app-command-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, SelectComponent],
  templateUrl: './command-builder.component.html',
  styleUrl: './command-builder.component.scss'
})
export class CommandBuilderComponent {
  constructor(public ucem: UcemService) {}

  readonly commandOptions = computed(() => this.ucem.commandsForCategory().map(c => c.id));

  onNumberChange(key: string, value: string | number): void {
    const num = Number(value);
    this.ucem.updateParam(key, Number.isNaN(num) ? 0 : num);
  }

  onCategoryChange(value: string | number): void {
    this.ucem.setCategory(String(value));
  }

  onCommandChange(value: string | number): void {
    this.ucem.setCommand(String(value));
  }
}
