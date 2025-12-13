import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelector } from "@/components/language-selector";
import "@/lib/i18n";

import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ResetPasswordPage from "@/pages/reset-password";
import Setup2FAPage from "@/pages/setup-2fa";
import SetupTenantPage from "@/pages/setup-tenant";
import SubscriptionPage from "@/pages/subscription";
import DashboardPage from "@/pages/dashboard";
import ProductsPage from "@/pages/products";
import TemplatesPage from "@/pages/templates";
import CampaignsPage from "@/pages/campaigns";
import CampaignEditorPage from "@/pages/campaign-editor";
import MessagesPage from "@/pages/messages";
import SuggestionsPage from "@/pages/suggestions";
import TutorialsPage from "@/pages/tutorials";
import AccountPage from "@/pages/account";
import UsersPage from "@/pages/users";
import SharingPage from "@/pages/sharing";
import TenantsPage from "@/pages/tenants";
import SettingsPage from "@/pages/settings";

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
      <Route path="/setup-2fa" component={Setup2FAPage} />
      <Route path="/setup-tenant" component={SetupTenantPage} />
      <Route path="/subscription" component={SubscriptionPage} />
      <Route component={NotFound} />
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
      <Route path="/campaigns" component={() => <ProtectedRoute component={CampaignsPage} />} />
      <Route path="/campaigns/new" component={() => <ProtectedRoute component={CampaignEditorPage} />} />
      <Route path="/campaigns/:id/edit" component={() => <ProtectedRoute component={CampaignEditorPage} />} />
      <Route path="/sharing" component={() => <ProtectedRoute component={SharingPage} />} />
      <Route path="/messages" component={() => <ProtectedRoute component={MessagesPage} />} />
      <Route path="/suggestions" component={() => <ProtectedRoute component={SuggestionsPage} />} />
      <Route path="/tutorials" component={() => <ProtectedRoute component={TutorialsPage} />} />
      <Route path="/account" component={() => <ProtectedRoute component={AccountPage} />} />
      <Route path="/users" component={() => <ProtectedRoute component={UsersPage} />} />
      <Route path="/tenants" component={() => <ProtectedRoute component={TenantsPage} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const { isAuthenticated, user } = useAuth();
  
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  if (!isAuthenticated) {
    return <PublicRoutes />;
  }

  if (user && !user.tenantId && user.role !== "super_admin") {
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
