import { useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient, setQueryClientErrorHandler } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelector } from "@/components/language-selector";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";

import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ResetPasswordPage from "@/pages/reset-password";
import VerifyEmailPage from "@/pages/verify-email";
import Setup2FAPage from "@/pages/setup-2fa";
import SetupTenantPage from "@/pages/setup-tenant";
import SubscriptionPage from "@/pages/subscription";
import DashboardPage from "@/pages/dashboard";
import ProductsPage from "@/pages/products";
import TemplatesPage from "@/pages/templates";
import TemplateSetupPage from "@/pages/template-setup";
import CampaignsPage from "@/pages/campaigns";
import CampaignWizardPage from "@/pages/campaign-wizard";
import CampaignEditorPage from "@/pages/campaign-editor";
import CampaignPreviewPage from "@/pages/campaign-preview";
import TemplateEditorPage from "@/pages/template-editor";
import MessagesPage from "@/pages/messages";
import SuggestionsPage from "@/pages/suggestions";
import TutorialsPage from "@/pages/tutorials";
import AccountPage from "@/pages/account";
import UsersPage from "@/pages/users";
import SharingPage from "@/pages/sharing";
import TenantsPage from "@/pages/tenants";
import SettingsPage from "@/pages/settings";
import OrganizationSettingsPage from "@/pages/organization-settings";
import AdminSuggestionsPage from "@/pages/admin-suggestions";

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }
  
  return <Component />;
}

function AuthRoute({ component: Component }: { component: () => JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }
  
  return <Component />;
}

function PublicRoutes() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/login" />
      </Route>
      <Route path="/login" component={() => <AuthRoute component={LoginPage} />} />
      <Route path="/register" component={() => <AuthRoute component={RegisterPage} />} />
      <Route path="/reset-password" component={() => <AuthRoute component={ResetPasswordPage} />} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/setup-2fa" component={Setup2FAPage} />
      <Route path="/setup-tenant" component={SetupTenantPage} />
      <Route path="/subscription" component={SubscriptionPage} />
      <Route>
        <Redirect to="/login" />
      </Route>
    </Switch>
  );
}

function ProtectedRoutes() {
  return (
    <Switch>
      <Route path="/subscription" component={() => <ProtectedRoute component={SubscriptionPage} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardPage} />} />
      <Route path="/products" component={() => <ProtectedRoute component={ProductsPage} />} />
      <Route path="/templates" component={() => <ProtectedRoute component={TemplatesPage} />} />
      <Route path="/templates/new" component={() => <ProtectedRoute component={TemplateSetupPage} />} />
      <Route path="/templates/:id/edit" component={() => <ProtectedRoute component={TemplateEditorPage} />} />
      <Route path="/campaigns" component={() => <ProtectedRoute component={CampaignsPage} />} />
      <Route path="/campaigns/new" component={() => <ProtectedRoute component={CampaignWizardPage} />} />
      <Route path="/campaigns/:id/edit" component={() => <ProtectedRoute component={CampaignEditorPage} />} />
      <Route path="/campaigns/:id/preview" component={() => <ProtectedRoute component={CampaignPreviewPage} />} />
      <Route path="/campaigns/:id" component={() => <ProtectedRoute component={CampaignPreviewPage} />} />
      <Route path="/sharing" component={() => <ProtectedRoute component={SharingPage} />} />
      <Route path="/messages" component={() => <ProtectedRoute component={MessagesPage} />} />
      <Route path="/suggestions" component={() => <ProtectedRoute component={SuggestionsPage} />} />
      <Route path="/tutorials" component={() => <ProtectedRoute component={TutorialsPage} />} />
      <Route path="/account" component={() => <ProtectedRoute component={AccountPage} />} />
      <Route path="/users" component={() => <ProtectedRoute component={UsersPage} />} />
      <Route path="/organization" component={() => <ProtectedRoute component={OrganizationSettingsPage} />} />
      <Route path="/tenants" component={() => <ProtectedRoute component={TenantsPage} />} />
      <Route path="/admin/suggestions" component={() => <ProtectedRoute component={AdminSuggestionsPage} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ImpersonationBanner() {
  const { isImpersonating, originalSuperAdmin, stopImpersonation, user } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  if (!isImpersonating || !originalSuperAdmin) {
    return null;
  }

  const handleSwitchBack = () => {
    stopImpersonation();
    setLocation("/tenants");
  };

  return (
    <div className="bg-amber-500 dark:bg-amber-600 text-white px-4 py-2 flex items-center justify-between gap-4 flex-wrap">
      <span className="text-sm font-medium" data-testid="text-impersonation-info">
        {t("impersonation.viewingAs")}: {user?.firstName} {user?.lastName} ({user?.email})
      </span>
      <button
        onClick={handleSwitchBack}
        className="text-sm font-medium bg-white/20 px-3 py-1 rounded-md"
        data-testid="button-switch-back"
      >
        {t("impersonation.switchBack")}
      </button>
    </div>
  );
}

function AppLayout() {
  const { isAuthenticated, user, isImpersonating, logout } = useAuth();
  const [, setLocation] = useLocation();
  
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  // Set up global error handler for 401 responses
  useEffect(() => {
    setQueryClientErrorHandler(() => {
      logout();
      setLocation("/login");
    });
  }, [logout, setLocation]);

  if (!isAuthenticated) {
    return <PublicRoutes />;
  }

  if (user && !user.tenantId && user.role !== "super_admin" && !isImpersonating) {
    return (
      <Switch>
        <Route path="/setup-tenant" component={SetupTenantPage} />
        <Route>
          <Redirect to="/setup-tenant" />
        </Route>
      </Switch>
    );
  }

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <ImpersonationBanner />
          <header className="flex items-center justify-between gap-4 px-4 py-2 border-b bg-background sticky top-0 z-40">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/">
                <Redirect to="/dashboard" />
              </Route>
              <Route path="/login">
                <Redirect to="/dashboard" />
              </Route>
              <Route path="/register">
                <Redirect to="/dashboard" />
              </Route>
              <Route path="/reset-password">
                <Redirect to="/dashboard" />
              </Route>
              <Route path="/setup-tenant">
                <Redirect to="/dashboard" />
              </Route>
            </Switch>
            <ProtectedRoutes />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <AppLayout />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
