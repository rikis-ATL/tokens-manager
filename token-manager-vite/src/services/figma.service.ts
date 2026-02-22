import { TokenGroup } from '../types/token.types';

export interface FigmaVariable {
  id: string;
  name: string;
  key: string;
  variableCollectionId: string;
  resolvedType: 'BOOLEAN' | 'FLOAT' | 'STRING' | 'COLOR';
  description?: string;
  valuesByMode: Record<string, any>;
}

export interface FigmaVariableCollection {
  id: string;
  name: string;
  key: string;
  modes: Array<{
    modeId: string;
    name: string;
  }>;
  defaultModeId: string;
  remote: boolean;
  hiddenFromPublishing: boolean;
  variableIds: string[];
}

export interface FigmaApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export class FigmaService {
  private readonly baseUrl = 'https://api.figma.com/v1';

  private async handleApiResponse<T>(response: Response): Promise<FigmaApiResponse<T>> {
    if (!response.ok) {
      let errorMessage = `Figma API error: ${response.status} ${response.statusText}`;

      try {
        const errorData = await response.json();
        if (errorData.message || errorData.err) {
          errorMessage = `${errorMessage} - ${errorData.message || errorData.err}`;
        }
      } catch {
        // If we can't parse error JSON, use the default message
      }

      return {
        success: false,
        error: errorMessage,
        status: response.status
      };
    }

    try {
      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse response JSON'
      };
    }
  }

  async getFileVariables(figmaToken: string, fileKey: string): Promise<{
    variables: Record<string, FigmaVariable>;
    variableCollections: Record<string, FigmaVariableCollection>;
  }> {
    const response = await fetch(`${this.baseUrl}/files/${fileKey}/variables/local`, {
      headers: {
        'X-Figma-Token': figmaToken,
        'Content-Type': 'application/json',
      },
    });

    const result = await this.handleApiResponse<{
      meta: {
        variables: Record<string, FigmaVariable>;
        variableCollections: Record<string, FigmaVariableCollection>;
      };
    }>(response);

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch Figma variables');
    }

    return {
      variables: result.data?.meta.variables || {},
      variableCollections: result.data?.meta.variableCollections || {}
    };
  }

  async publishVariables(
    figmaToken: string,
    fileKey: string,
    variableIds: string[]
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/files/${fileKey}/variables/publish`, {
      method: 'POST',
      headers: {
        'X-Figma-Token': figmaToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variable_ids: variableIds
      }),
    });

    const result = await this.handleApiResponse<any>(response);
    if (!result.success) {
      throw new Error(result.error || 'Failed to publish Figma variables');
    }
  }

  async createVariableCollection(
    figmaToken: string,
    fileKey: string,
    name: string,
    modes: string[] = ['Mode 1']
  ): Promise<FigmaVariableCollection> {
    const response = await fetch(`${this.baseUrl}/files/${fileKey}/variable_collections`, {
      method: 'POST',
      headers: {
        'X-Figma-Token': figmaToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'CREATE',
        name,
        initial_mode_name: modes[0] || 'Mode 1'
      }),
    });

    const result = await this.handleApiResponse<{
      meta: { variableCollections: Record<string, FigmaVariableCollection> };
    }>(response);

    if (!result.success) {
      throw new Error(result.error || 'Failed to create variable collection');
    }

    const collections = result.data?.meta.variableCollections || {};
    const collectionId = Object.keys(collections)[0];
    if (!collectionId) {
      throw new Error('No collection created');
    }

    return collections[collectionId];
  }

  async createVariable(
    figmaToken: string,
    fileKey: string,
    name: string,
    variableCollectionId: string,
    resolvedType: 'BOOLEAN' | 'FLOAT' | 'STRING' | 'COLOR',
    values: Record<string, any>,
    description?: string
  ): Promise<FigmaVariable> {
    const response = await fetch(`${this.baseUrl}/files/${fileKey}/variables`, {
      method: 'POST',
      headers: {
        'X-Figma-Token': figmaToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'CREATE',
        name,
        variable_collection_id: variableCollectionId,
        resolved_type: resolvedType,
        values,
        description
      }),
    });

    const result = await this.handleApiResponse<{
      meta: { variables: Record<string, FigmaVariable> };
    }>(response);

    if (!result.success) {
      throw new Error(result.error || 'Failed to create variable');
    }

    const variables = result.data?.meta.variables || {};
    const variableId = Object.keys(variables)[0];
    if (!variableId) {
      throw new Error('No variable created');
    }

    return variables[variableId];
  }

  async updateVariable(
    figmaToken: string,
    fileKey: string,
    variableId: string,
    updates: {
      name?: string;
      description?: string;
      values?: Record<string, any>;
    }
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/files/${fileKey}/variables`, {
      method: 'POST',
      headers: {
        'X-Figma-Token': figmaToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'UPDATE',
        id: variableId,
        ...updates
      }),
    });

    const result = await this.handleApiResponse<any>(response);
    if (!result.success) {
      throw new Error(result.error || 'Failed to update variable');
    }
  }

  convertTokensToFigmaVariables(
    tokenGroups: TokenGroup[],
    modeId: string = 'defaultMode'
  ): Array<{
    name: string;
    resolvedType: 'BOOLEAN' | 'FLOAT' | 'STRING' | 'COLOR';
    values: Record<string, any>;
    description?: string;
  }> {
    const figmaVariables: Array<{
      name: string;
      resolvedType: 'BOOLEAN' | 'FLOAT' | 'STRING' | 'COLOR';
      values: Record<string, any>;
      description?: string;
    }> = [];

    const processGroup = (group: TokenGroup, prefix: string = '') => {
      const groupPrefix = prefix ? `${prefix}/${group.name}` : group.name;

      // Process tokens in this group
      group.tokens.forEach(token => {
        const variableName = `${groupPrefix}/${token.path}`;
        let resolvedType: 'BOOLEAN' | 'FLOAT' | 'STRING' | 'COLOR';
        let figmaValue: any = token.value;

        // Map token types to Figma variable types
        switch (token.type) {
          case 'color':
            resolvedType = 'COLOR';
            figmaValue = this.convertColorValue(token.value);
            break;
          case 'number':
          case 'opacity':
          case 'fontWeight':
            resolvedType = 'FLOAT';
            figmaValue = parseFloat(token.value) || 0;
            break;
          case 'dimension':
          case 'fontSize':
          case 'lineHeight':
          case 'letterSpacing':
          case 'borderRadius':
          case 'borderWidth':
            resolvedType = 'FLOAT';
            // Extract numeric value from dimension strings like "16px"
            const numericValue = parseFloat(token.value.toString().replace(/[^\d.-]/g, ''));
            figmaValue = isNaN(numericValue) ? 0 : numericValue;
            break;
          default:
            resolvedType = 'STRING';
            figmaValue = token.value.toString();
        }

        figmaVariables.push({
          name: variableName,
          resolvedType,
          values: {
            [modeId]: figmaValue
          },
          description: token.description
        });
      });

      // Process child groups
      if (group.children) {
        group.children.forEach(child => processGroup(child, groupPrefix));
      }
    };

    tokenGroups.forEach(group => processGroup(group));
    return figmaVariables;
  }

  private convertColorValue(value: any): { r: number; g: number; b: number; a: number } {
    if (typeof value === 'string') {
      // Handle hex colors
      if (value.startsWith('#')) {
        const hex = value.slice(1);
        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;
        const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
        return { r, g, b, a };
      }

      // Handle rgb/rgba colors
      const rgbMatch = value.match(/rgba?\(([^)]+)\)/);
      if (rgbMatch) {
        const values = rgbMatch[1].split(',').map(v => parseFloat(v.trim()));
        return {
          r: (values[0] || 0) / 255,
          g: (values[1] || 0) / 255,
          b: (values[2] || 0) / 255,
          a: values[3] !== undefined ? values[3] : 1
        };
      }
    }

    // Default to black if conversion fails
    return { r: 0, g: 0, b: 0, a: 1 };
  }

  async exportTokensToFigma(
    figmaToken: string,
    fileKey: string,
    tokenGroups: TokenGroup[],
    collectionName: string = 'Design Tokens'
  ): Promise<{
    collection: FigmaVariableCollection;
    variables: FigmaVariable[];
  }> {
    try {
      // Create a new variable collection
      const collection = await this.createVariableCollection(
        figmaToken,
        fileKey,
        collectionName
      );

      const modeId = collection.defaultModeId;

      // Convert tokens to Figma format
      const figmaVariables = this.convertTokensToFigmaVariables(tokenGroups, modeId);

      // Create variables in Figma
      const createdVariables: FigmaVariable[] = [];

      for (const variable of figmaVariables) {
        try {
          const createdVariable = await this.createVariable(
            figmaToken,
            fileKey,
            variable.name,
            collection.id,
            variable.resolvedType,
            variable.values,
            variable.description
          );
          createdVariables.push(createdVariable);
        } catch (error) {
          console.error(`Failed to create variable ${variable.name}:`, error);
          // Continue with other variables even if one fails
        }
      }

      return {
        collection,
        variables: createdVariables
      };
    } catch (error) {
      throw new Error(`Failed to export tokens to Figma: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  validateToken(token: string): boolean {
    // Basic Figma token validation - should start with 'figd_' for dev tokens
    // or be a valid personal access token format
    return token.length > 10 && (token.startsWith('figd_') || token.includes('-'));
  }

  validateFileKey(fileKey: string): boolean {
    // Figma file keys are alphanumeric strings
    return /^[a-zA-Z0-9]+$/.test(fileKey) && fileKey.length > 10;
  }
}