import { auth } from "@/lib/auth";
import { findUserByEmail, updateUserProfile } from "@/models/User";

export async function PATCH(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid profile details" }, { status: 400 });
  }

  const { name, email } = body as { name?: unknown; email?: unknown };
  if (typeof name !== "string" || typeof email !== "string") {
    return Response.json(
      { error: "Name and email are required" },
      { status: 400 },
    );
  }

  const trimmedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  if (!trimmedName || trimmedName.length > 100) {
    return Response.json(
      { error: "Name must be between 1 and 100 characters" },
      { status: 400 },
    );
  }
  if (
    normalizedEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    return Response.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  try {
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser && existingUser._id?.toString() !== userId) {
      return Response.json(
        { error: "That email address is already in use" },
        { status: 409 },
      );
    }

    await updateUserProfile(userId, {
      name: trimmedName,
      email: normalizedEmail,
    });

    return Response.json({
      ok: true,
      user: { name: trimmedName, email: normalizedEmail },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return Response.json(
      { error: "Could not update your profile" },
      { status: 500 },
    );
  }
}
