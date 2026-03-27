import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/activity-logger";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Upload, FileUp } from "lucide-react";

const transactionTypes = [
  "Transfer",
  "Setoran",
  "Penarikan",
  "Kliring",
  "RTGS",
  "SKN",
  "Lainnya",
];

interface Category {
  id: string;
  name: string;
}

export default function UploadDocument() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    documentNumber: "",
    title: "",
    description: "",
    categoryId: "",
    transactionType: "",
    transactionDate: "",
  });

  useEffect(() => {
    supabase.from("document_categories").select("id, name").then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/msword",
      "application/vnd.ms-excel",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Format file tidak didukung. Gunakan PDF, DOCX, atau XLSX.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 10MB");
      return;
    }

    setLoading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("documents").insert({
        document_number: form.documentNumber,
        title: form.title,
        description: form.description || null,
        category_id: form.categoryId,
        transaction_type: form.transactionType,
        transaction_date: form.transactionDate,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user.id,
      });

      if (dbError) throw dbError;

      await logActivity("upload", "document", undefined, { title: form.title, file_name: file.name });
      toast.success("Dokumen berhasil diupload!");
      navigate("/documents");
    } catch (error: any) {
      toast.error(error.message || "Gagal mengupload dokumen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Upload Dokumen">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Dokumen Baru
            </CardTitle>
            <CardDescription>Isi metadata dokumen dan upload file</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="docNumber">Nomor Dokumen *</Label>
                  <Input
                    id="docNumber"
                    value={form.documentNumber}
                    onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
                    placeholder="DOC-2026-001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transDate">Tanggal Transaksi *</Label>
                  <Input
                    id="transDate"
                    type="date"
                    value={form.transactionDate}
                    onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Judul Dokumen *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Masukkan judul dokumen"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kategori *</Label>
                  <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Jenis Transaksi *</Label>
                  <Select value={form.transactionType} onValueChange={(v) => setForm({ ...form, transactionType: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      {transactionTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Deskripsi</Label>
                <Textarea
                  id="desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Deskripsi singkat dokumen"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>File Dokumen * (PDF, DOCX, XLSX, maks 10MB)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => document.getElementById("fileInput")?.click()}>
                  <FileUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  {file ? (
                    <p className="text-sm text-foreground font-medium">{file.name}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Klik untuk memilih file</p>
                  )}
                  <input
                    id="fileInput"
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.xlsx,.doc,.xls"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading || !file}>
                {loading ? "Mengupload..." : "Upload Dokumen"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
