import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Users, Shield, CheckCircle2, XCircle, Clock, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity-logger";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
  is_approved: boolean;
  user_roles?: { role: string }[];
}

type TabValue = "pending" | "active";

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>("pending");
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectDialogUser, setRejectDialogUser] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, created_at, is_approved")
      .order("created_at", { ascending: false });

    if (profiles) {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const usersWithRoles = profiles.map((p) => ({
        ...p,
        user_roles: roles?.filter((r) => r.user_id === p.user_id) || [],
      }));
      setUsers(usersWithRoles);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const pendingUsers = users.filter((u) => !u.is_approved);
  const activeUsers = users.filter((u) => u.is_approved);

  const handleApprove = async (user: UserProfile) => {
    setApproving(user.user_id);
    try {
      const { error } = await supabase.rpc("admin_confirm_user", {
        target_user_id: user.user_id,
      });
      if (error) throw error;

      // Kirim notifikasi ke user
      await supabase.from("notifications").insert({
        user_id: user.user_id,
        title: "Akun Disetujui",
        message: "Akun Anda telah disetujui oleh admin. Anda sekarang dapat masuk ke sistem.",
      });

      toast.success(`Akun ${user.full_name || user.email} berhasil disetujui!`);
      logActivity("approve_user", "user", user.user_id, { email: user.email });
      fetchUsers();
    } catch (error: any) {
      toast.error(`Gagal menyetujui akun: ${error.message}`);
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (user: UserProfile) => {
    setRejecting(user.user_id);
    try {
      const { error } = await supabase.rpc("admin_reject_user", {
        target_user_id: user.user_id,
      });
      if (error) throw error;

      toast.success(`Akun ${user.full_name || user.email} berhasil ditolak dan dihapus.`);
      logActivity("reject_user", "user", user.user_id, { email: user.email });
      fetchUsers();
    } catch (error: any) {
      toast.error(`Gagal menolak akun: ${error.message}`);
    } finally {
      setRejecting(null);
      setRejectDialogUser(null);
    }
  };

  const changeRole = async (userId: string, newRole: string) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
    if (error) {
      toast.error("Gagal mengubah role");
    } else {
      toast.success("Role berhasil diubah");
      logActivity("change_role", "user", userId, { new_role: newRole });
      fetchUsers();
    }
  };

  const getInitials = (name: string) =>
    name
      ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      : "U";

  const renderPendingTable = () => (
    <div className="overflow-x-auto">
      {pendingUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CheckCircle2 className="w-12 h-12 mb-3 text-green-500/50" />
          <p className="text-lg font-medium">Semua akun sudah disetujui!</p>
          <p className="text-sm">Tidak ada akun yang menunggu persetujuan.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pengguna</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden md:table-cell">Tanggal Daftar</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingUsers.map((u) => (
              <TableRow key={u.user_id} className="bg-amber-500/5">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                        {getInitials(u.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-medium">{u.full_name || "—"}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span className="text-xs text-amber-600">Menunggu persetujuan</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {format(new Date(u.created_at), "dd MMM yyyy, HH:mm", { locale: localeId })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(u)}
                      disabled={approving === u.user_id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <UserCheck className="w-4 h-4 mr-1" />
                      {approving === u.user_id ? "Menyetujui..." : "Setujui"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRejectDialogUser(u)}
                      disabled={rejecting === u.user_id}
                    >
                      <UserX className="w-4 h-4 mr-1" />
                      {rejecting === u.user_id ? "Menolak..." : "Tolak"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );

  const renderActiveTable = () => (
    <div className="overflow-x-auto">
      {activeUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-lg font-medium">Belum ada pengguna aktif</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pengguna</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden md:table-cell">Terdaftar</TableHead>
              <TableHead>Ubah Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeUsers.map((u) => {
              const currentRole = u.user_roles?.[0]?.role || "pegawai";
              return (
                <TableRow key={u.user_id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {getInitials(u.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium">{u.full_name || "—"}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          <span className="text-xs text-green-600">Aktif</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={currentRole === "admin" ? "default" : "secondary"}>
                      <Shield className="w-3 h-3 mr-1" />
                      {currentRole === "admin" ? "Admin" : "Pegawai"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {format(new Date(u.created_at), "dd MMM yyyy", { locale: localeId })}
                  </TableCell>
                  <TableCell>
                    <Select value={currentRole} onValueChange={(v) => changeRole(u.user_id, v)}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="pegawai">Pegawai</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );

  return (
    <AppLayout title="Manajemen Pengguna">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Daftar Pengguna
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tab Buttons */}
          <div className="flex gap-1 mb-4 p-1 bg-muted rounded-lg w-fit">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === "pending"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="w-4 h-4" />
              Menunggu Persetujuan
              {pendingUsers.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full bg-amber-500 text-white">
                  {pendingUsers.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("active")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === "active"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Pengguna Aktif
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full bg-green-500/20 text-green-700">
                {activeUsers.length}
              </span>
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : activeTab === "pending" ? (
            renderPendingTable()
          ) : (
            renderActiveTable()
          )}
        </CardContent>
      </Card>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={!!rejectDialogUser} onOpenChange={(open) => !open && setRejectDialogUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              Tolak & Hapus Akun?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Anda yakin ingin menolak akun <strong>{rejectDialogUser?.full_name || rejectDialogUser?.email}</strong>?
              Akun ini akan dihapus secara permanen dan tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => rejectDialogUser && handleReject(rejectDialogUser)}
            >
              Ya, Tolak & Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
