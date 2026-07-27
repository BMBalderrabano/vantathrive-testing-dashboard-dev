"use client";

import { useState, useEffect, useCallback } from "react";
import { getReminderPreferences, updateReminderPreferences } from "@/lib/api";

interface ReminderPreferencesProps {
  selectedUserId: string;
  onDataUpdate: () => Promise<void>;
}

type ReminderMode = 'SoftMode' | 'FocusMode' | 'BeastMode';
type TimePreference = 'morning' | 'midday' | 'afternoon' | 'evening' | 'vanta_choice';

export default function ReminderPreferences({ selectedUserId, onDataUpdate }: ReminderPreferencesProps) {
  const [mode, setMode] = useState<ReminderMode>('SoftMode');
  const [timePreference, setTimePreference] = useState<TimePreference>('morning');
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [timezone, setTimezone] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  // Auto-detect timezone from browser
  useEffect(() => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(detectedTimezone);
  }, []);

  // Load current reminder preferences when user is selected
  const loadReminderPreferences = useCallback(async () => {
    if (!selectedUserId) return;

    setLoading(true);
    setMessage('');
    try {
      const preferences = await getReminderPreferences(selectedUserId);
      
      if (preferences) {
        setMode(preferences.mode as ReminderMode);
        setTimePreference(preferences.time_preference as TimePreference);
        setIsEnabled(preferences.is_enabled);
        if (preferences.timezone) {
          setTimezone(preferences.timezone);
        }
      } else {
        // No existing preferences, use defaults
        setMode('SoftMode');
        setTimePreference('morning');
        setIsEnabled(true);
      }
    } catch (error) {
      console.error("Failed to load reminder preferences:", error);
      setMessage(`Failed to load preferences: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    loadReminderPreferences();
  }, [loadReminderPreferences]);

  const handleSave = async () => {
    if (!selectedUserId || !timezone) {
      setMessage('Please ensure timezone is detected');
      return;
    }

    setSaving(true);
    setMessage('');
    
    try {
      await updateReminderPreferences(selectedUserId, {
        mode,
        time_preference: timePreference,
        is_enabled: isEnabled,
        timezone
      });
      
      setMessage('✅ Preferences saved successfully!');
      
      // Reload data
      await onDataUpdate();
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Failed to save reminder preferences:", error);
      setMessage(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const reminderModes: ReminderMode[] = ['SoftMode', 'FocusMode', 'BeastMode'];
  const timePreferences: TimePreference[] = ['morning', 'midday', 'afternoon', 'evening', 'vanta_choice'];

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">📧 Reminder Email Preferences</h2>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading preferences...</span>
        </div>
      ) : (
        <>
          {/* Reminder Mode */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reminder Mode
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ReminderMode)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {reminderModes.map((m) => (
                <option key={m} value={m}>
                  {m === 'SoftMode' ? 'Soft Mode' : m === 'FocusMode' ? 'Focus Mode' : 'Beast Mode'}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Select the intensity level for reminder emails
            </p>
          </div>

          {/* Time Preference */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Preference
            </label>
            <select
              value={timePreference}
              onChange={(e) => setTimePreference(e.target.value as TimePreference)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {timePreferences.map((tp) => (
                <option key={tp} value={tp}>
                  {tp === 'vanta_choice' ? 'Vanta Choice' : tp.charAt(0).toUpperCase() + tp.slice(1)}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Choose when you prefer to receive reminder emails
            </p>
          </div>

          {/* Enable/Disable Toggle */}
          <div className="mb-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Enable Reminder Emails
                </span>
                <p className="text-xs text-gray-500">
                  Toggle to enable or disable reminder emails for this user
                </p>
              </div>
            </label>
          </div>

          {/* Timezone Display */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <div className="p-3 bg-gray-50 border border-gray-300 rounded-md">
              <span className="text-sm text-gray-700">{timezone || 'Detecting...'}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Automatically detected from your browser
            </p>
          </div>

          {/* Current Settings Summary */}
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Current Settings</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• Mode: <strong>{mode === 'SoftMode' ? 'Soft Mode' : mode === 'FocusMode' ? 'Focus Mode' : 'Beast Mode'}</strong></p>
              <p>• Time Preference: <strong>{timePreference === 'vanta_choice' ? 'Vanta Choice' : timePreference.charAt(0).toUpperCase() + timePreference.slice(1)}</strong></p>
              <p>• Status: <strong>{isEnabled ? 'Enabled' : 'Disabled'}</strong></p>
              <p>• Timezone: <strong>{timezone || 'Not set'}</strong></p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSave}
              disabled={saving || !timezone}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
            >
              {saving ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                '💾 Save Preferences'
              )}
            </button>
            
            {message && (
              <div className={`text-sm font-medium ${
                message.includes('✅') ? 'text-green-600' : 'text-red-600'
              }`}>
                {message}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

