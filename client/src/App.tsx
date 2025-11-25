import React, { Suspense, lazy } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";

const NotFound = lazy(() => import("@/pages/not-found"));
const Landing = lazy(() => import("@/pages/landing"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Employees = lazy(() => import("@/pages/employees"));
const EmployeeNew = lazy(() => import("@/pages/employee-new"));
const EmployeeEdit = lazy(() => import("@/pages/employee-edit"));
const EmployeeDetail = lazy(() => import("@/pages/employee-detail"));
const CheckNew = lazy(() => import("@/pages/check-new"));
const CheckDetail = lazy(() => import("@/pages/check-detail"));
const BulkImport = lazy(() => import("@/pages/bulk-import"));
const Talent = lazy(() => import("@/pages/talent"));
const Help = lazy(() => import("@/pages/help"));
const PublicUpload = lazy(() => import("@/pages/public-upload"));

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (location.startsWith("/upload")) {
    return (
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>}>
        <PublicUpload />
      </Suspense>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>}>
        <Landing />
      </Suspense>
    );
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center border-b bg-gradient-to-r from-primary/5 via-background to-background px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-y-auto">
            <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/employees" component={Employees} />
                <Route path="/employees/new" component={EmployeeNew} />
                <Route path="/employees/:id/edit" component={EmployeeEdit} />
                <Route path="/employees/:id" component={EmployeeDetail} />
                <Route path="/checks/new" component={CheckNew} />
                <Route path="/checks/:id" component={CheckDetail} />
                <Route path="/import" component={BulkImport} />
                <Route path="/talent" component={Talent} />
                <Route path="/help" component={Help} />
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
