import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-json-preview-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isOpen"
         class="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
      <div class="bg-white rounded-lg shadow-xl max-w-4xl max-h-[80vh] w-full mx-4">
        <div class="flex justify-between items-center p-4 border-b">
          <h3 class="text-lg font-medium">{{ title }}</h3>
          <button
            (click)="close.emit()"
            class="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <div class="p-4 overflow-auto max-h-[60vh]">
          <pre class="overflow-auto p-4 text-xs bg-gray-50 rounded-md border">{{ formattedJson }}</pre>
        </div>
        <div class="flex justify-end p-4 border-t">
          <button
            (click)="close.emit()"
            class="px-4 py-2 text-white bg-gray-600 rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  `
})
export class JsonPreviewDialogComponent {
  @Input() isOpen = false;
  @Input() title = 'Generated JSON Preview';
  @Input() set jsonData(value: any) {
    this._jsonData = value;
    this.formattedJson = JSON.stringify(value, null, 2);
  }
  @Output() close = new EventEmitter<void>();

  private _jsonData: any;
  formattedJson = '';
}
