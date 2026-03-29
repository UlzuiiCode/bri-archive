import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Lock, Mail } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Registrasi berhasil! Silakan cek email untuk verifikasi.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Login berhasil!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      const msg = error.message || "";
      if (msg.includes("Invalid login credentials")) {
        toast.error("Email atau password salah. Pastikan akun sudah terdaftar dan email sudah dikonfirmasi.");
      } else if (msg.includes("Email not confirmed")) {
        toast.error("Akun Anda sedang menunggu persetujuan admin. Silakan tunggu hingga admin menyetujui akun Anda.");
      } else if (msg.includes("rate limit") || msg.includes("429")) {
        toast.error("Terlalu banyak percobaan. Silakan tunggu beberapa menit sebelum mencoba lagi.");
      } else if (msg.includes("User already registered")) {
        toast.error("Email sudah terdaftar. Silakan masuk dengan akun yang sudah ada.");
      } else {
        toast.error(msg || "Terjadi kesalahan. Silakan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary mb-4">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Sistem Arsip Dokumen</h1>
          <p className="text-muted-foreground text-sm mt-1">Divisi Fungsi Transaksi - Bank Rakyat Indonesia</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isSignUp ? "Daftar Akun Baru" : "Masuk"}</CardTitle>
            <CardDescription>
              {isSignUp ? "Buat akun untuk mengakses sistem" : "Masukkan kredensial Anda"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nama Lengkap</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Masukkan nama lengkap"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@bri.co.id"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Memproses..." : isSignUp ? "Daftar" : "Masuk"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-primary hover:underline"
              >
                {isSignUp ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
