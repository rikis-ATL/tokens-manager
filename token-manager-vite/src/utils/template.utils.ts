/**
 * Simple template utility for replacing placeholders in HTML templates
 */

export class TemplateEngine {
  /**
   * Replace placeholders in template with data
   * @param template HTML template string with {{placeholder}} syntax
   * @param data Object with key-value pairs to replace
   * @returns Processed HTML string
   */
  static render(template: string, data: Record<string, string | number>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key]?.toString() || match;
    });
  }

  /**
   * Create an HTML element from template string
   * @param template HTML template string
   * @param data Optional data for placeholder replacement
   * @returns HTMLElement
   */
  static createElement(template: string, data?: Record<string, string | number>): HTMLElement {
    const processedTemplate = data ? this.render(template, data) : template;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = processedTemplate.trim();
    return wrapper.firstElementChild as HTMLElement;
  }

  /**
   * Create multiple HTML elements from template
   * @param template HTML template string
   * @param dataArray Array of data objects for multiple items
   * @returns Array of HTMLElements
   */
  static createElements(template: string, dataArray: Record<string, string | number>[]): HTMLElement[] {
    return dataArray.map(data => this.createElement(template, data));
  }
}