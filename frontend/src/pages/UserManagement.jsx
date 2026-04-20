import { useEffect, useState } from "react";
import { getAllUsers, addUser, updateUser, deleteUser } from "../services/api";
import Loader from "../components/Loader";
import { showToast } from "../components/Toast";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "employee", dateOfJoining: "" });
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Removed auto-refresh logic to prevent automatic page reload or data refresh

  const fetchUsers = () => {
    setLoading(true);
    getAllUsers()
      .then((res) => setUsers(res.data))
      .catch(() => showToast("Failed to load users", "error"))
      .finally(() => setLoading(false));
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editId) {
        await updateUser(editId, form);
        showToast("User updated");
      } else {
        await addUser(form);
        showToast("User added");
      }
      setForm({ name: "", email: "", role: "employee", dateOfJoining: "" });
      setEditId(null);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      dateOfJoining: user.dateOfJoining?.slice(0, 10) || "",
    });
    setEditId(user._id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    setLoading(true);
    try {
      await deleteUser(id);
      showToast("User deleted");
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || "Delete failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">User Management</h2>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-6 flex-wrap">
        <input type="text" name="name" placeholder="Name" required className="border px-3 py-2 rounded" value={form.name} onChange={handleChange} />
        <input type="email" name="email" placeholder="Email" required className="border px-3 py-2 rounded" value={form.email} onChange={handleChange} />
        <input type="date" name="dateOfJoining" required className="border px-3 py-2 rounded" value={form.dateOfJoining} onChange={handleChange} />
        <select name="role" className="border px-3 py-2 rounded" value={form.role} onChange={handleChange}>
          <option value="employee">Employee</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
          {editId ? "Update" : "Add"}
        </button>
        {editId && (
          <button type="button" onClick={() => { setEditId(null); setForm({ name: "", email: "", role: "employee", dateOfJoining: "" }); }} className="bg-gray-400 text-white px-4 py-2 rounded">Cancel</button>
        )}
      </form>
      {loading ? <Loader /> : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Role</th>
              <th className="p-2 border">Date of Joining</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td className="p-2 border">{user.name}</td>
                <td className="p-2 border">{user.email}</td>
                <td className="p-2 border capitalize">{user.role}</td>
                <td className="p-2 border">{user.dateOfJoining?.slice(0,10)}</td>
                <td className="p-2 border">
                  <button onClick={() => handleEdit(user)} className="text-blue-600 mr-2">Edit</button>
                  <button onClick={() => handleDelete(user._id)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
