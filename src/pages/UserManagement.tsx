import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Users, Shield } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity-logger";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
  user_roles?: { role: string }[];
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, created_at")
      .order("created_at", { ascending: false });

    if (profiles) {
      // Fetch roles for all users
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

  const changeRole = async (userId: string, newRole: string) => {
    // Delete existing roles
    await supabase.from("user_roles").delete().eq("user_id", userId);
    // Insert new role
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
    if (error) {
      toast.error("Gagal mengubah role");
    } else {
      toast.success("Role berhasil diubah");
      logActivity("change_role", "user", userId, { new_role: newRole });
      fetchUsers();
    }
  };

  return (
    <AppLayout title="Manajemen Pengguna">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Daftar Pengguna
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                  {users.map((u) => {
                    const currentRole = u.user_roles?.[0]?.role || "pegawai";
                    const initials = u.full_name
                      ? u.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                      : "U";
                    return (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{u.full_name || "—"}</span>
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
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
