import { useState } from "react";

export default function BookingModal({
  open,
  onClose,
  hospital,
  specialty,
  onBooked,
}) {
  const [patientName, setPatientName] = useState("");
  const [datetime, setDatetime] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!patientName || !datetime) return;
    setLoading(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospitalId: hospital.id,
          hospitalName: hospital.name,
          specialty,
          patientName,
          datetime,
          contact,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onBooked(data.appointment);
        onClose();
      } else {
        alert(data.message || "Failed to book appointment");
      }
    } catch (err) {
      console.error("Booking error", err);
      alert("Booking failed. See console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-2">Book Appointment</h3>
        <p className="text-sm text-gray-600 mb-4">
          {hospital.name} — {specialty}
        </p>

        <label className="block text-sm font-medium">Patient Name</label>
        <input
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          className="w-full p-2 border rounded mb-3"
        />

        <label className="block text-sm font-medium">Date & Time</label>
        <input
          type="datetime-local"
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
          className="w-full p-2 border rounded mb-3"
        />

        <label className="block text-sm font-medium">Contact (optional)</label>
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="w-full p-2 border rounded mb-3"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {loading ? "Booking..." : "Book"}
          </button>
        </div>
      </div>
    </div>
  );
}
