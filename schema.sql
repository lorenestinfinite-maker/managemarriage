-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT DEFAULT 'MEMBER',
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for users table
CREATE POLICY "Admins can update user approval status" ON users
FOR UPDATE USING (role = 'ADMIN')
WITH CHECK (role = 'ADMIN');

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  receipt_image_path TEXT,
  transaction_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- Enable RLS on transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for transactions table
CREATE POLICY "Authenticated users can view transactions" ON transactions
FOR SELECT USING (auth.is_authenticated());

CREATE POLICY "Users can manage their own transactions" ON transactions
FOR ALL USING (user_id = auth.uid());

-- Create pings table
CREATE TABLE IF NOT EXISTS pings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on pings table
ALTER TABLE pings ENABLE ROW LEVEL SECURITY;

-- Create policy for pings table
CREATE POLICY "Authenticated users can view pings" ON pings
FOR SELECT USING (auth.is_authenticated());

CREATE POLICY "Authenticated users can create pings" ON pings
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert default admin user (you'll need to update this after initial setup)
INSERT INTO users (id, name, role, is_approved) VALUES 
('00000000-0000-0000-0000-000000000000', 'Admin', 'ADMIN', TRUE);
