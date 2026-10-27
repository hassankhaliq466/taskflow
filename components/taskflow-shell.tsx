"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Check,
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { startNavigationLoading } from "@/lib/navigation-loading";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Team", href: "/team", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  );
  const setActiveWorkspace = useWorkspaceStore(
    (state) => state.setActiveWorkspace,
  );
  const addWorkspace = useWorkspaceStore((state) => state.addWorkspace);
  const storeHydrated = useWorkspaceStore((state) => state.hydrated);
  const projects = useWorkspaceStore((state) => state.projects);
  const profile = useWorkspaceStore((state) => state.profile);

  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null;

  const currentWorkspaceId = activeWorkspace?.id ?? null;

  // Only show projects belonging to the currently selected workspace.
  const workspaceProjects = currentWorkspaceId
    ? projects.filter(
        (project) => project.workspaceId === currentWorkspaceId,
      )
    : [];

  const hasNoWorkspaces = storeHydrated && workspaces.length === 0;
  const userName =
    profile?.name.trim() ||
    session?.user?.name?.trim() ||
    session?.user?.email?.split("@")[0] ||
    "Account";
  const userEmail = profile?.email || session?.user?.email || "";
  const userInitials = userName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [workspaceCreateError, setWorkspaceCreateError] = useState<string | null>(
    null,
  );

  /* ------------------------------------------------------------------------ */
  /*                         Empty workspace onboarding                       */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (hasNoWorkspaces) {
      // Defer to next tick to avoid synchronous setState in effect
      const timeoutId = setTimeout(() => {
        setIsCreateWorkspaceOpen(true);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [hasNoWorkspaces]);

  useEffect(() => {
    if (!isCreateWorkspaceOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !hasNoWorkspaces) {
        setIsCreateWorkspaceOpen(false);
        setNewWorkspaceName("");
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isCreateWorkspaceOpen, hasNoWorkspaces]);

  const closeCreateWorkspace = () => {
    // A user with zero workspaces must create one before continuing.
    if (hasNoWorkspaces) return;

    setIsCreateWorkspaceOpen(false);
    setNewWorkspaceName("");
  };

  const handleCreateWorkspace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = newWorkspaceName.trim();
    if (!trimmedName) return;

    const workspaceId = await addWorkspace(trimmedName);
    if (!workspaceId) {
      setWorkspaceCreateError(
        useWorkspaceStore.getState().error ??
          "Could not create the workspace. Please try again.",
      );
      return;
    }

    // addWorkspace makes the first workspace active. For subsequent
    // workspaces, explicitly activate the newly created workspace.
    setActiveWorkspace(workspaceId);

    setWorkspaceCreateError(null);
    setNewWorkspaceName("");
    setIsCreateWorkspaceOpen(false);
    setWorkspaceOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col text-foreground lg:flex-row">
      {isMobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 h-full w-full bg-foreground/20 text-left backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 min-h-screen flex-col border-r border-border bg-card px-4 py-5 transition-transform duration-200 ease-in-out lg:static lg:min-h-screen lg:w-64 lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-7 flex items-center justify-between px-2">
          <button
            type="button"
            className="flex w-full items-center gap-3 text-left focus:outline-none"
            onClick={() => setWorkspaceOpen((previous) => !previous)}
            aria-expanded={workspaceOpen}
            aria-haspopup="true"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Check className="size-5" />
            </span>

            <div className="min-w-0 flex-1">
              <span className="block max-w-[130px] truncate text-sm font-semibold">
                {activeWorkspace?.name || "Select Workspace"}
              </span>
              <span className="block text-xs text-muted-foreground">
                {workspaces.length}{" "}
                {workspaces.length === 1 ? "workspace" : "workspaces"}
              </span>
            </div>

            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="size-5" />
          </Button>
        </div>

        {workspaceOpen && (
          <div className="mb-4 space-y-1 rounded-xl border border-border bg-background p-2 shadow-sm">
            <div className="flex items-center justify-between px-2 py-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Workspaces
              </p>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 rounded-md px-2 text-xs"
                onClick={() => setIsCreateWorkspaceOpen(true)}
              >
                <Plus className="size-3.5" />
                New
              </Button>
            </div>

            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm ${
                  workspace.id === currentWorkspaceId
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                onClick={() => {
                  setActiveWorkspace(workspace.id);
                  setWorkspaceOpen(false);
                }}
              >
                <span className="truncate">{workspace.name}</span>

                {workspace.id === currentWorkspaceId && (
                  <Check className="ml-2 size-4 shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isSelected
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.label}</span>

                {item.label === "Projects" && (
                  <Badge
                    variant="secondary"
                    className="ml-auto rounded-md px-1.5 text-[10px]"
                  >
                    {workspaceProjects.length}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 flex items-center justify-between px-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Projects
          </p>

          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground"
            aria-label="New project"
          >
            <Link href="/projects">
              <Plus className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-2 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {workspaceProjects.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No projects yet.
            </div>
          ) : (
            workspaceProjects.map((project) => {
              const isActive = pathname === `/projects/${project.id}`;

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  onClick={() => setIsMobileOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`truncate rounded-lg px-3 py-1.5 text-sm ${
                    isActive
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {project.name}
                </Link>
              );
            })
          )}
        </div>

        <div className="mt-auto border-t border-border/60 pt-4">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl border border-border p-2.5 text-left transition hover:bg-muted/50 focus:outline-none"
                >
                  <Avatar className="size-9 border border-border">
                    <AvatarFallback className="bg-primary/5 text-xs font-bold text-primary">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold tracking-tight">
                      {userName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {userEmail}
                    </p>
                  </div>
                </button>
              }
            />

            <DropdownMenuContent
              align="end"
              className="w-52 rounded-xl p-1 shadow-md"
              side="top"
              sideOffset={8}
            >
              <DropdownMenuItem
                onClick={() => {
                  startNavigationLoading();
                  router.push("/settings");
                }}
                className="cursor-pointer gap-2 rounded-lg text-sm"
              >
                <Settings className="size-4" />
                <span>Settings</span>
              </DropdownMenuItem>

              <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg text-sm font-medium text-destructive focus:bg-destructive/10 focus:text-destructive">
                <LogOut className="size-4" />
                <span onClick={() => signOut({ callbackUrl: "/login" })} style={{ cursor: "pointer" }}>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {isCreateWorkspaceOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateWorkspace();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-workspace-title"
            className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3
                id="create-workspace-title"
                className="text-lg font-semibold"
              >
                Create workspace
              </h3>

              <button
                type="button"
                aria-label="Close create workspace dialog"
                onClick={closeCreateWorkspace}
                disabled={hasNoWorkspaces}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-3">
              <label className="block text-sm font-medium text-foreground">
                Workspace name

                <input
                  type="text"
                  autoFocus
                  value={newWorkspaceName}
                  onChange={(event) => {
                    setNewWorkspaceName(event.target.value);
                    setWorkspaceCreateError(null);
                  }}
                  placeholder="Marketing team"
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
                />
              </label>

              {workspaceCreateError && (
                <p role="alert" className="text-sm text-destructive">
                  {workspaceCreateError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                {!hasNoWorkspaces && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeCreateWorkspace}
                  >
                    Cancel
                  </Button>
                )}

                <Button type="submit" disabled={!newWorkspaceName.trim()}>
                  Create workspace
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="size-5" />
          </Button>

          <div className="ml-auto flex items-center gap-3">
            <DropdownMenu>
                <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="size-9 border border-border">
                    <AvatarFallback className="bg-primary/5 text-xs font-bold text-primary">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm text-muted-foreground"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                  >
                    <LogOut data-icon="inline-start" className="size-4" />
                    Sign out
                  </Button>
                </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
