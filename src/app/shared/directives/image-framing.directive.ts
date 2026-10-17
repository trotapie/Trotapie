import { AfterViewInit, DestroyRef, Directive, ElementRef, HostListener, NgZone, Renderer2, inject } from '@angular/core';

/** Sizes the complete image before zooming; only the parent clips its overflow. */
@Directive({
  selector: 'img[tpImageFraming]',
  standalone: true
})
export class ImageFramingDirective implements AfterViewInit {
  private readonly element = inject<ElementRef<HTMLImageElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  ngAfterViewInit(): void {
    const frame = this.element.nativeElement.parentElement;
    if (!frame) return;
    this.updateSize();
    if (typeof ResizeObserver === 'undefined') return;
    this.zone.runOutsideAngular(() => {
      const observer = new ResizeObserver(() => this.updateSize());
      observer.observe(frame);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  @HostListener('load')
  updateSize(): void {
    const image = this.element.nativeElement;
    const frame = image.parentElement;
    if (!frame || !image.naturalWidth || !image.naturalHeight || !frame.clientWidth || !frame.clientHeight) return;
    const scale = Math.max(frame.clientWidth / image.naturalWidth, frame.clientHeight / image.naturalHeight);
    this.renderer.setStyle(image, 'width', `${image.naturalWidth * scale}px`);
    this.renderer.setStyle(image, 'height', `${image.naturalHeight * scale}px`);
  }
}
