-- 1. Users Table
CREATE TABLE IF NOT EXISTS adminator_users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    profile_id INTEGER -- FK added later
);

-- 2. Access Profiles (RBAC)
CREATE TABLE IF NOT EXISTS adminator_access_profiles (
    profile_id SERIAL PRIMARY KEY,
    profile_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_global_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Link Users to Profiles
ALTER TABLE adminator_users 
ADD CONSTRAINT fk_users_profile 
FOREIGN KEY (profile_id) REFERENCES adminator_access_profiles(profile_id);

-- 3. Apps Catalog
CREATE TABLE IF NOT EXISTS adminator_apps (
    app_id SERIAL PRIMARY KEY,
    app_key VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'tasty-customers'
    app_name VARCHAR(100) NOT NULL,
    description TEXT,
    app_icon VARCHAR(255), -- Path to icon in bucket
    config_path VARCHAR(255), -- Path to config.json in bucket
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. App Permissions (Profile <-> App Many-to-Many)
CREATE TABLE IF NOT EXISTS adminator_profile_apps (
    profile_id INTEGER NOT NULL,
    app_id INTEGER NOT NULL,
    permission_level VARCHAR(50) DEFAULT 'read', -- 'read', 'write', 'admin'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (profile_id, app_id),
    CONSTRAINT fk_profile_apps_profile FOREIGN KEY (profile_id) REFERENCES adminator_access_profiles(profile_id) ON DELETE CASCADE,
    CONSTRAINT fk_profile_apps_app FOREIGN KEY (app_id) REFERENCES adminator_apps(app_id) ON DELETE CASCADE
);

-- 5. Seed Initial Data

-- Global Admin Profile
INSERT INTO adminator_access_profiles (profile_name, description, is_global_admin)
VALUES ('Global Admin', 'Full access to all apps and system settings', TRUE)
ON CONFLICT (profile_name) DO NOTHING;

-- Default User (Password: 'admin123' - Change immediately!)
-- Hash is bcrypt for 'admin123'
INSERT INTO adminator_users (email, password_hash, first_name, last_name, profile_id)
SELECT 'admin@adminator.local', '$2a$10$RACjqS93fikxVQYdBej2vuxC32agg.svfcQNiTKLVMAKDZ1tpgnR.', 'System', 'Admin', p.profile_id
FROM adminator_access_profiles p WHERE p.profile_name = 'Global Admin'
ON CONFLICT (email) DO NOTHING;

-- Seed Tasty Customers App (REMOVED - Dynamic Apps Only)
