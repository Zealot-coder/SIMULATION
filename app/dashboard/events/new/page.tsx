"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";

const EVENT_TYPES = [
  "SALE_RECORDED",
  "APPOINTMENT_SCHEDULED",
  "APPOINTMENT_MISSED",
  "PATIENT_REGISTERED",
  "INVENTORY_LOW",
  "MESSAGE_RECEIVED",
  "FORM_SUBMITTED",
  "CUSTOM",
];

export default function NewEventPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    organizationId: "",
    type: "CUSTOM",
    name: "",
    payload: "{}",
    source: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadOrganizations = useCallback(async () => {
    try {
      const orgs = await apiClient.getMyOrganizations();
      setOrganizations(orgs);
      if (orgs.length > 0) {
        setFormData(prev => ({ ...prev, organizationId: orgs[0].id }));
      }
    } catch (error) {
      console.error("Failed to load organizations:", error);
    }
  }, []);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let payload;
      try {
        payload = JSON.parse(formData.payload);
      } catch {
        throw new Error("Invalid JSON in payload");
      }

      await apiClient.createEvent(formData.organizationId, {
        type: formData.type,
        name: formData.name,
        payload,
        source: formData.source || undefined,
      });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Create Event</h1>
            <p className="text-muted-foreground">
              Trigger workflows by creating an event
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 bg-background border border-border rounded-lg p-8">
            <div>
              <label className="block text-sm font-medium mb-2">
                Organization
              </label>
              <select
                value={formData.organizationId}
                onChange={(e) =>
                  setFormData({ ...formData, organizationId: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-border rounded-md bg-background"
              >
                <option value="">Select organization</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Event Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-border rounded-md bg-background"
              >
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Event Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-border rounded-md bg-background"
                placeholder="e.g., New Appointment Scheduled"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Payload (JSON) *
              </label>
              <textarea
                value={formData.payload}
                onChange={(e) =>
                  setFormData({ ...formData, payload: e.target.value })
                }
                required
                rows={8}
                className="w-full px-4 py-2 border border-border rounded-md bg-background font-mono text-sm"
                placeholder='{"patientId": "123", "appointmentDate": "2024-01-15"}'
              />
              <p className="text-xs text-muted-foreground mt-1">
                Valid JSON object containing event data
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Source (optional)
              </label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) =>
                  setFormData({ ...formData, source: e.target.value })
                }
                className="w-full px-4 py-2 border border-border rounded-md bg-background"
                placeholder="e.g., whatsapp, api, manual"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/dashboard">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}


