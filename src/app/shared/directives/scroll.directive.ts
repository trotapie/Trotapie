import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';

@Directive({
  selector: '[customScrollbarThumb]',
  standalone: true
})
export class CustomScrollbarThumbDirective {
  private thumb: HTMLDivElement;

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2
  ) {
    const host = this.el.nativeElement;

    this.thumb = this.renderer.createElement('div');
    this.renderer.addClass(this.thumb, 'custom-scrollbar-thumb');
    this.renderer.appendChild(host, this.thumb);

    this.updateThumb();
  }

  @HostListener('scroll')
  onScroll() {
    this.updateThumb();
  }

  @HostListener('window:resize')
  onResize() {
    this.updateThumb();
  }

  private updateThumb() {
    const host = this.el.nativeElement;
    const { scrollTop, scrollHeight, clientHeight } = host;

    if (scrollHeight <= clientHeight) {
      this.renderer.setStyle(this.thumb, 'display', 'none');
      return;
    }

    this.renderer.setStyle(this.thumb, 'display', 'block');

    const ratio = clientHeight / scrollHeight;
    const thumbHeight = Math.max(clientHeight * ratio, 24); // mínimo 24px

    const maxTop = clientHeight - thumbHeight;
    const top = (scrollTop / (scrollHeight - clientHeight)) * maxTop;

    this.renderer.setStyle(this.thumb, 'height', `${thumbHeight}px`);
    this.renderer.setStyle(this.thumb, 'top', `${top}px`);
  }
}