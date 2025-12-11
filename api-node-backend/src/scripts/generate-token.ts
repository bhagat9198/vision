
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const secret = process.env.JWT_SECRET;
if (!secret) {
    console.error('JWT_SECRET not found in .env');
    process.exit(1);
}

const token = jwt.sign(
    {
        id: 'super-admin-seed-id',
        email: 'superadmin@example.com',
        role: 'SUPER_ADMIN',
    },
    secret,
    { expiresIn: '1h' }
);

console.log(token);
