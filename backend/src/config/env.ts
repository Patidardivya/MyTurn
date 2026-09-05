import dotenv from 'dotenv';
import type { SignOptions } from 'jsonwebtoken';

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET must be configured');
}

export const config = {
  jwtSecret,
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || '8h') as SignOptions['expiresIn'],
};
