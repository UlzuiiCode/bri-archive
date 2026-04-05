-- Add financial fields for transaction tracking to documents table (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='amount') THEN
    ALTER TABLE public.documents ADD COLUMN amount BIGINT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='related_party') THEN
    ALTER TABLE public.documents ADD COLUMN related_party TEXT;
  END IF;
END $$;

-- Hapus kategori lama yang BUKAN untuk Divisi Transaksi
-- (Akan gagal jika ada dokumen yang masih menggunakan kategori ini,
--  dalam hal itu hapus manual setelah memindahkan dokumen terkait)
DELETE FROM public.document_categories WHERE name IN (
  'Surat Masuk',
  'Surat Keluar',
  'Memo Internal',
  'Dokumen Regulasi'
);

-- Tambah kategori baru khusus Divisi Transaksi
INSERT INTO public.document_categories (name, description) VALUES
  ('Bukti Transfer Keluar', 'Bukti transaksi pengiriman dana (transfer)'),
  ('Bukti Setoran', 'Bukti transaksi penyetoran dana'),
  ('Laporan Mutasi Harian', 'Laporan rekapitulasi mutasi harian'),
  ('Dokumen Rekonsiliasi', 'Dokumen untuk rekonsiliasi data'),
  ('Nota Retur', 'Nota retur transaksi')
ON CONFLICT (name) DO NOTHING;
