"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Check,
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  Menu,
  Plus,
  Settings,
  Users,
  X,
  LogOut,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Team", href: "/team", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

// Clean Mock Data Structures
const mockWorkspaces = [
  { id: "ws-1", name: "Personal Workspace" },
  { id: "ws-2", name: "Engineering Team" },
];

const mockProjects = [
  { id: "website-redesign", name: "Website Redesign" },
  { id: "mobile-app", name: "Mobile App v2" },
];

export function AppShell({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();

  // UI Interactive States
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [workspaceOpen, setWorkspaceOpen] = useState<boolean>(false);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("ws-1");
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);

  const activeWorkspace =
    mockWorkspaces.find((ws) => ws.id === activeWorkspaceId) ??
    mockWorkspaces[0];

  return (
    <div className="min-h-screen text-foreground flex flex-col lg:flex-row">
      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden w-full h-full text-left"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close menu layout"
        />
      )}

      {/* Sidebar Core Component */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card px-4 py-5 transition-transform duration-200 ease-in-out lg:static lg:w-64 lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Header Selector Area */}
        <div className="mb-7 flex items-center justify-between px-2">
          <button
            type="button"
            className="flex items-center gap-3 text-left focus:outline-none"
            onClick={() => setWorkspaceOpen((prev) => !prev)}
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Check className="size-5" />
            </span>
            <div>
              <span className="block text-sm font-semibold truncate max-w-[130px]">
                {activeWorkspace?.name}
              </span>
              <span className="block text-xs text-muted-foreground">
                {mockWorkspaces.length} workspaces
              </span>
            </div>
            <ChevronDown className="size-4 text-muted-foreground flex-shrink-0" />
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Localized Workspaces Multi-Menu Dropdown Panel */}
        {workspaceOpen && (
          <div className="mb-4 rounded-xl border border-border bg-background p-2 shadow-sm space-y-0.5">
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Workspaces
            </p>
            {mockWorkspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm ${
                  workspace.id === activeWorkspaceId
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setActiveWorkspaceId(workspace.id);
                  setWorkspaceOpen(false);
                }}
              >
                <span>{workspace.name}</span>
                {workspace.id === activeWorkspaceId && (
                  <Check className="size-4" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Primary Navigation Stack */}
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
                <Icon className="size-4 flex-shrink-0" />
                <span>{item.label}</span>
                {item.label === "Projects" && (
                  <Badge
                    variant="secondary"
                    className="ml-auto rounded-md px-1.5 text-[10px]"
                  >
                    {mockProjects.length}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Projects Fast Paths Header */}
        <div className="mt-8 flex items-center justify-between px-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Projects
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground"
          >
            <Plus className="size-4" />
          </Button>
        </div>

        {/* Project Links Loop */}
        <div className="mt-2 flex flex-col gap-0.5">
          {mockProjects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              onClick={() => setIsMobileOpen(false)}
              className="truncate rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {project.name}
            </Link>
          ))}
        </div>

        {/* Footer Identity Block & Trigger */}
        <div className="mt-auto pt-4 border-t border-border/60">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl border border-border p-2.5 hover:bg-muted/50 transition text-left focus:outline-none"
                >
                  <Avatar className="size-9 border border-border">
                    <AvatarFallback className="text-xs font-bold bg-primary/5 text-primary">
                      JD
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold tracking-tight">
                      Jordan Doe
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      jordan@taskflow.ui
                    </p>
                  </div>
                </button>
              }
            ></DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-52 rounded-xl shadow-md p-1"
              side="top"
              sideOffset={8}
            >
              <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer rounded-lg gap-2 text-sm font-medium">
                <LogOut className="size-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Viewport Content Block */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-border px-4 lg:px-8 bg-background/90 backdrop-blur sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="size-5" />
          </Button>

          <div className="flex items-center gap-3 ml-auto relative">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-muted-foreground"
              onClick={() => setNotificationsOpen((prev) => !prev)}
            >
              <Bell className="size-5" />
            </Button>

            {notificationsOpen && (
              <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-border bg-popover p-4 text-xs text-muted-foreground shadow-md animate-in fade-in duration-100">
                No new notifications.
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
