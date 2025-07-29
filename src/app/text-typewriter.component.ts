import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-text-typewriter',
  templateUrl: './text-typewriter.component.html',
  styleUrls: ['./text-typewriter.component.css']
})
export class TextTypewriterComponent implements OnInit {
  @Input() text: string[] = ['Próximamente', 'Nuevos destinos', '¡Espéralo!'];
  @Input() typingSpeed = 75;
  @Input() pauseDuration = 1500;
  @Input() deletingSpeed = 50;
  @Input() loop = true;
  @Input() showCursor = true;
  @Input() cursorCharacter = '|';

  displayedText = '';
  currentTextIndex = 0;
  currentCharIndex = 0;
  isDeleting = false;

  ngOnInit(): void {
    this.startTyping();
  }

  startTyping(): void {
    const fullText = this.text[this.currentTextIndex];

    if (this.isDeleting) {
      this.displayedText = fullText.substring(0, this.currentCharIndex--);
    } else {
      this.displayedText = fullText.substring(0, this.currentCharIndex++);
    }

    let delay = this.isDeleting ? this.deletingSpeed : this.typingSpeed;

    if (!this.isDeleting && this.currentCharIndex === fullText.length) {
      delay = this.pauseDuration;
      this.isDeleting = true;
    } else if (this.isDeleting && this.currentCharIndex === 0) {
      this.isDeleting = false;
      this.currentTextIndex = (this.currentTextIndex + 1) % this.text.length;
      delay = this.typingSpeed;
    }

    setTimeout(() => this.startTyping(), delay);
  }
}
