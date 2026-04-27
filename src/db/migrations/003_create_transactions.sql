CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    amount NUMERIC(12,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);