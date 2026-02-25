import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TokenGroup, GeneratedToken } from '../types';

@Component({
  selector: 'app-token-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white shadow-sm rounded-lg border border-gray-200">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-xl font-semibold text-gray-900">Token Groups</h2>
        <p class="mt-1 text-sm text-gray-600">
          {{ getTotalTokenCount() }} token(s) across {{ tokenGroups.length }} group(s)
        </p>
      </div>

      <div class="overflow-x-auto">
        <div *ngFor="let group of tokenGroups" class="border-b border-gray-100 last:border-b-0">
          <div class="px-6 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer"
               (click)="toggleGroup(group.id)">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-medium text-gray-700">
                <span [style.marginLeft.px]="group.level * 20">
                  <span *ngIf="hasChildren(group)">
                    {{ group.expanded ? '▼' : '▶' }}
                  </span>
                  {{ group.name }}
                  <span class="text-xs text-gray-500 ml-2">
                    ({{ group.tokens.length }} token{{ group.tokens.length !== 1 ? 's' : '' }})
                  </span>
                </span>
              </h3>
            </div>
          </div>

          <div *ngIf="group.expanded && group.tokens.length > 0">
            <table class="min-w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token Path
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr *ngFor="let token of group.tokens" class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900 font-mono">
                      {{ token.path }}
                    </div>
                    <div *ngIf="token.description" class="text-xs text-gray-500">
                      {{ token.description }}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                      <div *ngIf="token.type === 'color'"
                           class="w-10 h-10 border border-gray-300 rounded shadow-sm"
                           [style.backgroundColor]="token.value">
                      </div>
                      <span class="text-sm text-gray-900 font-mono">{{ token.value }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {{ token.type }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Render child groups recursively -->
          <div *ngIf="group.expanded && group.children && group.children.length > 0">
            <app-token-table [tokenGroups]="group.children"></app-token-table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class TokenTableComponent {
  @Input() tokenGroups: TokenGroup[] = [];

  private expandedGroups = new Set<string>();

  toggleGroup(groupId: string): void {
    const group = this.findGroup(groupId, this.tokenGroups);
    if (group) {
      group.expanded = !group.expanded;
    }
  }

  hasChildren(group: TokenGroup): boolean {
    return !!group.children && group.children.length > 0;
  }

  getTotalTokenCount(): number {
    return this.countTokens(this.tokenGroups);
  }

  private countTokens(groups: TokenGroup[]): number {
    let count = 0;
    for (const group of groups) {
      count += group.tokens.length;
      if (group.children) {
        count += this.countTokens(group.children);
      }
    }
    return count;
  }

  private findGroup(groupId: string, groups: TokenGroup[]): TokenGroup | null {
    for (const group of groups) {
      if (group.id === groupId) {
        return group;
      }
      if (group.children) {
        const found = this.findGroup(groupId, group.children);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }
}
