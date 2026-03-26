import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function DoctorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { loginDoctor } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await loginDoctor(email, password);
    } catch (err) {
      setError(err.message || "Unable to login as doctor");
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
        <div className="text-center mb-4">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
          Doctor Login
        </h2>
        <p className="text-center text-sm text-gray-600 dark:text-gray-300 mb-6">
          Access video consultation dashboard as a verified doctor.
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="doctor-email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email
            </label>
            <input
              id="doctor-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="doctor-password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <input
              id="doctor-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            Login as Doctor
          </button>
        </form>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-5 text-center">
          Are you a patient?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Use patient login
          </Link>
        </p>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          New doctor?{" "}
          <Link to="/doctor-register" className="text-blue-600 hover:underline">
            Register with invite code
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
