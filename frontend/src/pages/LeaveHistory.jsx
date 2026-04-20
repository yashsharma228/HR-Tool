import { useEffect, useState, useRef } from "react";
import { getMyLeaves } from "../services/api";
import Loader from "../components/Loader";
import { showToast } from "../components/Toast";

export default function LeaveHistory() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const prevStatuses = useRef({});

  useEffect(() => {
    const fetchLeaves = () => {
      setLoading(true);
      getMyLeaves()
        .then((res) => {
          setLeaves(res.data);
          // Notification for status change
          if (res.data && res.data.length > 0) {
            res.data.forEach((leave) => {
              const prev = prevStatuses.current[leave._id];
              if (prev && prev !== leave.status && leave.status !== "Pending") {
                showToast(`Your leave (${leave.startDate?.slice(0,10)} - ${leave.endDate?.slice(0,10)}) was ${leave.status.toLowerCase()}.`);
              }
              prevStatuses.current[leave._id] = leave.status;
            });
          }
        })
        .catch(() => setLeaves([]))
        .finally(() => setLoading(false));
    };
    fetchLeaves();
    // Removed auto-refresh logic to prevent automatic page reload or data refresh
    // eslint-disable-next-line
  }, []);

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Leave History</h2>
      {loading ? (
        <Loader />
      ) : leaves.length === 0 ? (
        <div>No leave applications found.</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Type</th>
              <th className="p-2 border">Start</th>
              <th className="p-2 border">End</th>
              <th className="p-2 border">Reason</th>
              <th className="p-2 border">Status</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map((leave) => (
              <tr key={leave._id}>
                <td className="p-2 border">{leave.leaveType}</td>
                <td className="p-2 border">{leave.startDate?.slice(0,10)}</td>
                <td className="p-2 border">{leave.endDate?.slice(0,10)}</td>
                <td className="p-2 border">{leave.reason}</td>
                <td className="p-2 border capitalize">{leave.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

