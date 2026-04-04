import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/db/models/User";

export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    // If SELF_HOSTED mode, always return true (server key is available)
    if (process.env.SELF_HOSTED === "true") {
      return NextResponse.json({ hasApiKey: true });
    }

    await dbConnect();
    const user = await User.findById(authResult.user.id)
      .select("encryptedApiKey")
      .lean();

    const hasApiKey = !!(user?.encryptedApiKey);

    return NextResponse.json({ hasApiKey });
  } catch (error) {
    console.error("[API] GET /api/user/settings/check error:", error);
    return NextResponse.json(
      { error: "Failed to check API key status" },
      { status: 500 }
    );
  }
}
