import { useEffect, useState } from "react";
import { getMyAttendance } from "../services/api";
import AttendanceCalendar from "./AttendanceCalendar";

export default function NavbarAttendanceCalendar() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch attendance data
  const fetchAttendanceData = () => {
    setLoading(true);
    getMyAttendance()
      .then((res) => setAttendance(res.data))
      .catch(() => setAttendance([]))
      .finally(() => setLoading(false));
  };

  // Removed auto-fetch and auto-refresh logic to prevent automatic page reload or data refresh

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-2">Attendance Calendar</h3>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <AttendanceCalendar attendanceData={attendance} />
      )}
    </div>
  );
}
