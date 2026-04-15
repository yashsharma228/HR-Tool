import { useState } from "react";
import { getAllAttendance, getAllLeaves } from "../services/api";
import { showToast } from "../components/Toast";

function convertToCSV(data, columns) {
  const header = columns.join(",");
  const rows = data.map(row => columns.map(col => row[col] || "").join(","));
  return [header, ...rows].join("\n");
}

function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportData() {
  const [loading, setLoading] = useState(false);

  // Polling: auto-refresh attendance and leaves data every 10 seconds (if needed for UI)
  // If you want to keep the latest data for export, you can fetch and store it here.
  // Example:
  // const [attendance, setAttendance] = useState([]);
  // const [leaves, setLeaves] = useState([]);
  // useEffect(() => {
  //   const fetchAll = () => {
  //     getAllAttendance().then(res => setAttendance(res.data)).catch(() => {});
  //     getAllLeaves().then(res => setLeaves(res.data)).catch(() => {});
  //   };
  //   fetchAll();
  //   const interval = setInterval(fetchAll, 10000);
  //   return () => clearInterval(interval);
  // }, []);

  const handleExportAttendance = async () => {
    setLoading(true);
    try {
      const { data } = await getAllAttendance();
      const columns = ["userId", "date", "status"];
      const csv = convertToCSV(data, columns);
      downloadCSV("attendance.csv", csv);
      showToast("Attendance exported as CSV");
    } catch (err) {
      showToast("Failed to export attendance", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExportLeaves = async () => {
    setLoading(true);
    try {
      const { data } = await getAllLeaves();
      const columns = ["userId", "leaveType", "startDate", "endDate", "status", "reason"];
      const csv = convertToCSV(data, columns);
      downloadCSV("leaves.csv", csv);
      showToast("Leaves exported as CSV");
    } catch (err) {
      showToast("Failed to export leaves", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Export Data</h2>
      <button
        onClick={handleExportAttendance}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 mb-4"
      >
        {loading ? "Exporting..." : "Export Attendance as CSV"}
      </button>
      <button
        onClick={handleExportLeaves}
        disabled={loading}
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
      >
        {loading ? "Exporting..." : "Export Leaves as CSV"}
      </button>
    </div>
  );
}
