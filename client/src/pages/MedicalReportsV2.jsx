import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import AnimatedButton from "../components/AnimatedButton";
import { useTheme } from "../contexts/ThemeContext";

const API_BASE = "http://localhost:5000/api/medical-reports";

export default function MedicalReportsV2() {
  const { isDarkMode } = useTheme();
  const [files, setFiles] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [lastUploadAnalysis, setLastUploadAnalysis] = useState(null);

  // Get auth token
  const getToken = () => sessionStorage.getItem("token") || localStorage.getItem("token");

  // Fetch reports on mount
  useEffect(() => {
    fetchReports();
  }, []);

  // Fetch all reports
  const fetchReports = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/list`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch reports");
      }

      const data = await response.json();
      if (data.success) {
        setReports(data.reports || []);
        console.log("✅ Loaded", data.reports?.length || 0, "reports");
      }
    } catch (err) {
      console.error("❌ Error fetching reports:", err);
      setError("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
    setError("");
  };

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files || []);
    setFiles(droppedFiles);
    setError("");
  };

  // Upload files
  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select a file to upload");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        console.log("📤 Uploading:", file.name);

        const response = await fetch(`${API_BASE}/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.message || "Upload failed");
        }

        if (data.success) {
          console.log("✅ Upload successful:", data.report.fileName);
          setSuccess(`Successfully uploaded: ${file.name}`);
          setFiles([]);

          // Store the analysis from the response
          if (data.report.analysis) {
            setLastUploadAnalysis(data.report.analysis);
          }

          // Refresh reports
          await fetchReports();
        }
      } catch (err) {
        console.error("❌ Upload error:", err);
        setError(err.message || "Upload failed");
      }
    }

    setUploading(false);
  };

  // Delete report
  const handleDelete = async (reportId, fileName) => {
    if (!window.confirm(`Delete "${fileName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/${reportId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Delete failed");
      }

      if (data.success) {
        console.log("✅ Deleted report:", reportId);
        setSuccess("Report deleted successfully");
        await fetchReports();
      }
    } catch (err) {
      console.error("❌ Delete error:", err);
      setError(err.message || "Delete failed");
    }
  };

  // Download report
  const handleDownload = async (reportId, fileName) => {
    try {
      console.log("⬇️ Downloading:", fileName);

      // Fetch the file with authorization
      const response = await fetch(`${API_BASE}/download/${reportId}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error("Download failed");
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || "report";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess("Report downloaded successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("❌ Download error:", err);
      setError("Download failed");
    }
  };

  return (
    <div
      className={`min-h-screen p-6 transition-colors duration-300 ${
        isDarkMode
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
          : "bg-gradient-to-br from-blue-50 to-indigo-100"
      }`}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <motion.div initial={{ y: -20 }} animate={{ y: 0 }} className="mb-8">
          <h1
            className={`text-4xl font-bold mb-2 transition-colors duration-300 ${
              isDarkMode ? "text-white" : "text-gray-800"
            }`}
          >
            📋 Medical Reports
          </h1>
          <p
            className={`transition-colors duration-300 ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Upload and manage your medical documents
          </p>
        </motion.div>

        {/* Alert Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 border transition-colors duration-300 ${
              isDarkMode
                ? "bg-red-900/20 border-red-700/50 text-red-200"
                : "bg-red-100 border-red-300 text-red-700"
            }`}
          >
            <ExclamationTriangleIcon
              className={`w-5 h-5 ${
                isDarkMode ? "text-red-400" : "text-red-600"
              }`}
            />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 border transition-colors duration-300 ${
              isDarkMode
                ? "bg-green-900/20 border-green-700/50 text-green-200"
                : "bg-green-100 border-green-300 text-green-700"
            }`}
          >
            <CheckCircleIcon
              className={`w-5 h-5 ${
                isDarkMode ? "text-green-400" : "text-green-600"
              }`}
            />
            <span>{success}</span>
          </motion.div>
        )}

        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-lg shadow-lg p-8 mb-8 transition-colors duration-300 ${
            isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-white"
          }`}
        >
          <h2
            className={`text-2xl font-bold mb-6 transition-colors duration-300 ${
              isDarkMode ? "text-white" : "text-gray-800"
            }`}
          >
            Upload New Report
          </h2>

          {/* Drag and Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              dragActive
                ? isDarkMode
                  ? "border-blue-400 bg-blue-900/20"
                  : "border-indigo-500 bg-indigo-50"
                : isDarkMode
                  ? "border-gray-600 bg-gray-700/50 hover:border-blue-400"
                  : "border-gray-300 bg-gray-50 hover:border-indigo-400"
            }`}
          >
            <CloudArrowUpIcon
              className={`w-12 h-12 mx-auto mb-4 ${
                isDarkMode ? "text-blue-400" : "text-indigo-600"
              }`}
            />
            <p
              className={`font-semibold mb-2 transition-colors duration-300 ${
                isDarkMode ? "text-white" : "text-gray-700"
              }`}
            >
              Drag and drop your file here
            </p>
            <p
              className={`text-sm mb-4 transition-colors duration-300 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              or
            </p>
            <label className="cursor-pointer">
              <span
                className={`px-6 py-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                Select File
              </span>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.txt"
                className="hidden"
              />
            </label>
            <p
              className={`text-xs mt-4 transition-colors duration-300 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Supported: JPG, PNG, PDF, DOC, DOCX, TXT (Max 10MB)
            </p>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="mt-6">
              <h3
                className={`font-semibold mb-3 transition-colors duration-300 ${
                  isDarkMode ? "text-gray-200" : "text-gray-700"
                }`}
              >
                Selected Files ({files.length})
              </h3>
              <div className="space-y-2">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded transition-colors duration-300 ${
                      isDarkMode
                        ? "bg-gray-700 text-gray-200"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    <DocumentTextIcon
                      className={`w-5 h-5 ${
                        isDarkMode ? "text-blue-400" : "text-indigo-600"
                      }`}
                    />
                    <span>{file.name}</span>
                    <span
                      className={`text-sm transition-colors duration-300 ${
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="mt-6">
            <AnimatedButton
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                isDarkMode
                  ? "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400"
              }`}
            >
              {uploading ? "Uploading..." : "Upload File"}
            </AnimatedButton>
          </div>
        </motion.div>

        {/* Analysis Section - Display extracted medical data */}
        {lastUploadAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-lg shadow-lg p-8 mb-8 border transition-colors duration-300 ${
              isDarkMode
                ? "bg-gradient-to-r from-gray-800 to-gray-700/80 border-gray-600"
                : "bg-gradient-to-r from-blue-50 to-indigo-50 border-indigo-200"
            }`}
          >
            <div className="flex items-center gap-3 mb-6">
              <SparklesIcon
                className={`w-6 h-6 ${
                  isDarkMode ? "text-blue-400" : "text-indigo-600"
                }`}
              />
              <h2
                className={`text-2xl font-bold transition-colors duration-300 ${
                  isDarkMode ? "text-white" : "text-gray-800"
                }`}
              >
                📊 Extracted Medical Information
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Patient Information */}
              {lastUploadAnalysis.patientInfo && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`rounded-lg p-4 shadow border-l-4 transition-colors duration-300 ${
                    isDarkMode
                      ? "bg-gray-700 border-blue-400 text-gray-100"
                      : "bg-white border-blue-500"
                  }`}
                >
                  <h3
                    className={`font-semibold mb-3 text-lg ${
                      isDarkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    👤 Patient Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    {lastUploadAnalysis.patientInfo.name && (
                      <p>
                        <span
                          className={`font-medium ${
                            isDarkMode ? "text-blue-300" : "text-gray-700"
                          }`}
                        >
                          Name:
                        </span>{" "}
                        <span
                          className={
                            isDarkMode ? "text-gray-300" : "text-gray-600"
                          }
                        >
                          {lastUploadAnalysis.patientInfo.name}
                        </span>
                      </p>
                    )}
                    {lastUploadAnalysis.patientInfo.id && (
                      <p>
                        <span
                          className={`font-medium ${
                            isDarkMode ? "text-blue-300" : "text-gray-700"
                          }`}
                        >
                          ID:
                        </span>{" "}
                        <span
                          className={
                            isDarkMode ? "text-gray-300" : "text-gray-600"
                          }
                        >
                          {lastUploadAnalysis.patientInfo.id}
                        </span>
                      </p>
                    )}
                    {lastUploadAnalysis.patientInfo.age && (
                      <p>
                        <span
                          className={`font-medium ${
                            isDarkMode ? "text-blue-300" : "text-gray-700"
                          }`}
                        >
                          Age:
                        </span>{" "}
                        <span
                          className={
                            isDarkMode ? "text-gray-300" : "text-gray-600"
                          }
                        >
                          {lastUploadAnalysis.patientInfo.age}
                        </span>
                      </p>
                    )}
                    {lastUploadAnalysis.patientInfo.dob && (
                      <p>
                        <span
                          className={`font-medium ${
                            isDarkMode ? "text-blue-300" : "text-gray-700"
                          }`}
                        >
                          DOB:
                        </span>{" "}
                        <span
                          className={
                            isDarkMode ? "text-gray-300" : "text-gray-600"
                          }
                        >
                          {lastUploadAnalysis.patientInfo.dob}
                        </span>
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Conditions/Diagnoses */}
              {lastUploadAnalysis.conditions &&
                lastUploadAnalysis.conditions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`rounded-lg p-4 shadow border-l-4 transition-colors duration-300 ${
                      isDarkMode
                        ? "bg-gray-700 border-red-400 text-gray-100"
                        : "bg-white border-red-500"
                    }`}
                  >
                    <h3
                      className={`font-semibold mb-3 text-lg ${
                        isDarkMode ? "text-white" : "text-gray-800"
                      }`}
                    >
                      🏥 Conditions
                    </h3>
                    <div className="space-y-2 text-sm">
                      {lastUploadAnalysis.conditions.map((condition, idx) => {
                        // Handle both string and object formats
                        let displayText = "";
                        if (typeof condition === "string") {
                          displayText = condition;
                        } else if (
                          typeof condition === "object" &&
                          condition !== null
                        ) {
                          // Format object: "Condition Name (severity)"
                          const name =
                            condition.name ||
                            condition.condition ||
                            "Unknown Condition";
                          const severity = condition.severity
                            ? ` (${condition.severity})`
                            : "";
                          displayText = `${name}${severity}`;
                        }

                        return (
                          <div
                            key={idx}
                            className={`flex items-center gap-2 p-2 rounded ${
                              isDarkMode
                                ? "bg-red-900/20 text-red-200"
                                : "bg-red-50"
                            }`}
                          >
                            <span
                              className={
                                isDarkMode ? "text-red-400" : "text-red-500"
                              }
                            >
                              •
                            </span>
                            <span
                              className={
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }
                            >
                              {displayText}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

              {/* Medications */}
              {lastUploadAnalysis.medications &&
                lastUploadAnalysis.medications.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`rounded-lg p-4 shadow border-l-4 ${
                      isDarkMode
                        ? "bg-gray-700 border-green-400 text-white"
                        : "bg-white border-green-500"
                    }`}
                  >
                    <h3
                      className={`font-semibold mb-3 text-lg ${
                        isDarkMode ? "text-white" : "text-gray-800"
                      }`}
                    >
                      💊 Medications
                    </h3>
                    <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
                      {lastUploadAnalysis.medications.map((med, idx) => {
                        // Handle both string and object formats
                        let displayText = "";
                        if (typeof med === "string") {
                          displayText = med;
                        } else if (typeof med === "object" && med !== null) {
                          // Format object: "Drug Name: dosage, frequency"
                          const drugName =
                            med.name || med.drugName || "Unknown Drug";
                          const dosage = med.dosage ? ` - ${med.dosage}` : "";
                          const frequency = med.frequency
                            ? `, ${med.frequency}`
                            : "";
                          displayText = `${drugName}${dosage}${frequency}`;
                        }

                        return (
                          <div
                            key={idx}
                            className={`flex items-start gap-2 p-2 rounded ${
                              isDarkMode
                                ? "bg-green-900/20 text-green-200"
                                : "bg-green-50"
                            }`}
                          >
                            <span
                              className={
                                isDarkMode ? "text-green-400" : "text-green-500"
                              }
                            >
                              •
                            </span>
                            <span
                              className={
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }
                            >
                              {displayText}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

              {/* Vital Signs */}
              {lastUploadAnalysis.vitals &&
                lastUploadAnalysis.vitals.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`rounded-lg p-4 shadow border-l-4 ${
                      isDarkMode
                        ? "bg-gray-700 border-yellow-400 text-white"
                        : "bg-white border-yellow-500"
                    }`}
                  >
                    <h3
                      className={`font-semibold mb-3 text-lg ${
                        isDarkMode ? "text-white" : "text-gray-800"
                      }`}
                    >
                      ❤️ Vital Signs
                    </h3>
                    <div className="space-y-2 text-sm">
                      {lastUploadAnalysis.vitals.map((vital, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-2 rounded ${
                            isDarkMode
                              ? "bg-yellow-900/20 text-yellow-200"
                              : "bg-yellow-50"
                          }`}
                        >
                          <span
                            className={
                              isDarkMode ? "text-gray-300" : "text-gray-700"
                            }
                          >
                            {vital}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

              {/* Lab Results */}
              {lastUploadAnalysis.labResults &&
                lastUploadAnalysis.labResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`rounded-lg p-4 shadow border-l-4 ${
                      isDarkMode
                        ? "bg-gray-700 border-purple-400 text-white"
                        : "bg-white border-purple-500"
                    }`}
                  >
                    <h3
                      className={`font-semibold mb-3 text-lg ${
                        isDarkMode ? "text-white" : "text-gray-800"
                      }`}
                    >
                      🧪 Lab Results
                    </h3>
                    <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
                      {lastUploadAnalysis.labResults.map((result, idx) => {
                        // Handle both string and object formats
                        let displayText = "";
                        if (typeof result === "string") {
                          displayText = result;
                        } else if (
                          typeof result === "object" &&
                          result !== null
                        ) {
                          // Format object: "Test Name: value units (Normal: range)"
                          const testName = result.testName || "Unknown Test";
                          const value = result.value || "N/A";
                          const unit = result.unit ? ` ${result.unit}` : "";
                          const range = result.referenceRange
                            ? ` (Normal: ${result.referenceRange})`
                            : "";
                          displayText = `${testName}: ${value}${unit}${range}`;
                        }

                        return (
                          <div
                            key={idx}
                            className={`flex items-start gap-2 p-2 rounded ${
                              isDarkMode
                                ? "bg-purple-900/20 text-purple-200"
                                : "bg-purple-50"
                            }`}
                          >
                            <span
                              className={
                                isDarkMode
                                  ? "text-purple-400"
                                  : "text-purple-500"
                              }
                            >
                              •
                            </span>
                            <span
                              className={
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }
                            >
                              {displayText}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

              {/* Doctor Information */}
              {lastUploadAnalysis.doctorName && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`rounded-lg p-4 shadow border-l-4 ${
                    isDarkMode
                      ? "bg-gray-700 border-indigo-400 text-white"
                      : "bg-white border-indigo-500"
                  }`}
                >
                  <h3
                    className={`font-semibold mb-3 text-lg ${
                      isDarkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    👨‍⚕️ Doctor Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span
                        className={`font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Name:
                      </span>{" "}
                      <span
                        className={
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }
                      >
                        {lastUploadAnalysis.doctorName}
                      </span>
                    </p>
                    {lastUploadAnalysis.facility && (
                      <p>
                        <span
                          className={`font-medium ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Facility:
                        </span>{" "}
                        <span
                          className={
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }
                        >
                          {lastUploadAnalysis.facility}
                        </span>
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Report Type */}
              {lastUploadAnalysis.reportType && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`rounded-lg p-4 shadow border-l-4 ${
                    isDarkMode
                      ? "bg-gray-700 border-orange-400 text-white"
                      : "bg-white border-orange-500"
                  }`}
                >
                  <h3
                    className={`font-semibold mb-3 text-lg ${
                      isDarkMode ? "text-white" : "text-gray-800"
                    }`}
                  >
                    📄 Report Type
                  </h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        isDarkMode
                          ? "bg-orange-900/30 text-orange-300"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {lastUploadAnalysis.reportType}
                    </span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Key Findings */}
            {lastUploadAnalysis.keyFindings && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`mt-6 rounded-lg p-4 shadow border-l-4 ${
                  isDarkMode
                    ? "bg-gray-700 border-cyan-400 text-white"
                    : "bg-white border-cyan-500"
                }`}
              >
                <h3
                  className={`font-semibold mb-3 text-lg ${
                    isDarkMode ? "text-white" : "text-gray-800"
                  }`}
                >
                  🔍 Key Findings
                </h3>
                <p
                  className={`leading-relaxed ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {lastUploadAnalysis.keyFindings}
                </p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Reports List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-lg shadow-lg p-8 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          <h2
            className={`text-2xl font-bold mb-6 ${
              isDarkMode ? "text-white" : "text-gray-800"
            }`}
          >
            Your Reports ({reports.length})
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                Loading reports...
              </p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon
                className={`w-12 h-12 mx-auto mb-4 ${
                  isDarkMode ? "text-gray-500" : "text-gray-300"
                }`}
              />
              <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                No reports yet. Upload one to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() =>
                    setSelectedReport(
                      selectedReport?.id === report.id ? null : report,
                    )
                  }
                  className={`p-4 rounded-lg hover:shadow-md transition-all cursor-pointer border ${
                    isDarkMode
                      ? "border-gray-600 bg-gray-700"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  {/* Report Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <DocumentTextIcon
                        className={`w-8 h-8 ${
                          isDarkMode ? "text-indigo-400" : "text-indigo-600"
                        }`}
                      />
                      <div className="flex-1">
                        <p
                          className={`font-semibold ${
                            isDarkMode ? "text-white" : "text-gray-800"
                          }`}
                        >
                          {report.fileName}
                        </p>
                        <p
                          className={`text-sm ${
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          {(report.fileSize / 1024 / 1024).toFixed(2)} MB •{" "}
                          {new Date(report.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(report.id, report.fileName);
                        }}
                        className={`p-2 rounded transition-colors ${
                          isDarkMode
                            ? "text-blue-400 hover:bg-blue-900/20"
                            : "text-blue-600 hover:bg-blue-100"
                        }`}
                        title="Download"
                      >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(report.id, report.fileName);
                        }}
                        className={`p-2 rounded transition-colors ${
                          isDarkMode
                            ? "text-red-400 hover:bg-red-900/20"
                            : "text-red-600 hover:bg-red-100"
                        }`}
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Report Details */}
                  {selectedReport?.id === report.id && report.analysis && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className={`mt-4 pt-4 grid grid-cols-2 gap-4 text-sm border-t ${
                        isDarkMode ? "border-gray-600" : "border-gray-200"
                      }`}
                    >
                      {report.analysis.analysis && (
                        <>
                          <div>
                            <p
                              className={`font-semibold ${
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              Patient Info
                            </p>
                            <p
                              className={
                                isDarkMode ? "text-gray-400" : "text-gray-600"
                              }
                            >
                              {report.analysis.analysis.patientInfo?.name}
                            </p>
                          </div>
                          <div>
                            <p
                              className={`font-semibold ${
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              Conditions
                            </p>
                            <p
                              className={
                                isDarkMode ? "text-gray-400" : "text-gray-600"
                              }
                            >
                              {report.analysis.analysis.conditions?.join(
                                ", ",
                              ) || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p
                              className={`font-semibold ${
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              Medications
                            </p>
                            <p
                              className={
                                isDarkMode ? "text-gray-400" : "text-gray-600"
                              }
                            >
                              {report.analysis.analysis.medications?.[0] ||
                                "N/A"}
                            </p>
                          </div>
                          <div>
                            <p
                              className={`font-semibold ${
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              Status
                            </p>
                            <p
                              className={`flex items-center gap-1 ${
                                isDarkMode ? "text-green-400" : "text-green-600"
                              }`}
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                              Analyzed
                            </p>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
