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
  action: string;
  entity_type: string;
  details: any;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("activity_logs")
      .select("*, profiles:user_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setLogs(data as any);
        setLoading(false);
      });
  }, []);

  const actionColor = (action: string) => {
    if (action.includes("upload")) return "default";
    if (action.includes("delete")) return "destructive";
    if (action.includes("download")) return "secondary";
    return "outline";
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
                    <TableHead>Entitas</TableHead>
                    <TableHead className="hidden md:table-cell">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: localeId })}
                      </TableCell>
                      <TableCell className="font-medium">{(log.profiles as any)?.full_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={actionColor(log.action) as any}>{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{log.entity_type}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                        {log.details ? JSON.stringify(log.details) : "—"}
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
