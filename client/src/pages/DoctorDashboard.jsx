import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";

export default function DoctorDashboard() {
  const { user } = useAuth();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Doctor Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Welcome, Dr. {user?.name || "Doctor"}. Manage your live consultations.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Start Receiving Video Calls
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Go online as a doctor and receive incoming patient call invites.
          </p>
          <Link
            to="/video-call?role=doctor"
            className="inline-flex px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            Open Video Console
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Voice Consultation Workspace
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Review consultation context before joining a live call.
          </p>
          <Link
            to="/voice-consultation"
            className="inline-flex px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Open Voice Consultation
          </Link>
        </div>
      </div>
    </div>
  );
}
