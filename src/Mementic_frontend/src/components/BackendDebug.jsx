import React, { useState, useEffect } from "react";
import backendService, { getBackend } from "../services/backendService";
import {
  getCanisterId,
  getAgentHost,
  isDevMode,
  hasBackendCanisterId,
  hasFrontendCanisterId,
} from "../config/environment";

const BackendDebug = () => {
  const [status, setStatus] = useState("idle");
  const [debugInfo, setDebugInfo] = useState({});
  const [error, setError] = useState(null);

  const runDebug = async () => {
    setStatus("debugging");
    setError(null);
    setDebugInfo({});

    try {
      // Step 1: Environment check
      const envInfo = {
        canisterId: getCanisterId(),
        agentHost: getAgentHost(),
        devMode: isDevMode(),
        hasBackendCanisterId: hasBackendCanisterId(),
        hasFrontendCanisterId: hasFrontendCanisterId(),
      };
      setDebugInfo((prev) => ({ ...prev, environment: envInfo }));

      // Step 2: Backend service initialization
      console.log("🔧 Starting backend service initialization...");
      const initResult = await backendService.initialize();
      setDebugInfo((prev) => ({
        ...prev,
        initialization: { success: initResult },
      }));

      // Step 3: Get backend actor
      const backend = getBackend();
      setDebugInfo((prev) => ({
        ...prev,
        backend: {
          hasActor: !!backend,
          actorType: backend ? typeof backend : "undefined",
          actorKeys: backend ? Object.keys(backend) : [],
        },
      }));

      // Step 4: Health check
      if (backend) {
        try {
          const health = await backend.health();
          setDebugInfo((prev) => ({
            ...prev,
            health: { success: true, response: health },
          }));
        } catch (healthError) {
          setDebugInfo((prev) => ({
            ...prev,
            health: { success: false, error: healthError.message },
          }));
        }
      }

      setStatus("success");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Backend Debug</h2>

      <button
        onClick={runDebug}
        disabled={status === "debugging"}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {status === "debugging" ? "Debugging..." : "Run Debug"}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {Object.keys(debugInfo).length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Debug Results:</h3>
          <div className="space-y-2">
            {Object.entries(debugInfo).map(([key, value]) => (
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
        <h4 className="font-semibold text-yellow-800">Common Issues:</h4>
        <ul className="mt-2 text-sm text-yellow-700 space-y-1">
          <li>
            • Missing declaration files - run:{" "}
            <code>dfx generate Mementic_backend</code>
          </li>
          <li>
            • Backend canister not deployed - run:{" "}
            <code>dfx deploy Mementic_backend</code>
          </li>
          <li>• Network connectivity issues</li>
          <li>• CORS or authentication problems</li>
        </ul>
      </div>
    </div>
  );
};

export default BackendDebug;
