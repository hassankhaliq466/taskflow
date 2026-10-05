import Link from "next/link";
import { auth } from "@/lib/auth";
import { findInvitationByToken } from "@/models/Invitation";
import { findWorkspaceById } from "@/models/Workspace";
import { InvitationActions } from "@/components/invitation-actions";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await findInvitationByToken(token);

  if (!invitation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
        <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Invitation unavailable</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This invitation is invalid or has expired. Ask the workspace admin to send a new one.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
            Go to sign in
          </Link>
        </section>
      </main>
    );
  }

  const [workspace, session] = await Promise.all([
    findWorkspaceById(invitation.workspaceId.toString()),
    auth(),
  ]);

  if (!workspace) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
        <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Workspace unavailable</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The workspace for this invitation no longer exists.
          </p>
        </section>
      </main>
    );
  }

  const callbackUrl = `/invite/${encodeURIComponent(token)}`;
  const signedInEmail = session?.user?.email ?? null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-primary">TaskFlow workspace invitation</p>
        <h1 className="mt-2 text-2xl font-semibold">Join {workspace.name}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          You were invited as a {invitation.role}. This invitation was sent to{" "}
          <span className="font-medium text-foreground">{invitation.email}</span>.
        </p>

        {signedInEmail ? (
          <InvitationActions
            token={token}
            invitedEmail={invitation.email}
            signedInEmail={signedInEmail}
          />
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Sign in to accept
            </Link>
            <Link
              href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Create an account
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
