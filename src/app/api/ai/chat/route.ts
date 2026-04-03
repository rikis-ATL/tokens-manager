import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/db/models/User";
import { aiService } from "@/services/ai";
import type { Message } from "@/services/ai/provider.interface";

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { messages } = body as { messages: Message[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required and must not be empty" },
        { status: 400 }
      );
    }

    // SELF_HOSTED check here skips the DB round-trip entirely.
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

    const reply = await aiService.chat(messages, {
      userEncryptedKey,
      userIv,
    });

    return NextResponse.json({ reply });
  } catch (error) {
    // "No API key available" error from AIService → 402
    if (error instanceof Error && error.message.includes("No API key available")) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 402 }
      );
    }

    console.error("[API] POST /api/ai/chat error:", error);
    return NextResponse.json(
      { error: "AI request failed" },
      { status: 500 }
    );
  }
}
