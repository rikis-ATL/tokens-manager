import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/db/models/User";
import TokenCollection from "@/lib/db/models/TokenCollection";
import { aiService } from "@/services/ai";
import { getToolDefinitions, executeToolCall } from "@/services/ai/tools";
import type { Message, ToolDefinition, ToolExecutor } from "@/services/ai/provider.interface";

// ---------------------------------------------------------------------------
// System prompt builder — injects full collection context into each turn
// ---------------------------------------------------------------------------

function collectGroupPaths(
  obj: Record<string, unknown>,
  prefix = ""
): string[] {
  const paths: string[] = [];
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$")) continue;
    const value = obj[key];
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const hasValue = "$value" in (value as Record<string, unknown>);
      if (!hasValue) {
        const currentPath = prefix ? `${prefix}.${key}` : key;
        paths.push(currentPath);
        paths.push(
          ...collectGroupPaths(value as Record<string, unknown>, currentPath)
        );
      }
    }
  }
  return paths;
}

function buildCollectionContext(
  collection: Record<string, unknown>,
  themeId?: string | null
): string {
  const themes = (collection.themes as Array<Record<string, unknown>>) ?? [];
  let tokens: unknown = (collection.tokens as Record<string, unknown>) ?? {};
  let tokenLabel = "Full token data (W3C Design Token format)";
  let activeTheme: Record<string, unknown> | undefined;

  if (themeId && themeId !== "__default__") {
    activeTheme = themes.find((t) => (t.id as string) === themeId);
    if (activeTheme?.tokens) {
      tokens = activeTheme.tokens;
      tokenLabel = `Theme token data (TokenGroup[] format for theme "${activeTheme.name as string}")`;
    }
  }

  let groupPaths: string[];
  if (Array.isArray(tokens)) {
    function flattenGroupIds(groups: Array<Record<string, unknown>>): string[] {
      const ids: string[] = [];
      for (const g of groups) {
        if (g.id) ids.push(String(g.id));
        if (Array.isArray(g.children)) ids.push(...flattenGroupIds(g.children as Array<Record<string, unknown>>));
      }
      return ids;
    }
    groupPaths = flattenGroupIds(tokens as Array<Record<string, unknown>>);
  } else {
    groupPaths = collectGroupPaths(tokens as Record<string, unknown>);
  }

  let context = `You are an AI assistant for the ATUI Tokens Manager design system tool.
You are working with the collection "${collection.name as string}".

## Current Token Structure
The collection contains the following token groups: ${groupPaths.join(", ") || "(empty collection)"}

${tokenLabel}:
\`\`\`json
${JSON.stringify(tokens, null, 2)}
\`\`\`

## Available Tools
You can create, update, and delete tokens and groups using the provided tools.
- Token paths use dot notation: "colors.brand.primary"
- Tokens follow W3C format with $value and $type properties
- Common types: color, dimension, number, string, duration, fontSize, borderRadius

## Rules
- ALWAYS describe what you plan to do BEFORE calling any tool
- For DELETE operations, list what will be deleted and ask "Shall I proceed?" before calling the delete tool
- Use the existing naming conventions visible in the token structure
- When creating tokens, infer the $type from context (e.g., hex values are "color", px/rem values are "dimension")
- If a tool call fails, explain the error in plain language and suggest alternatives

## Read-Only Queries
You can answer read-only questions about the current token state by reading the token data above. No tool call is needed for read-only queries. Examples:
- "Which tokens use #0056D2?" — search the token data for matching values
- "What groups contain color tokens?" — inspect the token structure
- "What is the value of colors.brand.primary?" — look up the specific token

## Naming Suggestions
When a user pastes a list of raw token values (hex colors, spacing values, font sizes, etc.) without explicitly asking to create tokens, respond with suggested canonical names and group structure as formatted text. Do NOT call bulk_create_tokens or create_token immediately. Wait for explicit user confirmation (e.g. "yes, apply it", "go ahead", "create them") before calling any creation tools to apply the suggestions.`;

  // Always list existing themes so the AI can use their IDs directly
  if (themes.length > 0) {
    const themeList = themes
      .map((t) => `- "${t.name as string}" (id: ${t.id as string})`)
      .join("\n");
    context += `\n\n## Existing Themes\n${themeList}`;
  }

  if (activeTheme) {
    context += `\n\n## Active Theme: ${activeTheme.name as string}
Color mode: ${(activeTheme.colorMode as string) || "light"}
You are viewing and editing this theme's token overrides. Tool calls will target this theme.`;
  }

  context += `\n\n## Theme Creation and Editing
When asked to create a theme (e.g. "create a dark theme", "make a high contrast variant"):
1. FIRST check the "Existing Themes" list above — if a theme with that name already exists, use its id directly (do NOT call create_theme again)
2. If it does not exist: call create_theme with the theme name and appropriate colorMode ('dark' for dark themes, 'light' otherwise), then extract the themeId from the response (data.theme.id)
3. Review the existing collection tokens in the token data above to understand the current structure
4. Describe your suggested changes before calling any update_theme_token tools
5. Call update_theme_token for each token you want to customize, passing the correct themeId
The new theme starts as a copy of the collection's default tokens, so you only need to update tokens that should differ.`;

  return context;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { messages, collectionId, themeId } = body as {
      messages: Message[];
      collectionId?: string;
      themeId?: string | null;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required and must not be empty" },
        { status: 400 }
      );
    }

    // SELF_HOSTED check here skips the DB round-trip for user key lookup.
    // AIService.chat() also checks SELF_HOSTED internally to pick the right key source.
    // This is intentional dual-gate design: the route avoids loading User from DB when
    // it's not needed, rather than fetching the key and passing it to a service that
    // would ignore it anyway.
    let userEncryptedKey: string | undefined;
    let userIv: string | undefined;

    if (process.env.SELF_HOSTED !== "true") {
      await dbConnect();
      const user = await User.findById(authResult.user.id)
        .select("encryptedApiKey apiKeyIv")
        .lean();

      userEncryptedKey = user?.encryptedApiKey ?? undefined;
      userIv = user?.apiKeyIv ?? undefined;
    }

    // Build collection context and tools if collectionId is provided
    let systemPrompt: string | undefined;
    let tools: ToolDefinition[] | undefined;
    let toolExecutor: ToolExecutor | undefined;

    if (collectionId) {
      await dbConnect();
      const collection = await TokenCollection.findById(collectionId).lean();
      if (collection) {
        systemPrompt = buildCollectionContext(
          collection as unknown as Record<string, unknown>,
          themeId
        );
        tools = getToolDefinitions() as ToolDefinition[];

        const cookieHeader = request.headers.get("cookie") || "";
        const host = request.headers.get("host") || "localhost:3000";
        const protocol = host.startsWith("localhost") ? "http" : "https";
        const baseUrl = `${protocol}://${host}`;

        toolExecutor = (name: string, input: Record<string, unknown>) =>
          executeToolCall(name, input, {
            collectionId,
            themeId: themeId || null,
            cookieHeader,
            baseUrl,
          });
      }
    }

    const { reply, toolsExecuted } = await aiService.chat(messages, {
      userEncryptedKey,
      userIv,
      systemPrompt,
      tools,
      toolExecutor,
    });

    return NextResponse.json({ reply, toolsExecuted });
  } catch (error) {
    // API key errors → 402
    if (
      error instanceof Error &&
      (error.message.includes("No API key available") ||
        error.message.includes("not configured"))
    ) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 402 }
      );
    }

    console.error("[API] POST /api/ai/chat error:", error);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
