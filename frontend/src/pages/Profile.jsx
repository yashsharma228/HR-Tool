import { useState } from "react";
import useAuth from "../hooks/useAuth";
import { showToast } from "../components/Toast";
import { updateProfile } from "../services/api";

export default function Profile() {
  const { user, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    dateOfJoining: user?.dateOfJoining || "",
    role: user?.role || "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(form);
      await refreshProfile();
      showToast("Profile updated");
    } catch (err) {
      showToast(err.response?.data?.message || "Update failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">My Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" name="name" placeholder="Full Name" required className="w-full border px-3 py-2 rounded" value={form.name} onChange={handleChange} />
        <input type="email" name="email" placeholder="Email" required className="w-full border px-3 py-2 rounded" value={form.email} onChange={handleChange} />
        <input type="date" name="dateOfJoining" placeholder="Date of Joining" required className="w-full border px-3 py-2 rounded" value={form.dateOfJoining} onChange={handleChange} />
        <input type="text" name="role" disabled className="w-full border px-3 py-2 rounded bg-gray-100" value={form.role} />
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
