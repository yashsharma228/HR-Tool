import { useState, useEffect } from "react";

let toastFn;
export function showToast(msg, type = "success") {
  if (toastFn) toastFn(msg, type);
}

export default function Toast() {
  const [toast, setToast] = useState({ msg: "", type: "success", show: false });

  useEffect(() => {
    toastFn = (msg, type) => {
      setToast({ msg, type, show: true });
      setTimeout(() => setToast((t) => ({ ...t, show: false })), 3000);
    };
  }, []);

  if (!toast.show) return null;
  return (
    <div className={`fixed top-4 right-4 px-4 py-2 rounded shadow-lg z-50
      ${toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
      {toast.msg}
    </div>
  );
}
