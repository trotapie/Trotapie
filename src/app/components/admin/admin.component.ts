import { Component, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-admin',
  imports: [],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnDestroy{


  ngOnDestroy(): void {
      localStorage.removeItem('accessToken')
  }
}
