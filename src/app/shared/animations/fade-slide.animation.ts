import { trigger, transition, style, animate } from '@angular/animations';

export const fadeSlideIn = trigger('fadeSlideIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(8px)' }),
    animate('320ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
  ])
]);
