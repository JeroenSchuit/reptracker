// Web platform: use localStorage backend
import { webLocalStorageRepo } from './webLocalStorageRepo';
import { Repo } from './Repo';

export const repo: Repo = webLocalStorageRepo;
