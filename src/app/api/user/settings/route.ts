import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/db/models/User";
import { encrypt } from "@/lib/ai/encryption";

export async function PUT(request: Request) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { apiKey } = body as { apiKey?: string };

    await dbConnect();

    if (!apiKey) {
      // Empty or missing apiKey clears the stored key
      await User.updateOne(
        { _id: authResult.user.id },
        { $unset: { encryptedApiKey: 1, apiKeyIv: 1 } }
      );
      return NextResponse.json({ ok: true });
    }

    // Encrypt and store the key
    const { encrypted, iv } = encrypt(apiKey);
    await User.updateOne(
      { _id: authResult.user.id },
      { $set: { encryptedApiKey: encrypted, apiKeyIv: iv } }
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API] PUT /api/user/settings error:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
