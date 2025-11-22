import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Building2, HelpCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const userInitials = user?.firstName && user?.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U";

  return (
    <header className="border-b bg-background sticky top-0 z-50" data-testid="header-main">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" data-testid="link-home">
            <span className="text-xl font-semibold text-foreground hover-elevate active-elevate-2 px-3 py-2 rounded-md cursor-pointer">
              Certia
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/" data-testid="link-dashboard">
              <Button variant="ghost" className="font-medium">
                Dashboard
              </Button>
            </Link>
            <Link href="/employees" data-testid="link-employees">
              <Button variant="ghost" className="font-medium">
                Employees
              </Button>
            </Link>
            <Link href="/checks/new" data-testid="link-new-check">
              <Button variant="ghost" className="font-medium">
                New Check
              </Button>
            </Link>
            <Link href="/import" data-testid="link-bulk-import">
              <Button variant="ghost" className="font-medium">
                Import
              </Button>
            </Link>
            <Link href="/help" data-testid="link-help">
              <Button variant="ghost" className="font-medium">
                <HelpCircle className="h-4 w-4 mr-2" />
                Help
              </Button>
            </Link>
          </nav>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2" data-testid="button-user-menu">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium">{user?.firstName || user?.email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium" data-testid="text-user-name">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground" data-testid="text-user-email">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            {user?.companyName && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <Building2 className="mr-2 h-4 w-4" />
                  <span className="text-sm">{user.companyName}</span>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
