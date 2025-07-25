import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { HttpClientJsonpModule, HttpClientModule } from '@angular/common/http';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
// import { MaterialModule } from './material.module';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule,HttpClientModule,
    HttpClientJsonpModule, NgxDaterangepickerMd.forRoot()],
  providers: [],
  bootstrap: [AppComponent],
  exports: []
})
export class AppModule {}
