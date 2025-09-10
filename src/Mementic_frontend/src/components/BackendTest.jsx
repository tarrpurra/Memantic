import { useState } from "react";
import { Button } from "./ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import backendService from "../services/backendService";
import { testConnection } from "../services/backendService.js";

export const BackendTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isTesting, setIsTesting] = useState(false);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const addTestResult = (test, result, error = null) => {
    setTestResults((prev) => [
      ...prev,
      {
        test,
        result,
        error,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const runTests = async () => {
    setIsTesting(true);
    setTestResults([]);

    try {
      // Test 1: Connection Test
      try {
        const connectionResult = await testConnection();
        if (connectionResult.success) {
          addTestResult("Connection Test", "PASSED", "Backend connection successful");
        } else {
          addTestResult("Connection Test", "FAILED", connectionResult.error);
        }
      } catch (error) {
        addTestResult("Connection Test", "FAILED", error.message);
      }

      // Test 2: Health Check
      try {
        const health = await backendService.healthCheck();
        addTestResult("Health Check", "PASSED", `Health: ${health}`);
      } catch (error) {
        addTestResult("Health Check", "FAILED", error.message);
      }

      // Test 3: Authentication Status
      try {
        const isAuth = backendService.isUserAuthenticated();
        addTestResult(
          "Authentication Status",
          "PASSED",
          `Service Authenticated: ${isAuth}`
        );
      } catch (error) {
        addTestResult("Authentication Status", "FAILED", error.message);
      }

      // Test 3: Get Total Memes
      try {
        const totalMemes = await backendService.getTotalMemes();
        addTestResult("Get Total Memes", "PASSED", null);
      } catch (error) {
        addTestResult("Get Total Memes", "FAILED", error.message);
      }

      // Test 4: Get Total Memes
      try {
        const totalMemes = await backendService.getTotalMemes();
        addTestResult("Get Total Memes", "PASSED", `Total memes: ${totalMemes}`);
      } catch (error) {
        addTestResult("Get Total Memes", "FAILED", error.message);
      }

      // Test 5: Check Remaining Calls (only if authenticated)
      if (isAuthenticated) {
        try {
          const calls = await backendService.getRemainingCalls();
          addTestResult(
            "Check Remaining Calls",
            "PASSED",
            `User has ${calls} calls remaining`
          );
        } catch (error) {
          addTestResult("Check Remaining Calls", "FAILED", error.message);
        }
      } else {
        addTestResult(
          "Check Remaining Calls",
          "SKIPPED",
          "User not authenticated"
        );
      }

      toast({
        title: "Backend Tests Complete",
        description: `Ran ${testResults.length + 5} tests`,
      });
    } catch (error) {
      toast({
        title: "Test Suite Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">Backend Integration Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runTests} disabled={isTesting} variant="default">
            {isTesting ? "Running Tests..." : "Run Backend Tests"}
          </Button>
          <Button
            onClick={async () => {
              try {
                const result = await testConnection();
                toast({
                  title: result.success ? "Connection Successful" : "Connection Failed",
                  description: result.success ? "Backend is reachable" : result.error,
                  variant: result.success ? "default" : "destructive",
                });
              } catch (error) {
                toast({
                  title: "Connection Test Failed",
                  description: error.message,
                  variant: "destructive",
                });
              }
            }}
            variant="outline"
          >
            Test Connection
          </Button>
          <Button
            onClick={clearResults}
            variant="outline"
            disabled={testResults.length === 0}
          >
            Clear Results
          </Button>
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">Test Results:</h3>
          {testResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tests run yet. Click "Run Backend Tests" to start.
            </p>
          ) : (
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.result === "PASSED"
                      ? "border-green-200 bg-green-50"
                      : result.result === "FAILED"
                      ? "border-red-200 bg-red-50"
                      : "border-yellow-200 bg-yellow-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{result.test}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        result.result === "PASSED"
                          ? "bg-green-100 text-green-800"
                          : result.result === "FAILED"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {result.result}
                    </span>
                  </div>
                  {result.error && (
                    <p className="text-sm text-red-600 mt-1">{result.error}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          <p>
            <strong>Status:</strong>{" "}
            {isAuthenticated ? "Authenticated" : "Not Authenticated"}
          </p>
          <p>
            <strong>Backend Service:</strong>{" "}
            {backendService ? "Initialized" : "Not Initialized"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
