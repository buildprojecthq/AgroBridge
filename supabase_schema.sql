-- Create the users table (syncs with Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  stripeAccountId TEXT,
  role TEXT,
  full_name TEXT,
  phone_number TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id);

-- Create the telemetry table for the gateway
CREATE TABLE IF NOT EXISTS public.storage_telemetry (
  device_id TEXT PRIMARY KEY,
  current_temperature REAL NOT NULL,
  current_humidity REAL NOT NULL,
  gas_level INTEGER NOT NULL,
  status TEXT NOT NULL,
  last_updated BIGINT NOT NULL, -- Storing as unix timestamp matching the ESP32
  fan_status BOOLEAN DEFAULT false,
  camera_image_url TEXT,
  camera_updated_at BIGINT
);

-- Idempotent column additions for existing databases
ALTER TABLE public.storage_telemetry ADD COLUMN IF NOT EXISTS camera_image_url TEXT;
ALTER TABLE public.storage_telemetry ADD COLUMN IF NOT EXISTS camera_updated_at BIGINT;

-- Enable RLS for telemetry (Assuming app users read this data)
ALTER TABLE public.storage_telemetry ENABLE ROW LEVEL SECURITY;

-- Allow all users (including Guest / Anonymous sessions) to read telemetry
CREATE POLICY "Anyone can view telemetry" 
ON public.storage_telemetry 
FOR SELECT 
USING (true);

-- Allow all users (including Guest / Anonymous sessions) to update fan_status
CREATE POLICY "Anyone can update fan_status" 
ON public.storage_telemetry 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Note: The Edge Function will bypass RLS by using the Service Role key to insert data.

-- Hardware Installations mapping (Shared Gateways supported)
CREATE TABLE IF NOT EXISTS public.hardware_installations (
  farmer_id UUID REFERENCES public.users(id) NOT NULL PRIMARY KEY,
  device_id TEXT NOT NULL,
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- In existing databases, remove legacy UNIQUE constraint on device_id if present:
-- ALTER TABLE public.hardware_installations DROP CONSTRAINT IF EXISTS hardware_installations_device_id_key;

ALTER TABLE public.hardware_installations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own hardware installations" 
ON public.hardware_installations 
FOR SELECT 
USING (auth.uid() = farmer_id);

CREATE POLICY "Users can insert their own hardware installations" 
ON public.hardware_installations 
FOR INSERT 
WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Users can update their own hardware installations" 
ON public.hardware_installations 
FOR UPDATE 
USING (auth.uid() = farmer_id);

-----------------------------------------------------------
-- CROPS TABLE (Marketplace Listings)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  farmer_id UUID REFERENCES public.users(id) NOT NULL,
  name TEXT NOT NULL,
  price_per_kg NUMERIC NOT NULL,
  quantity_available NUMERIC NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;

-- Anyone can read crops
CREATE POLICY "Anyone can view crops" 
ON public.crops FOR SELECT USING (true);

-- Only Farmers can insert their own crops
CREATE POLICY "Farmers can insert crops" 
ON public.crops FOR INSERT 
WITH CHECK (
  auth.uid() = farmer_id 
  AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('FARMER', 'GUEST_FARMER'))
);

-- Farmers can update their own crops
CREATE POLICY "Farmers can update own crops" 
ON public.crops FOR UPDATE 
USING (auth.uid() = farmer_id);

-- Farmers can delete their own crops
CREATE POLICY "Farmers can delete own crops" 
ON public.crops FOR DELETE 
USING (auth.uid() = farmer_id);

-----------------------------------------------------------
-- ORDERS TABLE (Purchases and Escrow)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID REFERENCES public.users(id) NOT NULL,
  crop_id UUID REFERENCES public.crops(id) NOT NULL,
  quantity NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, escrow_locked, shipped, delivered, completed
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Buyers can see their own orders
CREATE POLICY "Buyers can view own orders" 
ON public.orders FOR SELECT 
USING (auth.uid() = buyer_id);

-- Farmers can see orders for their crops
CREATE POLICY "Farmers can view orders for their crops" 
ON public.orders FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.crops 
    WHERE crops.id = orders.crop_id AND crops.farmer_id = auth.uid()
  )
);

-- Buyers and Farmers can create orders
CREATE POLICY "Users can insert orders" 
ON public.orders FOR INSERT 
WITH CHECK (
  auth.uid() = buyer_id
  AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('BUYER', 'GUEST_BUYER', 'FARMER', 'GUEST_FARMER'))
);

-- Note: Status updates to orders (like 'shipped' -> 'delivered') will need policies depending on business logic. 
-- Buyers can update their own orders (e.g. mark delivered).
CREATE POLICY "Buyers can update own orders" 
ON public.orders FOR UPDATE 
USING (auth.uid() = buyer_id);

-- Farmers can update orders for their own crops (e.g. mark shipped, accept escrow)
CREATE POLICY "Farmers can update orders for their crops"
ON public.orders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.crops 
    WHERE crops.id = orders.crop_id AND crops.farmer_id = auth.uid()
  )
);

-----------------------------------------------------------
-- MESSAGES TABLE (Real-time Chat)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.users(id) NOT NULL,
  receiver_id UUID REFERENCES public.users(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages if they are the sender or receiver
CREATE POLICY "Users can read their messages" 
ON public.messages FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can insert messages if they are the sender
CREATE POLICY "Users can insert messages" 
ON public.messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-----------------------------------------------------------
-- FUNCTIONS & RPCs
-----------------------------------------------------------
-- Secure function to decrement crop quantity without exposing UPDATE to buyers
CREATE OR REPLACE FUNCTION decrement_crop_quantity(crop_id_param UUID, qty_to_deduct NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.crops
  SET quantity_available = GREATEST(0, quantity_available - qty_to_deduct)
  WHERE id = crop_id_param;
END;
$$;

-----------------------------------------------------------
-- MANDI PRICES TABLE (Government Benchmark Rates)
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mandi_prices (
  id TEXT PRIMARY KEY,
  state TEXT,
  market TEXT,
  commodity TEXT NOT NULL,
  modal_price NUMERIC NOT NULL,
  min_price NUMERIC NOT NULL,
  max_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.mandi_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mandi prices" 
ON public.mandi_prices FOR SELECT 
USING (true);

-----------------------------------------------------------
-- STORAGE BUCKETS (Warehouse Camera Snapshots)
-----------------------------------------------------------
-- Creates the public storage bucket for camera snapshots if it doesn't already exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('warehouse-snapshots', 'warehouse-snapshots', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read access to warehouse snapshots
CREATE POLICY "Public Access to Warehouse Snapshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'warehouse-snapshots');

-- Service role & Edge functions handle uploads securely.
-- Optional authenticated insert policy for direct testing:
CREATE POLICY "Allow snapshot uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'warehouse-snapshots');

CREATE POLICY "Allow snapshot updates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'warehouse-snapshots');

