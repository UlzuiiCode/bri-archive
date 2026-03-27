import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Search, Download, Eye, Trash2, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/activity-logger";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Document {
  id: string;
  document_number: string;
  title: string;
  description: string | null;
  transaction_type: string;
  transaction_date: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
  category_id: string;
  document_categories?: { name: string } | null;
  profiles?: { full_name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

export default function Documents() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async () => {
    setLoading(true);
    let query = supabase
      .from("documents")
      .select("*, document_categories(name), profiles:uploaded_by(full_name)")
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(`title.ilike.%${search}%,document_number.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (categoryFilter !== "all") {
      query = query.eq("category_id", categoryFilter);
    }

    const { data } = await query;
    setDocuments((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    supabase.from("document_categories").select("id, name").then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [search, categoryFilter]);

  const handleDownload = async (doc: Document) => {
    const { data } = await supabase.storage.from("documents").download(doc.file_path);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
      logActivity("download", "document", doc.id, { file_name: doc.file_name });
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm("Yakin ingin menghapus dokumen ini?")) return;
    await supabase.storage.from("documents").remove([doc.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) {
      toast.error("Gagal menghapus dokumen");
    } else {
      toast.success("Dokumen berhasil dihapus");
      logActivity("delete", "document", doc.id, { title: doc.title });
      fetchDocuments();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  return (
    <AppLayout title="Arsip Dokumen">
      <div className="space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari dokumen..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => navigate("/upload")}>
                Upload Dokumen
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mb-3" />
                <p>Belum ada dokumen</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Dokumen</TableHead>
                      <TableHead>Judul</TableHead>
                      <TableHead className="hidden md:table-cell">Kategori</TableHead>
                      <TableHead className="hidden md:table-cell">Tgl. Transaksi</TableHead>
                      <TableHead className="hidden lg:table-cell">Ukuran</TableHead>
                      <TableHead className="hidden lg:table-cell">Diupload oleh</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-mono text-sm">{doc.document_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{doc.description}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary">{(doc.document_categories as any)?.name}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(new Date(doc.transaction_date), "dd MMM yyyy", { locale: localeId })}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {formatFileSize(doc.file_size)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {(doc.profiles as any)?.full_name}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} title="Download">
                              <Download className="w-4 h-4" />
                            </Button>
                            {role === "admin" && (
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)} title="Hapus">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
