"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useRouter } from "next/navigation";

interface AccessRequest {
  id: string;
  email: string;
  status: "pending" | "approved" | "denied";
  created_at: string;
}

interface AllowedUser {
  email: string;
  role: "user" | "admin";
  created_at: string;
}

export default function AdminPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [addingUser, setAddingUser] = useState(false);

  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const loadData = useCallback(async () => {
    if (!user?.email) return;

    // Check if current user is admin
    const { data: adminCheck } = await supabase
      .from("allowed_users")
      .select("role")
      .eq("email", user.email)
      .single();

    if (adminCheck?.role !== "admin") {
      router.push("/");
      return;
    }

    setIsAdmin(true);

    // Load pending requests - admins can see all
    const { data: requestsData } = await supabase
      .from("access_requests")
      .select("*")
      .order("created_at", { ascending: false });

    // Load allowed users
    const { data: usersData } = await supabase
      .from("allowed_users")
      .select("*")
      .order("created_at", { ascending: false });

    setRequests(requestsData || []);
    setAllowedUsers(usersData || []);
    setLoading(false);
  }, [user?.email, supabase, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (request: AccessRequest) => {
    // Add to allowed_users
    const { error: insertError } = await supabase
      .from("allowed_users")
      .insert({ email: request.email, role: "user" });

    if (insertError && insertError.code !== "23505") {
      alert("Error approving user: " + insertError.message);
      return;
    }

    // Update request status
    await supabase
      .from("access_requests")
      .update({ status: "approved" })
      .eq("id", request.id);

    loadData();
  };

  const handleDeny = async (request: AccessRequest) => {
    await supabase
      .from("access_requests")
      .update({ status: "denied" })
      .eq("id", request.id);

    loadData();
  };

  const handleRemoveUser = async (email: string) => {
    if (email === user?.email) {
      alert("You cannot remove yourself!");
      return;
    }

    if (!confirm(`Remove ${email} from allowed users?`)) return;

    await supabase.from("allowed_users").delete().eq("email", email);
    loadData();
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setAddingUser(true);

    const { error } = await supabase
      .from("allowed_users")
      .insert({ email: newEmail.trim().toLowerCase(), role: newRole });

    if (error) {
      if (error.code === "23505") {
        alert("User already exists in allowed list");
      } else {
        alert("Error adding user: " + error.message);
      }
    } else {
      setNewEmail("");
      loadData();
    }

    setAddingUser(false);
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Admin Dashboard
      </h1>

      {/* Add User Form */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Add User
        </h2>
        <form onSubmit={handleAddUser} className="flex gap-4 flex-wrap">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email@example.com"
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as "user" | "admin")}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={addingUser}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition disabled:opacity-50"
          >
            {addingUser ? "Adding..." : "Add User"}
          </button>
        </form>
      </div>

      {/* Pending Requests */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Pending Requests ({pendingRequests.length})
        </h2>
        {pendingRequests.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No pending requests</p>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {request.email}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Requested {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(request)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleDeny(request)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Allowed Users */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Allowed Users ({allowedUsers.length})
        </h2>
        <div className="space-y-2">
          {allowedUsers.map((allowedUser) => (
            <div
              key={allowedUser.email}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <p className="font-medium text-gray-900 dark:text-white">
                  {allowedUser.email}
                </p>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    allowedUser.role === "admin"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {allowedUser.role}
                </span>
              </div>
              {allowedUser.email !== user?.email && (
                <button
                  onClick={() => handleRemoveUser(allowedUser.email)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
