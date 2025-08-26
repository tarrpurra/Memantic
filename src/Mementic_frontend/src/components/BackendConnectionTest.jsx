import React, { useState, useEffect } from "react";
import backendService from "../services/backendService";
import { getCanisterId, getAgentHost, isDevMode } from "../config/environment";

const BackendConnectionTest = () => {
  const [status, setStatus] = useState("idle");
  const [results, setResults] = useState({});
  const [error, setError] = useState(null);

  const testConnection = async () => {
    setStatus("testing");
    setError(null);
    setResults({});

    try {
      // Test 1: Configuration
      const config = {
        canisterId: getCanisterId(),
        agentHost: getAgentHost(),
        devMode: isDevMode(),
      };
      setResults((prev) => ({ ...prev, config }));

      // Test 2: Initialize backend service
      const initResult = await backendService.initialize();
      setResults((prev) => ({ ...prev, initialization: initResult }));

      // Test 3: Health check
      const healthResult = await backendService.healthCheck();
      setResults((prev) => ({ ...prev, healthCheck: healthResult }));

      // Test 4: Auth status
      const authStatus = await backendService.getAuthStatus();
      setResults((prev) => ({ ...prev, authStatus }));

      setStatus("success");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Backend Connection Test</h2>

      <button
        onClick={testConnection}
        disabled={status === "testing"}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {status === "testing" ? "Testing..." : "Test Connection"}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {Object.keys(results).length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Test Results:</h3>
          <div className="space-y-2">
            {Object.entries(results).map(([key, value]) => (
              <div key={key} className="p-3 bg-gray-50 rounded">
                <strong>{key}:</strong>
                <pre className="mt-1 text-sm overflow-x-auto">
                  {JSON.stringify(value, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h4 className="font-semibold text-yellow-800">Troubleshooting Tips:</h4>
        <ul className="mt-2 text-sm text-yellow-700 space-y-1">
          <li>
            • Ensure your backend canister is deployed:{" "}
            <code>dfx deploy Mementic_backend</code>
          </li>
          <li>
            • Check that VITE_MEMENTIC_BACKEND_CANISTER_ID is set in your root
            .env file
          </li>
          <li>• Verify the canister ID matches your deployed backend</li>
          <li>• Make sure dfx is running locally if in development mode</li>
        </ul>
      </div>
    </div>
  );
};

export default BackendConnectionTest;
