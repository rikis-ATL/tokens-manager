/**
 * ATUI Tokens Manager — MCP Generator Tools
 *
 * This module registers 2 MCP tools for generating design token scales
 * using the existing token generator algorithms from src/lib/tokenGenerators.ts.
 *
 * Tools let AI assistants generate color scales and dimension scales on behalf
 * of the user. Results are returned as previews and optionally saved to a collection.
 *
 * stdout is the JSON-RPC channel — NEVER use console.log here.
 * Use console.error for any debug output (goes to stderr / MCP client logs).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  previewGeneratedTokens,
  defaultColorConfig,
  defaultDimensionConfig,
} from "@/lib/tokenGenerators";
import type { GeneratorConfig } from "@/types/generator.types";
import TokenCollection from "@/lib/db/models/TokenCollection";

// ---------------------------------------------------------------------------
// Exported registration function
// ---------------------------------------------------------------------------

export function registerGeneratorTools(server: McpServer): void {
  /**
   * TOOL: generate_color_scale
   *
   * Generates a stepped color scale using the existing color generation algorithm.
   * The caller provides a base hue and optional overrides for saturation, steps,
   * format, naming pattern, and channel. If collectionId + groupPath are also
   * provided, the generated tokens are saved to the collection immediately.
   *
   * Returns the preview array (name + value pairs) and a save confirmation
   * if the tokens were persisted.
   */
  server.registerTool(
    "generate_color_scale",
    {
      description:
        "Generate a stepped color scale using the built-in color generation algorithm. " +
        "Provide a base hue (0-360) and optionally saturation, steps, output format, " +
        "naming pattern, and which channel to vary. " +
        "If collectionId and groupPath are also provided, the generated tokens are saved to the collection. " +
        "Returns the preview array of {name, value} token pairs.",
      inputSchema: z.object({
        baseHue: z.number().describe("Base hue 0-360"),
        baseSaturation: z
          .number()
          .optional()
          .describe("Base saturation 0-100, default 80"),
        steps: z.number().optional().describe("Number of steps, default 10"),
        format: z
          .enum(["hsl", "hex", "rgb", "oklch"])
          .optional()
          .describe("Output format, default hex"),
        naming: z
          .enum(["step-100", "step-50", "step-10", "step-1", "tshirt"])
          .optional()
          .describe("Naming pattern, default step-100"),
        channel: z
          .enum(["lightness", "saturation", "hue"])
          .optional()
          .describe("Channel to vary, default lightness"),
        collectionId: z
          .string()
          .optional()
          .describe("If provided with groupPath, saves tokens to collection"),
        groupPath: z
          .string()
          .optional()
          .describe("Group path to save generated tokens under"),
      }),
    },
    async ({
      baseHue,
      baseSaturation,
      steps,
      format,
      naming,
      channel,
      collectionId,
      groupPath,
    }) => {
      try {
        const colorCfg = defaultColorConfig();
        colorCfg.baseHue = baseHue;
        if (baseSaturation !== undefined) colorCfg.baseSaturation = baseSaturation;
        if (format !== undefined) colorCfg.format = format;
        if (channel !== undefined) colorCfg.channel = channel;

        const count = steps ?? 10;

        const config: GeneratorConfig = {
          id: "mcp-color-gen",
          groupId: groupPath ?? "mcp",
          label: "MCP Color Scale",
          type: "color",
          count,
          naming: naming ?? "step-100",
          config: colorCfg,
        };

        const previews = previewGeneratedTokens(config);

        let saveResult: string | null = null;

        if (collectionId && groupPath) {
          const setFields: Record<string, string> = {};
          for (const p of previews) {
            setFields[`tokens.${groupPath}.${p.name}.$value`] = p.value;
            setFields[`tokens.${groupPath}.${p.name}.$type`] = "color";
          }

          const result = await TokenCollection.findByIdAndUpdate(
            collectionId,
            { $set: setFields },
            { new: true }
          );

          saveResult = result
            ? `Saved ${previews.length} tokens to '${groupPath}' in collection`
            : `Warning: collection ${collectionId} not found — tokens not saved`;
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  count: previews.length,
                  tokens: previews,
                  ...(saveResult ? { saved: saveResult } : {}),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err) {
        console.error("[MCP] generate_color_scale error:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error generating color scale: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  /**
   * TOOL: generate_dimension_scale
   *
   * Generates a stepped dimension scale using the existing dimension generation
   * algorithm. The caller can specify base value, min/max, steps, format, scale
   * type, naming pattern, and modular ratio. If collectionId + groupPath are
   * provided, the generated tokens are saved to the collection.
   *
   * Returns the preview array (name + value pairs) and a save confirmation
   * if the tokens were persisted.
   */
  server.registerTool(
    "generate_dimension_scale",
    {
      description:
        "Generate a stepped dimension scale (spacing, font sizes, etc.) using the built-in dimension algorithm. " +
        "Supports linear, harmonic, and modular scales. " +
        "If collectionId and groupPath are provided, the generated tokens are saved to the collection. " +
        "Returns the preview array of {name, value} token pairs.",
      inputSchema: z.object({
        baseValue: z
          .number()
          .optional()
          .describe("Base value, default 1"),
        minValue: z
          .number()
          .optional()
          .describe("Min value, default 0.25"),
        maxValue: z
          .number()
          .optional()
          .describe("Max value, default 4"),
        steps: z.number().optional().describe("Number of steps, default 8"),
        format: z
          .enum(["rem", "px", "em", "%", "unitless"])
          .optional()
          .describe("Output format, default rem"),
        scale: z
          .enum(["linear", "harmonic", "modular"])
          .optional()
          .describe("Scale type, default modular"),
        naming: z
          .enum(["step-100", "step-50", "step-10", "step-1", "tshirt"])
          .optional()
          .describe("Naming pattern, default tshirt"),
        modularRatio: z
          .number()
          .optional()
          .describe("Modular ratio, default 1.25"),
        collectionId: z
          .string()
          .optional()
          .describe("If provided with groupPath, saves tokens to collection"),
        groupPath: z
          .string()
          .optional()
          .describe("Group path to save generated tokens under"),
      }),
    },
    async ({
      baseValue,
      minValue,
      maxValue,
      steps,
      format,
      scale,
      naming,
      modularRatio,
      collectionId,
      groupPath,
    }) => {
      try {
        const dimCfg = defaultDimensionConfig();
        if (baseValue !== undefined) dimCfg.baseValue = baseValue;
        if (minValue !== undefined) dimCfg.minValue = minValue;
        if (maxValue !== undefined) dimCfg.maxValue = maxValue;
        if (format !== undefined) dimCfg.format = format;
        if (scale !== undefined) dimCfg.scale = scale;
        if (modularRatio !== undefined) dimCfg.modularRatio = modularRatio;

        const count = steps ?? 8;

        const config: GeneratorConfig = {
          id: "mcp-dim-gen",
          groupId: groupPath ?? "mcp",
          label: "MCP Dimension Scale",
          type: "dimension",
          count,
          naming: naming ?? "tshirt",
          config: dimCfg,
        };

        const previews = previewGeneratedTokens(config);

        let saveResult: string | null = null;

        if (collectionId && groupPath) {
          const setFields: Record<string, string> = {};
          for (const p of previews) {
            setFields[`tokens.${groupPath}.${p.name}.$value`] = p.value;
            setFields[`tokens.${groupPath}.${p.name}.$type`] = "dimension";
          }

          const result = await TokenCollection.findByIdAndUpdate(
            collectionId,
            { $set: setFields },
            { new: true }
          );

          saveResult = result
            ? `Saved ${previews.length} tokens to '${groupPath}' in collection`
            : `Warning: collection ${collectionId} not found — tokens not saved`;
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  count: previews.length,
                  tokens: previews,
                  ...(saveResult ? { saved: saveResult } : {}),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err) {
        console.error("[MCP] generate_dimension_scale error:", err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error generating dimension scale: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
