"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useTheme } from "@/contexts/theme-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  User,
  Building2,
  Users,
  Puzzle,
  Palette,
  Bell,
  Shield,
  ChevronRight,
  Check,
  Moon,
  Sun,
  Monitor,
  Upload,
  Mail,
  Smartphone,
  Save,
} from "lucide-react";

// Settings sections configuration
const settingsSections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "team", label: "Team & Roles", icon: Users },
  { id: "integrations", label: "Integrations", icon: Puzzle },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
];

// Theme option component
function ThemeOption({
  value,
  label,
  description,
  icon: Icon,
  isSelected,
  onClick,
  preview,
}: {
  value: string;
  label: string;
  description: string;
  icon: React.ElementType;
  isSelected: boolean;
  onClick: () => void;
  preview: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/50"
      )}
    >
      {isSelected && (
        <div className="absolute top-3 right-3">
          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        </div>
      )}
      
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-md",
          isSelected ? "bg-primary/10" : "bg-muted"
        )}>
          <Icon className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{label}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      
      <div className="mt-4">
        {preview}
      </div>
    </div>
  );
}

// Theme preview components
function DefaultThemePreview() {
  return (
    <div className="rounded-md border overflow-hidden">
      <div className="h-6 bg-background border-b flex items-center px-2 gap-1">
        <div className="w-2 h-2 rounded-full bg-orange-500" />
        <div className="w-2 h-2 rounded-full bg-muted" />
        <div className="w-2 h-2 rounded-full bg-muted" />
      </div>
      <div className="p-2 bg-background">
        <div className="h-2 w-16 bg-orange-500/20 rounded mb-1.5" />
        <div className="h-2 w-24 bg-muted rounded" />
      </div>
    </div>
  );
}

function DarkThemePreview() {
  return (
    <div className="rounded-md border overflow-hidden">
      <div className="h-6 bg-slate-900 border-b border-slate-800 flex items-center px-2 gap-1">
        <div className="w-2 h-2 rounded-full bg-orange-500" />
        <div className="w-2 h-2 rounded-full bg-slate-700" />
        <div className="w-2 h-2 rounded-full bg-slate-700" />
      </div>
      <div className="p-2 bg-slate-900">
        <div className="h-2 w-16 bg-orange-500/20 rounded mb-1.5" />
        <div className="h-2 w-24 bg-slate-800 rounded" />
      </div>
    </div>
  );
}

function CustomThemePreview({ color }: { color: string }) {
  return (
    <div className="rounded-md border overflow-hidden">
      <div className="h-6 bg-background border-b flex items-center px-2 gap-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <div className="w-2 h-2 rounded-full bg-muted" />
        <div className="w-2 h-2 rounded-full bg-muted" />
      </div>
      <div className="p-2 bg-background">
        <div className="h-2 w-16 rounded mb-1.5" style={{ backgroundColor: `${color}30` }} />
        <div className="h-2 w-24 bg-muted rounded" />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const { theme, setTheme, accentColor, setAccentColor, isDark } = useTheme();
  const [customColor, setCustomColor] = useState(accentColor);

  const handleColorChange = (color: string) => {
    setCustomColor(color);
    setAccentColor(color);
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case "profile":
        return (
          <div className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Manage your personal information and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Photo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">JPG, PNG or GIF. Max 2MB.</p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="+255 XXX XXX XXX" />
                </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/30 flex justify-end">
                <Button className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Theme Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>Choose your preferred color scheme</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <ThemeOption
                    value="default"
                    label="Default"
                    description="Clean light theme with orange accents"
                    icon={Sun}
                    isSelected={theme === "default"}
                    onClick={() => setTheme("default")}
                    preview={<DefaultThemePreview />}
                  />
                  <ThemeOption
                    value="dark"
                    label="Dark Mode"
                    description="Easy on the eyes, orange accents preserved"
                    icon={Moon}
                    isSelected={theme === "dark"}
                    onClick={() => setTheme("dark")}
                    preview={<DarkThemePreview />}
                  />
                  <ThemeOption
                    value="custom"
                    label="Custom"
                    description="Choose your own accent color"
                    icon={Palette}
                    isSelected={theme === "custom"}
                    onClick={() => setTheme("custom")}
                    preview={<CustomThemePreview color={customColor} />}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Custom Accent Color */}
            {theme === "custom" && (
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle>Accent Color</CardTitle>
                  <CardDescription>Customize your brand accent color</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div 
                      className="h-16 w-16 rounded-lg border-2 shadow-sm"
                      style={{ backgroundColor: customColor }}
                    />
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="accentColor">Custom Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="accentColor"
                          type="color"
                          value={customColor}
                          onChange={(e) => handleColorChange(e.target.value)}
                          className="h-10 w-20 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={customColor}
                          onChange={(e) => handleColorChange(e.target.value)}
                          placeholder="#f97316"
                          className="font-mono uppercase"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Preset colors */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Presets</Label>
                    <div className="flex flex-wrap gap-2">
                      {["#f97316", "#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#06b6d4", "#f59e0b", "#ef4444"].map((color) => (
                        <button
                          key={color}
                          onClick={() => handleColorChange(color)}
                          className={cn(
                            "h-8 w-8 rounded-lg border-2 transition-all",
                            customColor === color ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose how you want to be notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { icon: Mail, label: "Email Notifications", description: "Receive updates via email", defaultChecked: true },
                  { icon: Smartphone, label: "SMS Notifications", description: "Get alerts via text message", defaultChecked: false },
                  { icon: Bell, label: "Push Notifications", description: "Browser push notifications", defaultChecked: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-muted">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={item.defaultChecked} className="sr-only peer" />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        );

      case "organization":
      case "team":
      case "integrations":
      case "security":
        return (
          <div className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="capitalize">{activeSection}</CardTitle>
                <CardDescription>This section is coming soon</CardDescription>
              </CardHeader>
              <CardContent className="py-12 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  {(() => {
                    const Icon = settingsSections.find(s => s.id === activeSection)?.icon || Building2;
                    return <Icon className="h-8 w-8 text-muted-foreground" />;
                  })()}
                </div>
                <h3 className="font-medium mb-2">Work in Progress</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  We&apos;re building this feature. Check back soon for updates.
                </p>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="space-y-1">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1 text-left">{section.label}</span>
                    <ChevronRight className={cn(
                      "h-4 w-4 transition-transform",
                      isActive ? "rotate-90 text-primary" : "text-muted-foreground"
                    )} />
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {renderSectionContent()}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
