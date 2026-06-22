-- schema.sql (Dashboard Complet)

-- 1. Table: Profiles (User Data)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    shop_name TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    bio TEXT,
    wallet_balance NUMERIC DEFAULT 0.0,
    wallet_passcode TEXT,
    wallet_phone TEXT,
    seller_status VARCHAR(50) DEFAULT 'none',
    seller_application_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Prevent duplicate shop names (case-insensitive, trimmed). Allows NULL/empty.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_shop_name_unique
  ON public.profiles ((lower(btrim(shop_name))))
  WHERE shop_name IS NOT NULL AND btrim(shop_name) <> '';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent voir leur propre profil" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Les utilisateurs peuvent mettre à jour leur propre profil" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Les utilisateurs peuvent insérer leur propre profil" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger pour créer automatiquement un profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, shop_name, first_name, last_name, phone)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'shop_name',
    new.raw_user_meta_data->>'name', 
    '', 
    new.raw_user_meta_data->>'whatsapp'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- S'assurer que le trigger existe sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 1.5 Table: Products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    price NUMERIC NOT NULL,
    description TEXT,
    category TEXT,
    image TEXT,
    image_url TEXT,
    quartier TEXT DEFAULT '',
    specs JSONB DEFAULT '[]'::jsonb,
    seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    whatsapp TEXT,
    rating NUMERIC DEFAULT 4.5,
    reviews INTEGER DEFAULT 10,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tout le monde peut voir les produits" ON public.products FOR SELECT USING (true);
CREATE POLICY "Les vendeurs peuvent modifier leurs propres produits" ON public.products FOR ALL USING (auth.uid() = seller_id);

-- 1.6 Table: Product Images
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL,
    sort INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tout le monde peut voir les images des produits" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Les vendeurs peuvent gerer les images de leurs produits" ON public.product_images FOR ALL USING (
  exists (
    select 1 from public.products
    where products.id = product_images.product_id and products.seller_id = auth.uid()
  )
);

-- 1.7 Table: Analytics Events
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_analytics_seller_date ON public.analytics_events(seller_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_product ON public.analytics_events(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_type ON public.analytics_events(event_type);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous and authenticated inserts" ON public.analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow sellers to select their own shop metrics" ON public.analytics_events FOR SELECT USING (auth.uid() = seller_id);

-- 2. Table: Addresses
CREATE TABLE public.addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    label TEXT NOT NULL,
    street TEXT NOT NULL,
    city TEXT NOT NULL,
    zip TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their addresses" ON public.addresses
  FOR ALL USING (auth.uid() = user_id);

-- 3. Table: Favorites
CREATE TABLE public.favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    product_id UUID REFERENCES public.products(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, product_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their favorites" ON public.favorites
  FOR ALL USING (auth.uid() = user_id);

-- 4. Table: Orders (Commandes)
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    seller_id UUID REFERENCES public.profiles(id),
    total_amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'en cours',
    payment_method VARCHAR(50) DEFAULT 'direct_whatsapp',
    escrow_status VARCHAR(50) DEFAULT 'none',
    amount_paid NUMERIC DEFAULT 0.0,
    buyer_phone_payeur TEXT,
    escrow_qr_code TEXT,
    buyer_validated BOOLEAN DEFAULT false,
    seller_validated BOOLEAN DEFAULT false,
    buyer_validated_at TIMESTAMP WITH TIME ZONE,
    seller_validated_at TIMESTAMP WITH TIME ZONE,
    escrow_released_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR auth.uid() = seller_id);
CREATE POLICY "Users can update their own orders" ON public.orders FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = seller_id);

-- 5. Table: Order Items (Articles de la Commande)
CREATE TABLE public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    price NUMERIC NOT NULL
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see items of their orders" ON public.order_items FOR SELECT USING (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id and orders.user_id = auth.uid()
  )
);

-- 6. Table: Messages
CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) NOT NULL,
    receiver_id UUID REFERENCES auth.users(id) NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    read_status BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own messages" ON public.messages FOR SELECT USING (auth.uid() = receiver_id OR auth.uid() = sender_id);
-- 7. Table: Reviews (Avis Clients)
CREATE TABLE public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tout le monde peut voir les avis" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Les utilisateurs connectés peuvent ajouter un avis" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. Table: Cart Items (Panier)
CREATE TABLE public.cart_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, product_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent voir leur propre panier" ON public.cart_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Les utilisateurs peuvent modifier leur propre panier" ON public.cart_items FOR ALL USING (auth.uid() = user_id);


-- 9. Table: Wallet Transactions (Historique financier)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- 'deposit', 'payout', 'withdrawal', 'refund'
    amount NUMERIC NOT NULL,
    status VARCHAR(50) DEFAULT 'completed', -- 'pending', 'completed', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent voir leurs propres transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Les utilisateurs peuvent inserer leurs propres transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- 10. Table: Wallet Withdrawals (Demandes de retraits)
CREATE TABLE IF NOT EXISTS public.wallet_withdrawals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'momo', 'orange'
    phone_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.wallet_withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent voir leurs propres retraits" ON public.wallet_withdrawals FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Les utilisateurs peuvent inserer leurs propres retraits" ON public.wallet_withdrawals FOR INSERT WITH CHECK (auth.uid() = seller_id);


