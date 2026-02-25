import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingState } from '../types';

@Component({
  selector: 'app-loading-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="loadingState.isLoading"
         class="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
      <div class="bg-white rounded-lg shadow-xl p-6 mx-4 min-w-[300px]">
        <div class="flex items-center space-x-3">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <div>
            <h3 class="text-lg font-medium text-gray-900">Loading...</h3>
            <p *ngIf="loadingState.message" class="text-sm text-gray-600">
              {{ loadingState.message }}
            </p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoadingIndicatorComponent {
  @Input() loadingState!: LoadingState;
}
