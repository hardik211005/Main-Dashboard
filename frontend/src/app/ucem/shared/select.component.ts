import { Component, ElementRef, EventEmitter, HostListener, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss'
})
export class SelectComponent {
  @Input() value: string | number | null = null;
  @Input() options: (string | number)[] = [];
  @Input() placeholder = 'Select';
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string | number>();

  readonly open = signal(false);

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  toggle(): void {
    if (this.disabled) return;
    this.open.update(v => !v);
  }

  choose(opt: string | number): void {
    this.valueChange.emit(opt);
    this.open.set(false);
  }

  hasValue(): boolean {
    return this.value !== null && this.value !== undefined && this.value !== '';
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
