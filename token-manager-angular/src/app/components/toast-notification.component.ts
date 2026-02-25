import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastMessage } from '../types';

@Component({
  selector: 'app-toast-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="toast" class="fixed top-4 right-4 z-50">
      <div [ngClass]="{
        'max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5': true,
        'border-l-4 border-green-400': toast.type === 'success',
        'border-l-4 border-red-400': toast.type === 'error',
        'border-l-4 border-blue-400': toast.type === 'info'
      }">
        <div class="p-4">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <div class="w-5 h-5" [ngClass]="{
                'text-green-400': toast.type === 'success',
                'text-red-400': toast.type === 'error',
                'text-blue-400': toast.type === 'info'
              }">
                <span *ngIf="toast.type === 'success'">✓</span>
                <span *ngIf="toast.type === 'error'">✕</span>
                <span *ngIf="toast.type === 'info'">ℹ</span>
              </div>
            </div>
            <div class="ml-3 w-0 flex-1">
              <p class="text-sm font-medium text-gray-900">
                {{ toast.message }}
              </p>
            </div>
            <div class="ml-4 flex-shrink-0 flex">
              <button
                class="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-600 focus:outline-none"
                (click)="close.emit()"
              >
                <span class="text-sm">✕</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ToastNotificationComponent {
  @Input() toast: ToastMessage | null = null;
  @Output() close = new EventEmitter<void>();
}
