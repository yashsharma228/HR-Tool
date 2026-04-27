import { useState } from "react";
import { registerUser } from "../services/api";
import useAuth from "../hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { showToast } from "../components/Toast";

export default function Signup() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    dateOfJoining: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await registerUser(form);
      login(data.user);
      showToast("Signup successful");
      navigate("/employee");
    } catch (err) {
      showToast(err.response?.data?.message || "Signup failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
        <div className="group inline-flex items-center gap-3 rounded-full border border-blue-200 bg-white/90 px-4 py-2 shadow-lg shadow-blue-100 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-200/60">
          <span className="h-3 w-3 animate-pulse rounded-full bg-blue-500 shadow-[0_0_18px_rgba(59,130,246,0.75)]"></span>
          <div>
            <p className="bg-linear-to-r from-blue-700 via-sky-500 to-cyan-400 bg-clip-text text-sm font-black uppercase tracking-[0.45em] text-transparent">
              HR TOOL
            </p>
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-slate-400">Smart Workforce Suite</p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-20 max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/70">
        <div className="mb-6 text-center">
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Signup</h2>
          <p className="mt-2 text-sm text-slate-500">Create your account to access attendance, leave, and employee tools.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" name="name" placeholder="Name" required className="w-full border px-3 py-2 rounded"
            value={form.name} onChange={handleChange} />
          <input type="email" name="email" placeholder="Email" required className="w-full border px-3 py-2 rounded"
            value={form.email} onChange={handleChange} />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              required
              className="w-full border px-3 py-2 rounded pr-10"
              value={form.password}
              onChange={handleChange}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              {showPassword ? "Hide" : "See"}
            </button>
          </div>
          <input type="date" name="dateOfJoining" required className="w-full border px-3 py-2 rounded"
            value={form.dateOfJoining} onChange={handleChange} />
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
            {loading ? "Signing up..." : "Signup"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-blue-600 transition hover:text-blue-700">
            Go to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
