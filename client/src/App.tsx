import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Employees from "@/pages/employees";
import EmployeeNew from "@/pages/employee-new";
import EmployeeEdit from "@/pages/employee-edit";
import EmployeeDetail from "@/pages/employee-detail";
import CheckNew from "@/pages/check-new";
import CheckDetail from "@/pages/check-detail";
import BulkImport from "@/pages/bulk-import";
import Talent from "@/pages/talent";
import Help from "@/pages/help";
import PublicUpload from "@/pages/public-upload";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  // Public routes (no authentication required)
  if (location.startsWith("/upload")) {
    return <PublicUpload />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center h-14 px-4 border-b bg-gradient-to-r from-primary/5 via-background to-background shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto">
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
