import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';

export const hashPassword = (password: string, rounds: number) => bcrypt.hash(password, rounds);

export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export const issueToken = () => randomBytes(32).toString('base64url');

export const digest = (token: string) => createHash('sha256').update(token).digest('hex');
