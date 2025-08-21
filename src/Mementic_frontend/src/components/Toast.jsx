import React from "react";

export const Toast = ({ toast, onDismiss }) => {
  const getVariantClasses = (variant) => {
    switch (variant) {
      case "destructive":
        return "bg-red-100 border-red-400 text-red-800";
      case "success":
        return "bg-green-100 border-green-400 text-green-800";
      case "warning":
        return "bg-yellow-100 border-yellow-400 text-yellow-800";
      default:
        return "bg-blue-100 border-blue-400 text-blue-800";
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 p-4 border rounded-lg shadow-lg max-w-sm z-50 ${getVariantClasses(
        toast.variant
      )}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {toast.title && (
            <h4 className="font-semibold text-sm mb-1">{toast.title}</h4>
          )}
          {toast.description && (
            <p className="text-sm opacity-90">{toast.description}</p>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="ml-4 text-gray-500 hover:text-gray-700 text-lg font-bold"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export const ToastContainer = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
