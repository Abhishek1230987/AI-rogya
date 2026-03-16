import { useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const SOSSetupGuide = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [telegramIds, setTelegramIds] = useState({
    parent1_telegram_id: "",
    parent2_telegram_id: "",
    guardian_telegram_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState({});

  const handleIdChange = (field, value) => {
    setTelegramIds((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveEmergencyContacts = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:5000/api/sos/update-contacts",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(telegramIds),
        }
      );

      const data = await response.json();

      if (data.success) {
        setSuccess("✅ Emergency contacts saved successfully!");
        setStep(3);
      } else {
        setError(data.message || "Failed to save contacts");
      }
    } catch (err) {
      setError("Error saving contacts: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const testTelegramConnection = async (telegramId, name) => {
    try {
      setTesting(true);
      const response = await fetch(
        "http://localhost:5000/api/sos/test-telegram",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ telegramId }),
        }
      );

      const data = await response.json();

      setTestResults((prev) => ({
        ...prev,
        [name]: data.success,
      }));

      if (data.success) {
        setSuccess(` Test message sent to ${name}!`);
      } else {
        setError(` Failed to send test message to ${name}`);
      }
    } catch (err) {
      setError("Error testing connection: " + err.message);
    } finally {
      setTesting(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Please login first</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-8">
          <h1 className="text-3xl font-bold text-white">🚨 SOS Setup Guide</h1>
          <p className="text-red-100 mt-2">
            Configure emergency contacts for SOS alerts
          </p>
        </div>

        {/* Steps Indicator */}
        <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {[
              { num: 1, title: "Get Telegram IDs" },
              { num: 2, title: "Enter IDs" },
              { num: 3, title: "Test & Verify" },
              { num: 4, title: "Done!" },
            ].map((s) => (
              <div key={s.num} className="flex-1 flex items-center">
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    step >= s.num
                      ? "bg-red-600 text-white"
                      : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                  }`}
                  animate={{ scale: step === s.num ? 1.1 : 1 }}
                >
                  {s.num}
                </motion.div>
                <div className="ml-2">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    {s.title}
                  </p>
                </div>
                {s.num < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded ${
                      step > s.num
                        ? "bg-red-600"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Instructions */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Step 1: Get Telegram Chat IDs
              </h2>

              <div className="space-y-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                    📱 For Each Emergency Contact:
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-300 text-sm">
                    <li>Open Telegram app on their phone</li>
                    <li>
                      Search for:{" "}
                      <code className="bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded">
                        @userinfobot
                      </code>
                    </li>
                    <li>Send any message (e.g., "hi")</li>
                    <li>Bot will reply with their info</li>
                    <li>
                      Look for:{" "}
                      <code className="bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded">
                        Your user id: 123456789
                      </code>
                    </li>
                    <li>Copy that number (this is their Telegram Chat ID)</li>
                  </ol>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700">
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                    Need more help?
                  </h3>
                  <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                    You need Telegram IDs for parents/guardians who will receive
                    emergency alerts. Get them to search for @userinfobot and
                    send you their chat ID number.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                Next: Enter Telegram IDs →
              </button>
            </motion.div>
          )}

          {/* Step 2: Enter IDs */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Step 2: Enter Telegram IDs
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Parent 1 Telegram ID (Required)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 123456789"
                    value={telegramIds.parent1_telegram_id}
                    onChange={(e) =>
                      handleIdChange("parent1_telegram_id", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Parent 2 Telegram ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 987654321"
                    value={telegramIds.parent2_telegram_id}
                    onChange={(e) =>
                      handleIdChange("parent2_telegram_id", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Guardian Telegram ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 555555555"
                    value={telegramIds.guardian_telegram_id}
                    onChange={(e) =>
                      handleIdChange("guardian_telegram_id", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 p-4 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={saveEmergencyContacts}
                  disabled={!telegramIds.parent1_telegram_id || loading}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save & Continue →"
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Test & Verify */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Step 3: Test Telegram Connection
              </h2>

              <div className="space-y-4 mb-6">
                {success && (
                  <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200 p-4 rounded-lg">
                    {success}
                  </div>
                )}

                {Object.entries(telegramIds)
                  .filter(([, value]) => value)
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {key === "parent1_telegram_id"
                              ? "Parent 1"
                              : key === "parent2_telegram_id"
                              ? "Parent 2"
                              : "Guardian"}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            ID: {value}
                          </p>
                        </div>
                        {testResults[key] ? (
                          <CheckCircleIcon className="h-6 w-6 text-green-500" />
                        ) : testResults[key] === false ? (
                          <XCircleIcon className="h-6 w-6 text-red-500" />
                        ) : (
                          <button
                            onClick={() =>
                              testTelegramConnection(
                                value,
                                key === "parent1_telegram_id"
                                  ? "Parent 1"
                                  : key === "parent2_telegram_id"
                                  ? "Parent 2"
                                  : "Guardian"
                              )
                            }
                            disabled={testing}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded transition-colors"
                          >
                            {testing ? "Testing..." : "Send Test"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Next: Finish →
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                All Set!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Your emergency contacts are configured. You can now send SOS
                alerts!
              </p>

              <div className="bg-green-50 dark:bg-green-900/30 p-6 rounded-lg mb-8 border border-green-200 dark:border-green-700">
                <p className="text-green-900 dark:text-green-100 font-semibold mb-2">
                  🚨 To Send SOS Alert:
                </p>
                <ol className="text-left text-green-800 dark:text-green-300 space-y-1 text-sm">
                  <li>1. Look for red 🚨 button in navbar</li>
                  <li>2. Click to open SOS modal</li>
                  <li>3. Choose severity level</li>
                  <li>4. Type message (optional)</li>
                  <li>5. Record voice (optional)</li>
                  <li>6. Click "Send SOS"</li>
                </ol>
              </div>

              <button
                onClick={() => (window.location.href = "/dashboard")}
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                Go to Dashboard
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SOSSetupGuide;
