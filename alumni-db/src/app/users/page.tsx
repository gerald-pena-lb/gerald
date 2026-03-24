"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface AppUser {
  id: number;
  username: string;
  display_name: string;
  role: string;
  created_at: string;
}

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", display_name: "", role: "user" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAdmin) {
      router.push("/");
      return;
    }
    loadUsers();
  }, [isAdmin, router]);

  function loadUsers() {
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => {});
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ username: "", password: "", display_name: "", role: "user" });
      loadUsers();
    } else {
      const err = await res.json();
      setError(err.error || "Failed to add user");
    }
  }

  async function handleDelete(id: number, username: string) {
    if (username === "Gerald") {
      alert("Cannot delete the admin account.");
      return;
    }
    if (!confirm(`Delete user "${username}"?`)) return;
    await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    loadUsers();
  }

  if (!isAdmin) return null;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={() => { setShowForm(!showForm); setError(""); }}
          className="px-4 py-2 bg-[#1e3a5f] text-white rounded-md text-sm hover:bg-[#152c4a]"
        >
          Add User
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-lg shadow p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {error && (
            <div className="col-span-2 p-2 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Username *</label>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password *</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Display Name *</label>
            <input
              type="text"
              required
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="col-span-2">
            <button type="submit" className="px-4 py-2 bg-[#1e3a5f] text-white rounded-md text-sm hover:bg-[#152c4a]">
              Save User
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Display Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 text-sm font-medium">{u.username}</td>
                <td className="px-4 py-3 text-sm">{u.display_name}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    u.role === "admin" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-700"
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm">
                  {u.username !== "Gerald" && (
                    <button
                      onClick={() => handleDelete(u.id, u.username)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
