import React from "react";

export default function ContactModal({ open, onClose, hospital }) {
  if (!open || !hospital) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {hospital.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {hospital.address}
        </p>

        <div className="space-y-3 mb-4">
          <div>
            <span className="text-xs text-gray-500">Phone</span>
            <div className="text-sm mt-1">
              {hospital.phone ? (
                <a
                  href={`tel:${hospital.phone}`}
                  className="text-blue-600 dark:text-blue-400"
                >
                  {hospital.phone}
                </a>
              ) : (
                <span className="text-gray-500">Not available</span>
              )}
            </div>
          </div>

          <div>
            <span className="text-xs text-gray-500">Website</span>
            <div className="text-sm mt-1">
              {hospital.website ? (
                <a
                  href={hospital.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400"
                >
                  Open website
                </a>
              ) : (
                <span className="text-gray-500">Not available</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border">
            Close
          </button>
          {hospital.phone && (
            <a
              href={`tel:${hospital.phone}`}
              className="px-4 py-2 rounded-lg bg-green-600 text-white"
            >
              Dial
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
