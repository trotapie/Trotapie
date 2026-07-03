import { animate, style, transition, trigger } from '@angular/animations';

const easingOut = 'cubic-bezier(0.16, 1, 0.3, 1)';
const easingIn = 'cubic-bezier(0.7, 0, 0.84, 0)';

export const modalScaleFade = trigger('modalScaleFade', [
    transition(':enter', [
        style({
            opacity: 0,
            transform: 'translate3d(0, 12px, 0) scale(0.96)',
        }),
        animate(`320ms ${easingOut}`, style({
            opacity: 1,
            transform: 'translate3d(0, 0, 0) scale(1)',
        })),
    ]),
    transition(':leave', [
        style({
            opacity: 1,
            transform: 'translate3d(0, 0, 0) scale(1)',
        }),
        animate(`220ms ${easingIn}`, style({
            opacity: 0,
            transform: 'translate3d(0, 8px, 0) scale(0.98)',
        })),
    ]),
]);
