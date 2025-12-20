import { Component, inject } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { SupabaseService } from 'app/core/supabase.service';

@Component({
  selector: 'app-footer',
  imports: [TranslocoModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  private supabase = inject(SupabaseService);
  
  avisoUrl = '';


  get currentYear(): number {
    return new Date().getFullYear();
  }

  abrirAviso() {
    this.avisoUrl = this.supabase.getPublicUrl(
      'Public-docs',
      'aviso-privacidad.pdf'
    );

    window.open(this.avisoUrl, '_blank');
  }
}
