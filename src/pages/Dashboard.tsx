import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Upload, Users, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Stats {
  totalDocuments: number;
  totalUsers: number;
  todayUploads: number;
  totalActivities: number;
}

interface RecentActivity {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export default function Dashboard() {
  const { role } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalDocuments: 0, totalUsers: 0, todayUploads: 0, totalActivities: 0 });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [docRes, userRes, todayRes, actRes] = await Promise.all([
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }).gte("created_at", today),
        supabase.from("activity_logs").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        totalDocuments: docRes.count || 0,
        totalUsers: userRes.count || 0,
        todayUploads: todayRes.count || 0,
        totalActivities: actRes.count || 0,
      });
    };

    const fetchActivities = async () => {
      const { data } = await supabase
        .from("activity_logs")
        .select("id, action, entity_type, created_at, profiles:user_id(full_name)")
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setRecentActivities(data as any);
    };

    fetchStats();
    fetchActivities();
  }, []);

  const statCards = [
    { title: "Total Dokumen", value: stats.totalDocuments, icon: FileText, color: "text-primary" },
    { title: "Upload Hari Ini", value: stats.todayUploads, icon: Upload, color: "text-success" },
    ...(role === "admin"
      ? [
          { title: "Total Pengguna", value: stats.totalUsers, icon: Users, color: "text-info" },
          { title: "Total Aktivitas", value: stats.totalActivities, icon: Activity, color: "text-warning" },
        ]
      : []),
  ];

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Belum ada aktivitas</p>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Activity className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{(activity.profiles as any)?.full_name || "User"}</span>
                        {" — "}
                        {activity.action} ({activity.entity_type})
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(activity.created_at), "dd MMM yyyy, HH:mm", { locale: localeId })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
