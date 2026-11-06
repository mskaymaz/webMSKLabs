-- Local DevAdmin Initial Seed Data
INSERT OR IGNORE INTO admins (id, username, password_hash, role) 
VALUES (
    1, 
    'admin', 
    '$pbkdf2$v=1$i=100000$42560166de9b28af51e1c9228e2393b0$679c8102653b791aa7d7191e69fa1a21c01f1583e91af0bcb1f8a20efddd088a', 
    'SUPER_ADMIN'
);
