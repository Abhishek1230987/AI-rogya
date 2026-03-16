import React from "react";

export default function Toast({ message, actionLabel, onAction, onClose }) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3">
        <div className="text-sm">{message}</div>
        {actionLabel && (
          <button
            onClick={onAction}
            className="text-sm bg-white text-gray-900 px-2 py-1 rounded mr-2"
          >
            {actionLabel}
          </button>
        )}
        <button
          onClick={onClose}
          className="text-sm text-gray-300 hover:text-white"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
