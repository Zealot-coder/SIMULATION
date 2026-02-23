"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { useOrgContext } from "@/contexts/org-context";

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AppOnboardingPage() {
  const router = useRouter();
  const { onboardingRequired, refreshContext } = useOrgContext();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateOrganization = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const organization = await apiClient.createOrganization({
        name,
        slug: slug || toSlug(name),
        description: description || undefined,
      });

      if (organization?.id) {
        await apiClient.setActiveOrganization(organization.id);
      }

      await refreshContext();
      router.push("/app/overview");
    } catch (err: any) {
      setError(err?.message || "Failed to create organization");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!onboardingRequired) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Completed</CardTitle>
            <CardDescription>Your organization context is already configured.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/app/overview")}>Go to Overview</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Welcome to SIMULATION</h1>
          <p className="text-sm text-muted-foreground">
            Start by creating your organization workspace.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Setup</CardTitle>
          <CardDescription>
            This creates your first tenant context and unlocks `/app/overview`.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleCreateOrganization}>
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(event) => {
                  const nextName = event.target.value;
                  setName(nextName);
                  setSlug(toSlug(nextName));
                }}
                placeholder="Example: Dar Biz Supplies"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-slug">Slug</Label>
              <Input
                id="org-slug"
                value={slug}
                onChange={(event) => setSlug(toSlug(event.target.value))}
                placeholder="dar-biz-supplies"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-description">Description (optional)</Label>
              <Textarea
                id="org-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What does your business run on this platform?"
                rows={3}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Organization"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
