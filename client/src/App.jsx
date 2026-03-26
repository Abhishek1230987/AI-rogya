import { Routes, Route } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import DoctorLogin from "./pages/DoctorLogin.jsx";
import DoctorRegister from "./pages/DoctorRegister.jsx";
import Register from "./pages/Register.jsx";
import DoctorDashboard from "./pages/DoctorDashboard.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Consultation from "./pages/Consultation.jsx";
import BookAppointment from "./pages/BookAppointment.jsx";
import VideoCall from "./pages/VideoCall.jsx";
import VoiceConsultation from "./pages/VoiceConsultation.jsx";
import MedicalHistory from "./pages/MedicalHistory.jsx";
import MedicalReports from "./pages/MedicalReports.jsx";
import MedicalReportsV2 from "./pages/MedicalReportsV2.jsx";
import SOSSetup from "./pages/SOSSetup.jsx";
import AuthCallback from "./pages/AuthCallback.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="doctor-login" element={<DoctorLogin />} />
            <Route path="doctor-register" element={<DoctorRegister />} />
            <Route path="register" element={<Register />} />

            {/* Public Routes - No authentication required */}
            <Route path="consultation" element={<Consultation />} />

            {/* Protected Routes - Require Authentication */}
            <Route
              path="dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="book-appointment"
              element={
                <ProtectedRoute>
                  <BookAppointment />
                </ProtectedRoute>
              }
            />
            <Route
              path="voice-consultation"
              element={
                <ProtectedRoute>
                  <VoiceConsultation />
                </ProtectedRoute>
              }
            />
            <Route
              path="video-call"
              element={
                <ProtectedRoute>
                  <VideoCall />
                </ProtectedRoute>
              }
            />
            <Route
              path="doctor-dashboard"
              element={
                <ProtectedRoute requiredRole="doctor">
                  <DoctorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="medical-history"
              element={
                <ProtectedRoute>
                  <MedicalHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="medical-reports"
              element={
                <ProtectedRoute>
                  <MedicalReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="medical-reports-v2"
              element={
                <ProtectedRoute>
                  <MedicalReportsV2 />
                </ProtectedRoute>
              }
            />
            <Route
              path="sos-setup"
              element={
                <ProtectedRoute>
                  <SOSSetup />
                </ProtectedRoute>
              }
            />

            {/* Auth callback - no protection needed */}
            <Route path="auth/callback" element={<AuthCallback />} />
          </Route>
        </Routes>
      </AuthProvider>
    </I18nextProvider>
  );
}

export default App;
