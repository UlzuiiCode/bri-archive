import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Activity } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Log {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  details: any;
  created_at: string;
  user_name?: string | null;
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data: rows, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("fetchLogs:", error);
        setLoading(false);
        return;
      }

      const list = (rows || []) as Log[];

      // Fetch profile names separately (same approach as Documents page)
      const userIds = [...new Set(list.map((l) => l.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        const byUser = new Map((profs || []).map((p) => [p.user_id, p.full_name]));
        list.forEach((l) => {
          l.user_name = byUser.get(l.user_id) ?? null;
        });
      }

      setLogs(list);
      setLoading(false);
    };

    fetchLogs();
  }, []);

  const actionLabel: Record<string, string> = {
    upload: "Mengupload",
    download: "Mengunduh",
    delete: "Menghapus",
    approve_user: "Menyetujui Pengguna",
    reject_user: "Menolak Pengguna",
    delete_user: "Menghapus Pengguna",
    change_role: "Mengubah Peran",
  };

  const entityLabel: Record<string, string> = {
    document: "Dokumen",
    user: "Pengguna",
  };

  const actionColor = (action: string) => {
    if (action.includes("upload")) return "default";
    if (action.includes("approve")) return "default";
    if (action.includes("delete") || action.includes("reject")) return "destructive";
    if (action.includes("download")) return "secondary";
    return "outline";
  };

  const formatDetails = (action: string, details: any): string => {
    if (!details) return "—";
    switch (action) {
      case "upload":
        return `"${details.title || ""}" — ${details.file_name || ""}`;
      case "download":
        return `File: ${details.file_name || ""}`;
      case "delete":
        return `Dokumen: "${details.title || ""}"`;
      case "approve_user":
        return `Email: ${details.email || ""}`;
      case "reject_user":
        return `Email: ${details.email || ""}`;
      case "delete_user":
        return `${details.full_name || ""} (${details.email || ""})`;
      case "change_role":
        return `Peran baru: ${details.new_role === "admin" ? "Admin" : "Pegawai"}`;
      default:
        return JSON.stringify(details);
    }
  };

  return (
    <AppLayout title="Log Aktivitas">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Riwayat Aktivitas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Belum ada log aktivitas</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Pengguna</TableHead>
                    <TableHead>Aksi</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead className="hidden md:table-cell">Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: localeId })}
                      </TableCell>
                      <TableCell className="font-medium">{log.user_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={actionColor(log.action) as any}>
                          {actionLabel[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entityLabel[log.entity_type] || log.entity_type}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[300px] truncate">
                        {formatDetails(log.action, log.details)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
