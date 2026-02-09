"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { getDashboardRouteForRole } from "@/lib/dashboard";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/automation", label: "Automation" },
  { href: "/use-cases", label: "Use Cases" },
  { href: "/technology", label: "Technology" },
  { href: "/about", label: "About" },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, logout, loading } = useAuth();
  const [isProtectedRoute, setIsProtectedRoute] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    const protectedRoutes = ["/dashboard", "/automation", "/admin", "/protected", "/app", "/dev"];
    setIsProtectedRoute(protectedRoutes.some(route => path.startsWith(route)));
  }, []);

  if (loading) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="w-8 h-8 bg-primary rounded-lg animate-pulse" />
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2" aria-label="SIMULATION Home">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center" aria-hidden="true">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <span className="font-semibold text-lg hidden sm:block">SIMULATION</span>
          </Link>

          {/* Desktop Navigation */}
          {!isProtectedRoute && (
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <Link 
                    href={getDashboardRouteForRole(user?.role)}
                    className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
                  >
                    <User className="w-4 h-4" />
                    {user?.name || user?.email || 'Dashboard'}
                  </Link>
                  <Button onClick={logout} variant="ghost" size="sm" className="gap-2">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/auth/sign-in">Login</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/auth/sign-up">Get Started</Link>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Protected Route - Show just user menu */}
          {isProtectedRoute && isAuthenticated && (
            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {user?.name || user?.email}
              </span>
              <Button onClick={logout} variant="ghost" size="sm" className="gap-2">
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            "md:hidden transition-all duration-300 ease-in-out overflow-hidden",
            mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="py-4 space-y-4 border-t">
            {!isProtectedRoute && (
              <>
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block text-base font-medium text-foreground/80 hover:text-foreground transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="pt-4 border-t space-y-2">
                  {isAuthenticated ? (
                    <>
                      <Button asChild variant="outline" className="w-full justify-start" size="sm">
                        <Link 
                          href={getDashboardRouteForRole(user?.role)} 
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <User className="w-4 h-4 mr-2" />
                          Dashboard
                        </Link>
                      </Button>
                      <Button onClick={logout} variant="ghost" className="w-full justify-start" size="sm">
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button asChild variant="outline" className="w-full" size="sm">
                        <Link href="/auth/sign-in" onClick={() => setMobileMenuOpen(false)}>
                          Login
                        </Link>
                      </Button>
                      <Button asChild className="w-full" size="sm">
                        <Link href="/auth/sign-up" onClick={() => setMobileMenuOpen(false)}>
                          Get Started
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
            
            {isProtectedRoute && isAuthenticated && (
              <Button onClick={logout} variant="ghost" className="w-full justify-start" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
