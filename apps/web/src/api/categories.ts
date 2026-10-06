import { requestJson } from './client';

export type Category = {
  id: number;
  name: string;
  definition: string;
};

export function listCategories(): Promise<Category[]> {
  return requestJson('/api/categories');
}
