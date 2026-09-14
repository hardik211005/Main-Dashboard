import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { UcemService } from '../ucem.service';

@Component({
  selector: 'app-favourites-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './favourites-dialog.component.html',
  styleUrl: './favourites-dialog.component.scss'
})
export class FavouritesDialogComponent {
  constructor(public ucem: UcemService) {}

  select(id: string): void {
    this.ucem.selectNe(id);
    this.ucem.closeFavouritesDialog();
  }
}
