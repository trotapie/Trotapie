import { Component, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-admin',
  imports: [],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnDestroy {


  ngOnDestroy(): void {
    let lang = localStorage.getItem('lang');
    localStorage.clear()
    localStorage.setItem('lang', lang);
    window.location.reload();
  }
}
