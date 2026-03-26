import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function DoctorRegister() {
  const { registerDoctor } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await registerDoctor(name, email, password, inviteCode);
    } catch (err) {
      setError(err.message || "Unable to register doctor account");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full"
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
          Doctor Registration
        </h2>
        <p className="text-center text-sm text-gray-600 dark:text-gray-300 mb-6">
          Create a doctor account with your invite code.
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Doctor email"
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white"
          />
          <input
            type="text"
            required
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Doctor invite code"
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white"
          />

          <button
            type="submit"
            className="w-full py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            Register as Doctor
          </button>
        </form>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
          Already have an account?{" "}
          <Link to="/doctor-login" className="text-blue-600 hover:underline">
            Doctor login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
