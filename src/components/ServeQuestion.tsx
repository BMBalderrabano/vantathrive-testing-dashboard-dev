"use client";

import { useState } from "react";
import { serveQuestion, ServeQuestionResponse } from "@/lib/api";

interface ServeQuestionProps {
  onDataUpdate?: () => Promise<void>;
  userId?: string;
}

export default function ServeQuestion({ onDataUpdate, userId }: ServeQuestionProps = {}) {
  const [testing, setTesting] = useState<boolean>(true);
  const [response, setResponse] = useState<'NONE' | 'YES' | 'NO'>('NONE');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ServeQuestionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleServeQuestion = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const responseValue = response === 'NONE' ? undefined : response;
      const data = await serveQuestion(testing, responseValue, userId);
      setResult(data);
      
      // Call the callback to update parent data if provided
      if (onDataUpdate) {
        await onDataUpdate();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Serve Question</h2>
        <div className="text-sm text-gray-600">
          Test the question serving functionality
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          {/* Testing Toggle */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700">
              Testing Mode:
            </label>
            <button
              onClick={() => setTesting(!testing)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                testing ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  testing ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm text-gray-600">
              {testing ? "ON" : "OFF"}
            </span>
          </div>

          {/* Response Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Response (Optional):
            </label>
            <select
              value={response}
              onChange={(e) => setResponse(e.target.value as 'NONE' | 'YES' | 'NO')}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="NONE">NONE</option>
              <option value="YES">YES</option>
              <option value="NO">NO</option>
            </select>
          </div>

          {/* Serve Button */}
          <button
            onClick={handleServeQuestion}
            disabled={loading}
            className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
              loading
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Serving Question...
              </div>
            ) : (
              "🎯 Serve Question"
            )}
          </button>
        </div>

        {/* Response Display */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Response:</h3>
          <div className="bg-gray-50 border rounded-lg p-4 min-h-[200px]">
            {result ? (
              <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">
                {JSON.stringify(result, null, 2)}
              </pre>
            ) : error ? (
              <div className="text-red-600 text-sm">
                <div className="font-medium">Error:</div>
                <div className="mt-1">{error}</div>
              </div>
            ) : (
              <div className="text-gray-400 text-sm italic">
                Click &quot;Serve Question&quot; to see the response
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
