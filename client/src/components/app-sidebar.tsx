import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  Megaphone, 
  Share2, 
  MessageSquare, 
  Lightbulb, 
  BookOpen, 
  Settings, 
  Users,
  LogOut,
  Building2,
  Settings2,
  Building
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import type { Message, Suggestion } from "@shared/schema";

export function AppSidebar() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const { data: inboxMessages } = useQuery<Message[]>({
    queryKey: ["/api/messages", "inbox"],
    queryFn: async () => {
      const response = await fetch("/api/messages?type=inbox", {
        credentials: "include",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("authToken")}`
        }
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadCount = inboxMessages?.filter(m => !m.isRead).length || 0;

  const { data: suggestions } = useQuery<Suggestion[]>({
    queryKey: ["/api/suggestions"],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const pendingSuggestionsCount = suggestions?.filter(s => s.status === "pending").length || 0;

  const { data: allSuggestions } = useQuery<Suggestion[]>({
    queryKey: ["/api/admin/suggestions"],
    enabled: !!user && user.role === "super_admin",
    refetchInterval: 30000,
  });

  const allPendingSuggestionsCount = allSuggestions?.filter(s => s.status === "pending").length || 0;

  const mainNavItems = [
    { title: t("nav.dashboard"), url: "/dashboard", icon: LayoutDashboard },
    { title: t("nav.products"), url: "/products", icon: Package },
    { title: t("nav.templates"), url: "/templates", icon: FileText },
    { title: t("nav.campaigns"), url: "/campaigns", icon: Megaphone },
    { title: t("nav.sharing"), url: "/sharing", icon: Share2 },
  ];

  const communicationItems = [
    { title: t("nav.messages"), url: "/messages", icon: MessageSquare },
    { title: t("nav.suggestions"), url: "/suggestions", icon: Lightbulb },
    { title: t("nav.tutorials"), url: "/tutorials", icon: BookOpen },
  ];

  const adminItems = [
    { title: t("nav.users"), url: "/users", icon: Users },
    { title: t("nav.organization"), url: "/organization", icon: Building },
  ];

  const superAdminItems = [
    { title: t("nav.tenants"), url: "/tenants", icon: Building2 },
    { title: t("nav.adminSuggestions"), url: "/admin/suggestions", icon: Lightbulb },
    { title: t("nav.settings"), url: "/settings", icon: Settings2 },
  ];

  const isActive = (url: string) => location === url || (url !== "/dashboard" && location.startsWith(url));

  const roleLabel = user?.role === "super_admin" 
    ? t("users.superAdmin") 
    : user?.role === "tenant_admin" 
    ? t("users.tenantAdmin") 
    : t("users.tenantUser");

  const roleVariant = user?.role === "super_admin" 
    ? "default" 
    : user?.role === "tenant_admin" 
    ? "secondary" 
    : "outline";

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-lg">
            eB
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-lg">{t("app.name")}</span>
            <span className="text-xs text-muted-foreground">{t("app.tagline")}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-${item.url.slice(1)}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Communication
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {communicationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`nav-${item.url.slice(1)}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.url === "/messages" && unreadCount > 0 && (
                    <SidebarMenuBadge className="bg-destructive text-destructive-foreground" data-testid="badge-unread-messages">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </SidebarMenuBadge>
                  )}
                  {item.url === "/suggestions" && pendingSuggestionsCount > 0 && (
                    <SidebarMenuBadge className="bg-destructive text-destructive-foreground" data-testid="badge-pending-suggestions">
                      {pendingSuggestionsCount > 99 ? "99+" : pendingSuggestionsCount}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(user?.role === "super_admin" || user?.role === "tenant_admin") && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      data-testid={`nav-${item.url.slice(1)}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {user?.role === "super_admin" && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider" data-testid="nav-superadmin-section">
              {t("nav.superAdmin")}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      data-testid={`nav-${item.url.slice(1)}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.url === "/admin/suggestions" && allPendingSuggestionsCount > 0 && (
                      <SidebarMenuBadge className="bg-destructive text-destructive-foreground" data-testid="badge-admin-pending-suggestions">
                        {allPendingSuggestionsCount > 99 ? "99+" : allPendingSuggestionsCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium truncate">
              {user?.firstName} {user?.lastName}
            </span>
            <Badge variant={roleVariant} className="w-fit text-xs">
              {roleLabel}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start"
            asChild
            data-testid="nav-account"
          >
            <Link href="/account">
              <Settings className="h-4 w-4 mr-2" />
              {t("nav.account")}
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
