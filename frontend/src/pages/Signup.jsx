import { useState } from "react";
import { registerUser } from "../services/api";
import useAuth from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { showToast } from "../components/Toast";

export default function Signup() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    dateOfJoining: "",
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await registerUser(form);
      login(data.user, data.token);
      showToast("Signup successful");
      navigate("/employee");
    } catch (err) {
      showToast(err.response?.data?.message || "Signup failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Signup</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" name="name" placeholder="Name" required className="w-full border px-3 py-2 rounded"
          value={form.name} onChange={handleChange} />
        <input type="email" name="email" placeholder="Email" required className="w-full border px-3 py-2 rounded"
          value={form.email} onChange={handleChange} />
        <input type="password" name="password" placeholder="Password" required className="w-full border px-3 py-2 rounded"
          value={form.password} onChange={handleChange} />
        <input type="date" name="dateOfJoining" required className="w-full border px-3 py-2 rounded"
          value={form.dateOfJoining} onChange={handleChange} />
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          {loading ? "Signing up..." : "Signup"}
        </button>
      </form>
    </div>
  );
}
