import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  UserPlus,
  Ban,
  CheckCircle,
  Trash2,
  Crown,
  Shield,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { api } from "../../lib/api";
import type { Admin } from "../../lib/types";
import { useAuth } from "../../context/AuthContext";
import { Modal } from "../../components/Modal";
import { useToast } from "../../context/ToastContext";
import { formatDate, timeAgo } from "../../lib/format";

export function AdminsAdmin() {
  const toast = useToast();
  const { user, role } = useAuth();
  const isSuperAdmin = role === "super_admin";

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "admin",
  });
  const [inviteError, setInviteError] = useState("");
  const [inviting, setInviting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    action: "revoke" | "restore" | "delete" | "role";
    admin: Admin;
    newRole?: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Admin[] }>(
        "/api/admin/admins"
      );
      setAdmins(res.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const invite = async () => {
    setInviteError("");
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(inviteForm.email)) {
      setInviteError("Enter a valid email address");
      return;
    }
    if (!isSuperAdmin) setInviteForm((f) => ({ ...f, role: "admin" }));
    setInviting(true);
    try {
      const res = await api.post<{
        message: string;
        temporary_password?: string;
      }>("/api/admin/admins/invite", inviteForm);
      toast.success(res.message);
      setInviteOpen(false);
      setInviteForm({ email: "", role: "admin" });
      setTempPassword(res.temporary_password || null);
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invite failed";
      setInviteError(msg);
      toast.error(msg);
    } finally {
      setInviting(false);
    }
  };

  const runAction = async () => {
    if (!confirmState) return;
    const { action, admin, newRole } = confirmState;
    try {
      if (action === "revoke") {
        await api.post(
          `/api/admin/admins/${admin.user_id}/revoke`,
          {}
        );
        toast.success(`Access revoked for ${admin.email}`);
      } else if (action === "restore") {
        await api.post(
          `/api/admin/admins/${admin.user_id}/restore`,
          {}
        );
        toast.success(`Access restored for ${admin.email}`);
      } else if (action === "delete") {
        await api.del(`/api/admin/admins/${admin.user_id}`);
        toast.success(`Admin ${admin.email} removed`);
      } else if (action === "role" && newRole) {
        await api.patch(`/api/admin/admins/${admin.user_id}`, {
          role: newRole,
        });
        toast.success(`Role updated for ${admin.email}`);
      }
      setConfirmState(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  };

  const canModify = (target: Admin) => {
    if (target.user_id === user?.id) return false;
    if (target.role === "super_admin" && !isSuperAdmin) return false;
    return true;
  };

  const inputClass = (hasError: boolean) =>
    `mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm transition focus:outline-none ${
      hasError
        ? "border-rose-300 bg-rose-50"
        : "border-navy-200 bg-white focus:border-brand-400"
    }`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">
            Admin management
          </h1>
          <p className="mt-1 text-sm text-navy-600">
            {admins.filter((a) => a.active).length} active ·{" "}
            {admins.filter((a) => !a.active).length} revoked
            {isSuperAdmin
              ? " · you are the super admin"
              : ""}
          </p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-brand-700"
        >
          <UserPlus className="h-4 w-4" />
          Invite admin
        </button>
      </div>

      {!isSuperAdmin && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You can invite admins and revoke/restore admin
          accounts. Super-admin roles can only be managed
          by the super admin.
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-5 overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-soft"
      >
        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-navy-50"
              />
            ))}
          </div>
        ) : admins.length === 0 ? (
          <p className="p-10 text-center text-sm text-navy-500">
            No admins yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-xs uppercase tracking-wider text-navy-400">
                  <th className="px-5 py-3.5 font-semibold">Admin</th>
                  <th className="px-5 py-3.5 font-semibold">Role</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Created</th>
                  <th className="px-5 py-3.5 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {admins.map((admin) => (
                  <tr key={admin.user_id} className="transition hover:bg-navy-50/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-full font-display text-xs font-bold ${
                            admin.role === "super_admin"
                              ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                              : "bg-brand-100 text-brand-800"
                          }`}
                        >
                          {admin.email.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-medium text-navy-900">
                            {admin.email}
                            {admin.user_id === user?.id && (
                              <span className="ml-1.5 rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-semibold text-navy-600">
                                you
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-navy-500">
                            ID: {admin.user_id.slice(0, 8)}…
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          admin.role === "super_admin"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-navy-50 text-navy-700"
                        }`}
                      >
                        {admin.role === "super_admin" ? (
                          <Crown className="h-3.5 w-3.5" />
                        ) : (
                          <Shield className="h-3.5 w-3.5" />
                        )}
                        {admin.role === "super_admin"
                          ? "Super Admin"
                          : "Admin"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {admin.active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
                          <Ban className="h-3.5 w-3.5" />
                          Revoked{" "}
                          {admin.revoked_at && timeAgo(admin.revoked_at)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-navy-500">
                      {formatDate(admin.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        {isSuperAdmin &&
                          admin.user_id !== user?.id && (
                            <button
                              onClick={() =>
                                setConfirmState({
                                  action: "role",
                                  admin,
                                  newRole:
                                    admin.role === "super_admin"
                                      ? "admin"
                                      : "super_admin",
                                })
                              }
                              className="rounded-lg p-2 text-navy-500 transition hover:bg-amber-50 hover:text-amber-700"
                              title="Change role"
                              aria-label={`Change role of ${admin.email}`}
                            >
                              <Crown className="h-4 w-4" />
                            </button>
                          )}
                        {canModify(admin) && admin.active && (
                          <button
                            onClick={() =>
                              setConfirmState({ action: "revoke", admin })
                            }
                            className="rounded-lg p-2 text-navy-500 transition hover:bg-amber-50 hover:text-amber-700"
                            title="Revoke access"
                            aria-label={`Revoke ${admin.email}`}
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                        {canModify(admin) && !admin.active && (
                          <button
                            onClick={() =>
                              setConfirmState({ action: "restore", admin })
                            }
                            className="rounded-lg p-2 text-navy-500 transition hover:bg-emerald-50 hover:text-emerald-700"
                            title="Restore access"
                            aria-label={`Restore ${admin.email}`}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {canModify(admin) && (
                          <button
                            onClick={() =>
                              setConfirmState({ action: "delete", admin })
                            }
                            className="rounded-lg p-2 text-navy-500 transition hover:bg-rose-50 hover:text-rose-700"
                            title="Remove admin"
                            aria-label={`Remove ${admin.email}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Invite modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite an admin"
      >
        <div>
          <label className="text-sm font-semibold text-navy-900">
            Email address
          </label>
          <input
            type="email"
            value={inviteForm.email}
            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            className={inputClass(Boolean(inviteError))}
            placeholder="colleague@example.com"
          />
          {inviteError && (
            <p className="mt-1 text-xs text-rose-600">
              {inviteError}
            </p>
          )}
        </div>
        <div className="mt-4">
          <label className="text-sm font-semibold text-navy-900">
            Role
          </label>
          <select
            value={inviteForm.role}
            disabled={!isSuperAdmin}
            onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm transition focus:border-brand-400 focus:outline-none disabled:opacity-60"
          >
            <option value="admin">Admin</option>
            <option value="super_admin">
              Super Admin {isSuperAdmin ? "" : "(super admin only)"}
            </option>
          </select>
          <p className="mt-1 text-xs text-navy-400">
            {isSuperAdmin
              ? "Super admins can manage roles and other super admins."
              : "Only the super admin can assign the super-admin role."}
          </p>
        </div>
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setInviteOpen(false)}
            className="flex-1 rounded-xl border border-navy-200 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-navy-50"
          >
            Cancel
          </button>
          <button
            onClick={invite}
            disabled={inviting}
            className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {inviting ? "Sending…" : "Send invite"}
          </button>
        </div>
      </Modal>

      {/* Temporary password modal */}
      <Modal
        open={!!tempPassword}
        onClose={() => setTempPassword(null)}
        title="Temporary password"
      >
        <p className="text-sm text-navy-700">
          A temporary password was generated for the new
          admin. Share it through a secure channel — it is
          shown only once.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-navy-200 bg-navy-50 px-4 py-3">
          <KeyRound className="h-4 w-4 shrink-0 text-brand-600" />
          <code className="flex-1 break-all text-sm font-semibold text-navy-900">
            {tempPassword}
          </code>
          <button
            onClick={() => navigator.clipboard?.writeText(tempPassword || "")}
            className="rounded-lg border border-navy-200 bg-white px-2.5 py-1 text-xs font-semibold text-navy-700 transition hover:bg-navy-50"
          >
            Copy
          </button>
        </div>
        <p className="mt-3 text-xs text-navy-500">
          The new admin must change their password after
          first sign-in via Supabase.
        </p>
        <button
          onClick={() => setTempPassword(null)}
          className="mt-5 w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          Done
        </button>
      </Modal>

      {/* Confirm action modal */}
      <Modal
        open={!!confirmState}
        onClose={() => setConfirmState(null)}
        title={
          confirmState?.action === "revoke"
            ? "Revoke access"
            : confirmState?.action === "restore"
              ? "Restore access"
              : confirmState?.action === "role"
                ? "Change role"
                : "Remove admin"
        }
      >
        <p className="text-sm text-navy-700">
          {confirmState?.action === "revoke" && (
            <>
              Revoke admin access for{" "}
              <strong>{confirmState.admin.email}</strong>? They
              can no longer use the dashboard until restored.
            </>
          )}
          {confirmState?.action === "restore" && (
            <>
              Restore admin access for{" "}
              <strong>{confirmState.admin.email}</strong>?
            </>
          )}
          {confirmState?.action === "delete" && (
            <>
              Permanently remove <strong>{confirmState.admin.email}</strong>?
              Their account and all admin privileges will be
              deleted.
            </>
          )}
          {confirmState?.action === "role" && (
            <>
              Change <strong>{confirmState.admin.email}</strong> to{" "}
              <strong>{confirmState.newRole === "super_admin" ? "Super Admin" : "Admin"}</strong>?
              {confirmState.newRole === "super_admin"
                ? " They will gain full control over roles and settings."
                : " They will lose super-admin privileges."}
            </>
          )}
        </p>
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setConfirmState(null)}
            className="flex-1 rounded-xl border border-navy-200 px-4 py-2.5 text-sm font-semibold text-navy-700 transition hover:bg-navy-50"
          >
            Cancel
          </button>
          <button
            onClick={runAction}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition ${
              confirmState?.action === "delete"
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            Confirm
          </button>
        </div>
      </Modal>

      {/* Legend */}
      <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-navy-500">
        <span className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          Actions target other admins only
        </span>
        <span className="flex items-center gap-1.5">
          <EyeOff className="h-3.5 w-3.5" />
          Revoked admins keep audit history
        </span>
      </div>
    </div>
  );
}
