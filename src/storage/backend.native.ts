// Native platform: use SQLite backend
import { sqliteRepo } from './sqliteRepo';
import { Repo } from './Repo';

export const repo: Repo = sqliteRepo;
