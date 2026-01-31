"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, Sparkles } from "lucide-react";

export default function CreateAutomationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [taskDescription, setTaskDescription] = useState("");
  const [inputData, setInputData] = useState("");
  const [expectedOutput, setExpectedOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let parsedInput;
      try {
        parsedInput = JSON.parse(inputData || "{}");
      } catch {
        parsedInput = { raw: inputData };
      }

      const response = await apiClient.post<{ id: string }>("/automation/create", {
        taskDescription,
        inputData: parsedInput,
        expectedOutput: expectedOutput || undefined,
      });

      router.push(`/automation/${response.id}/status`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create automation job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-foreground">
            What task do you want automated?
          </h1>
          <p className="text-muted-foreground">
            Describe your task in simple terms. Our AI will handle the complexity.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Create Automation
            </CardTitle>
            <CardDescription>
              Tell us what you want automated, provide the input data, and we&apos;ll handle the rest.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="taskDescription">
                  What task do you want automated? *
                </Label>
                <Textarea
                  id="taskDescription"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="e.g., Process customer orders and send confirmation emails"
                  rows={3}
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Describe your automation task in plain language
                </p>
              </div>

              <div>
                <Label htmlFor="inputData">Input Data *</Label>
                <Textarea
                  id="inputData"
                  value={inputData}
                  onChange={(e) => setInputData(e.target.value)}
                  placeholder='{"customerName": "John Doe", "orderId": "12345", "amount": 100}'
                  rows={6}
                  className="font-mono"
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Provide your data as JSON or plain text
                </p>
              </div>

              <div>
                <Label htmlFor="expectedOutput">Expected Output (Optional)</Label>
                <Textarea
                  id="expectedOutput"
                  value={expectedOutput}
                  onChange={(e) => setExpectedOutput(e.target.value)}
                  placeholder="Describe what you expect as the result"
                  rows={3}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Automation...
                  </>
                ) : (
                  "Create Automation"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">How it works:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Describe your task in simple terms</li>
            <li>Provide the input data</li>
            <li>Our AI processes it automatically</li>
            <li>Get your results instantly</li>
          </ol>
        </div>
      </div>
    </ProtectedRoute>
  );
}


