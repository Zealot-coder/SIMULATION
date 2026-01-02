"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

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

const STEP_TYPES = [
  { value: "ai_process", label: "AI Process" },
  { value: "send_message", label: "Send Message" },
  { value: "update_record", label: "Update Record" },
  { value: "wait", label: "Wait" },
  { value: "approval", label: "Human Approval" },
];

export default function NewWorkflowPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    organizationId: "",
    name: "",
    description: "",
    triggerEventType: "",
    steps: [] as any[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const orgs = await apiClient.getMyOrganizations();
      setOrganizations(orgs);
      if (orgs.length > 0) {
        setFormData({ ...formData, organizationId: orgs[0].id });
      }
    } catch (error) {
      console.error("Failed to load organizations:", error);
    }
  };

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        {
          stepType: "ai_process",
          name: "",
          config: {},
        },
      ],
    });
  };

  const removeStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index),
    });
  };

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormData({ ...formData, steps: newSteps });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await apiClient.createWorkflow(formData.organizationId, {
        name: formData.name,
        description: formData.description,
        triggerEventType: formData.triggerEventType || undefined,
        steps: formData.steps,
      });
      router.push("/dashboard/workflows");
    } catch (err: any) {
      setError(err.message || "Failed to create workflow");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/dashboard/workflows">
            <Button variant="ghost" size="sm" className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Workflows
            </Button>
          </Link>

          <h1 className="text-3xl font-bold mb-2">Create Workflow</h1>
          <p className="text-muted-foreground mb-8">
            Define automation steps that trigger on events
          </p>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                Workflow Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-border rounded-md bg-background"
                placeholder="e.g., Appointment Reminder"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-2 border border-border rounded-md bg-background"
                rows={3}
                placeholder="Describe what this workflow does..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Trigger Event Type (optional)
              </label>
              <select
                value={formData.triggerEventType}
                onChange={(e) =>
                  setFormData({ ...formData, triggerEventType: e.target.value })
                }
                className="w-full px-4 py-2 border border-border rounded-md bg-background"
              >
                <option value="">Manual trigger only</option>
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium">Workflow Steps</label>
                <Button type="button" onClick={addStep} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Step
                </Button>
              </div>

              {formData.steps.length === 0 ? (
                <div className="text-center py-8 border border-border rounded-lg bg-muted/30">
                  <p className="text-muted-foreground mb-4">
                    No steps yet. Add your first step to get started.
                  </p>
                  <Button type="button" onClick={addStep} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Step
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.steps.map((step, index) => (
                    <div
                      key={index}
                      className="border border-border rounded-lg p-4 bg-background"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-medium">Step {index + 1}</h4>
                        <Button
                          type="button"
                          onClick={() => removeStep(index)}
                          size="sm"
                          variant="ghost"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Step Type
                          </label>
                          <select
                            value={step.stepType}
                            onChange={(e) =>
                              updateStep(index, "stepType", e.target.value)
                            }
                            className="w-full px-4 py-2 border border-border rounded-md bg-background"
                          >
                            {STEP_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Step Name (optional)
                          </label>
                          <input
                            type="text"
                            value={step.name || ""}
                            onChange={(e) =>
                              updateStep(index, "name", e.target.value)
                            }
                            className="w-full px-4 py-2 border border-border rounded-md bg-background"
                            placeholder="e.g., Process with AI"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/dashboard/workflows">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading || formData.steps.length === 0}>
                {loading ? "Creating..." : "Create Workflow"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}

