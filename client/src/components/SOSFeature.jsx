/**
 * SOS Emergency Feature Component
 * Allows patients to send emergency alerts to parents/guardians via Telegram
 */

import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  MapPin,
  Phone,
  Send,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import api from "../config/api";

const SOSFeature = () => {
  const [sosConfig, setSOSConfig] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showSendSOS, setShowSendSOS] = useState(false);
  const [sosHistory, setSOSHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states
  const [emergencyContacts, setEmergencyContacts] = useState({
    parent1_telegram_id: "",
    parent2_telegram_id: "",
    guardian_telegram_id: "",
  });

  const [sosMessage, setSOSMessage] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");
  const [location, setLocation] = useState({
    address: "Location not available",
  });
  const [testingTelegram, setTestingTelegram] = useState("");

  // Load SOS config on mount
  useEffect(() => {
    loadSOSConfig();
    loadSOSHistory();
  }, []);

  // Load SOS configuration
  const loadSOSConfig = async () => {
    try {
      const response = await api.get("/api/sos/config");
      setSOSConfig(response.data);
    } catch (err) {
      console.error("Failed to load SOS config:", err);
      setError("Failed to load SOS configuration");
    }
  };

  // Load SOS history
  const loadSOSHistory = async () => {
    try {
      const response = await api.get("/api/sos/history?limit=10");
      setSOSHistory(response.data.alerts);
    } catch (err) {
      console.error("Failed to load SOS history:", err);
    }
  };

  // Get user's current location
  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // In production, reverse geocode to get address
          setLocation({
            latitude,
            longitude,
            address: `Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(
              4
            )}`,
          });
          setLoading(false);
          setSuccess("Location obtained");
          setTimeout(() => setSuccess(""), 3000);
        },
        (err) => {
          console.error("Geolocation error:", err);
          setError("Unable to get location. Please enable location services.");
          setLoading(false);
        }
      );
    } else {
      setError("Geolocation is not supported in this browser");
    }
  };

  // Update emergency contacts
  const handleUpdateContacts = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post(
        "/api/sos/update-contacts",
        emergencyContacts
      );
      setSuccess("Emergency contacts updated successfully");
      setShowSetup(false);
      loadSOSConfig();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update contacts");
    } finally {
      setLoading(false);
    }
  };

  // Test Telegram connection
  const handleTestTelegram = async (telegramId) => {
    if (!telegramId) {
      setError("Please enter a Telegram ID to test");
      return;
    }

    setTestingTelegram(telegramId);
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/api/sos/test-telegram", {
        telegramId,
      });
      setSuccess("Test message sent! Check your Telegram.");
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send test message");
    } finally {
      setLoading(false);
      setTestingTelegram("");
    }
  };

  // Send SOS alert
  const handleSendSOS = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/api/sos/send", {
        message: sosMessage || "Emergency assistance needed",
        severity,
        location,
      });

      setSuccess(
        `SOS sent to ${response.data.details.successfulRecipients} contact(s)`
      );
      setSOSMessage("");
      setSeverity("MEDIUM");
      setShowSendSOS(false);
      loadSOSHistory();
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send SOS alert");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      LOW: "bg-yellow-100 text-yellow-800 border-yellow-300",
      MEDIUM: "bg-orange-100 text-orange-800 border-orange-300",
      HIGH: "bg-red-100 text-red-800 border-red-300",
      CRITICAL: "bg-red-200 text-red-900 border-red-400",
    };
    return colors[severity] || colors.MEDIUM;
  };

  const getSeverityEmoji = (severity) => {
    const emojis = {
      LOW: "🟡",
      MEDIUM: "🟠",
      HIGH: "🔴",
      CRITICAL: "⚠️",
    };
    return emojis[severity] || "🟠";
  };

  if (!sosConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SOS feature...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Error & Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* SOS Status Card */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            Emergency SOS Feature
          </h2>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${
              sosConfig.totalConfigured > 0
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {sosConfig.totalConfigured > 0 ? "✅ Ready" : "⚠️ Setup Required"}
          </span>
        </div>

        <p className="text-gray-700 mb-4">
          Quickly send emergency alerts to your parents/guardians via Telegram
          with your location and medical information.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div
            className={`p-3 rounded border ${
              sosConfig.contacts.parent1.configured
                ? "bg-green-100 border-green-300"
                : "bg-gray-100 border-gray-300"
            }`}
          >
            <p className="text-sm font-semibold">Parent 1</p>
            <p className="text-xs">
              {sosConfig.contacts.parent1.configured
                ? "✅ Configured"
                : "❌ Not Set"}
            </p>
          </div>
          <div
            className={`p-3 rounded border ${
              sosConfig.contacts.parent2.configured
                ? "bg-green-100 border-green-300"
                : "bg-gray-100 border-gray-300"
            }`}
          >
            <p className="text-sm font-semibold">Parent 2</p>
            <p className="text-xs">
              {sosConfig.contacts.parent2.configured
                ? "✅ Configured"
                : "❌ Not Set"}
            </p>
          </div>
          <div
            className={`p-3 rounded border ${
              sosConfig.contacts.guardian.configured
                ? "bg-green-100 border-green-300"
                : "bg-gray-100 border-gray-300"
            }`}
          >
            <p className="text-sm font-semibold">Guardian</p>
            <p className="text-xs">
              {sosConfig.contacts.guardian.configured
                ? "✅ Configured"
                : "❌ Not Set"}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {showSetup ? "Hide Setup" : "Setup Contacts"}
          </button>
          <button
            onClick={() => setShowSendSOS(!showSendSOS)}
            disabled={sosConfig.totalConfigured === 0}
            className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition ${
              sosConfig.totalConfigured > 0
                ? "bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            <Send className="w-4 h-4" />
            Send SOS Alert
          </button>
        </div>
      </div>

      {/* Setup Form */}
      {showSetup && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Configure Emergency Contacts
          </h3>
          <p className="text-gray-600 text-sm">
            Add Telegram chat IDs for your emergency contacts.{" "}
            <a
              href="https://t.me/userinfobot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Get your Telegram ID here
            </a>
          </p>

          <form onSubmit={handleUpdateContacts} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent 1 Telegram ID
              </label>
              <input
                type="text"
                placeholder="Enter Parent 1 Telegram ID"
                value={emergencyContacts.parent1_telegram_id}
                onChange={(e) =>
                  setEmergencyContacts({
                    ...emergencyContacts,
                    parent1_telegram_id: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {emergencyContacts.parent1_telegram_id && (
                <button
                  type="button"
                  onClick={() =>
                    handleTestTelegram(emergencyContacts.parent1_telegram_id)
                  }
                  disabled={loading}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                >
                  Test Connection
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent 2 Telegram ID (Optional)
              </label>
              <input
                type="text"
                placeholder="Enter Parent 2 Telegram ID"
                value={emergencyContacts.parent2_telegram_id}
                onChange={(e) =>
                  setEmergencyContacts({
                    ...emergencyContacts,
                    parent2_telegram_id: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {emergencyContacts.parent2_telegram_id && (
                <button
                  type="button"
                  onClick={() =>
                    handleTestTelegram(emergencyContacts.parent2_telegram_id)
                  }
                  disabled={loading}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                >
                  Test Connection
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Guardian/Emergency Contact Telegram ID (Optional)
              </label>
              <input
                type="text"
                placeholder="Enter Guardian Telegram ID"
                value={emergencyContacts.guardian_telegram_id}
                onChange={(e) =>
                  setEmergencyContacts({
                    ...emergencyContacts,
                    guardian_telegram_id: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {emergencyContacts.guardian_telegram_id && (
                <button
                  type="button"
                  onClick={() =>
                    handleTestTelegram(emergencyContacts.guardian_telegram_id)
                  }
                  disabled={loading}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                >
                  Test Connection
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {loading ? "Saving..." : "Save Emergency Contacts"}
            </button>
          </form>
        </div>
      )}

      {/* Send SOS Form */}
      {showSendSOS && (
        <div className="bg-white border border-red-300 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Send SOS Alert
          </h3>

          <form onSubmit={handleSendSOS} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSeverity(level)}
                    className={`p-2 rounded-lg font-semibold text-sm transition ${
                      severity === level
                        ? getSeverityColor(level) + " border-2"
                        : "bg-gray-100 text-gray-700 border-2 border-transparent"
                    }`}
                  >
                    {getSeverityEmoji(level)} {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Message (Optional)
              </label>
              <textarea
                placeholder="Describe your emergency... (Leave blank for default message)"
                value={sosMessage}
                onChange={(e) => setSOSMessage(e.target.value)}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none h-24"
              />
              <p className="text-xs text-gray-500 mt-1">
                {sosMessage.length}/500 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
                <MapPin className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700 flex-1">
                  {location.address}
                </span>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={loading}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  Update Location
                </button>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                <strong>⚠️ Warning:</strong> SOS alerts will be sent to all
                configured emergency contacts immediately.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-semibold transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {loading ? "Sending SOS..." : "Send SOS Alert Now"}
              </button>
              <button
                type="button"
                onClick={() => setShowSendSOS(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SOS History */}
      {sosHistory.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Recent SOS Alerts
          </h3>
          <div className="space-y-3">
            {sosHistory.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-l-4 ${getSeverityColor(
                  alert.severity
                )}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold flex items-center gap-2">
                    {getSeverityEmoji(alert.severity)} {alert.severity}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm mb-2">{alert.message}</p>
                <div className="text-xs flex gap-4">
                  <span>📤 Sent to: {alert.recipients_count}</span>
                  <span>✅ Delivered: {alert.successful_count}</span>
                  {alert.failed_count > 0 && (
                    <span>❌ Failed: {alert.failed_count}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SOSFeature;
