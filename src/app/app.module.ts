import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
// import { MaterialModule } from './material.module';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, NgxDaterangepickerMd.forRoot()],
  providers: [],
  bootstrap: [AppComponent],
  exports: []
})
export class AppModule {}
