"use client";

import { useState } from "react";
import { processHabit, ProcessHabitResponse } from "@/lib/api";

interface ProcessHabitProps {
  selectedUserId?: string;
  onDataUpdate?: () => Promise<void>;
}

export default function ProcessHabit({ selectedUserId, onDataUpdate }: ProcessHabitProps) {
  const [response, setResponse] = useState<'NONE' | 'yes' | 'no' | 'confirmed'>('NONE');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ProcessHabitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcessHabit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const responseValue = response === 'NONE' ? undefined : response;
      const data = await processHabit(responseValue, selectedUserId);
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
        <h2 className="text-xl font-semibold">Process Habit</h2>
        <div className="text-sm text-gray-600">
          {selectedUserId ? (
            <>For: {selectedUserId}</>
          ) : (
            <>Process habits for authenticated user</>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          {/* Response Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Response (Optional):
            </label>
            <select
              value={response}
              onChange={(e) => setResponse(e.target.value as 'NONE' | 'yes' | 'no' | 'confirmed')}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="NONE">NONE</option>
              <option value="yes">YES</option>
              <option value="no">NO</option>
              <option value="confirmed">CONFIRMED</option>
            </select>
          </div>

          {/* User ID Display */}
          {selectedUserId && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-800">Testing Mode</div>
              <div className="text-xs text-blue-600 mt-1">
                User ID: {selectedUserId}
              </div>
            </div>
          )}

          {/* Process Button */}
          <button
            onClick={handleProcessHabit}
            disabled={loading}
            className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
              loading
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing Habit...
              </div>
            ) : (
              "🔄 Process Habit"
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
                Click &quot;Process Habit&quot; to see the response
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
