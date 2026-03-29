-- ============================================
-- Migration: Admin Approval Feature
-- Fitur persetujuan akun pengguna baru oleh admin
-- ============================================

-- 1. Tambah kolom is_approved di profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false;

-- 2. Update semua user yang sudah ada agar is_approved = true
UPDATE public.profiles SET is_approved = true;

-- 3. Function: Admin approve user
CREATE OR REPLACE FUNCTION public.admin_confirm_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cek apakah pemanggil adalah admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can confirm users';
  END IF;

  -- Set email_confirmed_at di auth.users
  UPDATE auth.users 
  SET email_confirmed_at = NOW()
  WHERE id = target_user_id;
  
  -- Set is_approved di profiles
  UPDATE public.profiles 
  SET is_approved = true 
  WHERE user_id = target_user_id;
END;
$$;

-- 4. Function: Admin reject (hapus) user
CREATE OR REPLACE FUNCTION public.admin_reject_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cek apakah pemanggil adalah admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can reject users';
  END IF;

  -- Hapus user dari auth (cascade akan hapus profiles & user_roles juga)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
