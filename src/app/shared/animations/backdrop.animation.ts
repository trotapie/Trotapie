import { animate, style, transition, trigger } from '@angular/animations';

const easingOut = 'cubic-bezier(0.16, 1, 0.3, 1)';
const easingIn = 'cubic-bezier(0.7, 0, 0.84, 0)';

export const backdropFade = trigger('backdropFade', [
    transition(':enter', [
        style({ opacity: 0 }),
        animate(`240ms ${easingOut}`, style({ opacity: 1 })),
    ]),
    transition(':leave', [
        animate(`200ms ${easingIn}`, style({ opacity: 0 })),
    ]),
]);
