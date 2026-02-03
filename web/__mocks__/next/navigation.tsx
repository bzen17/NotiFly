import { vi } from 'vitest';

export const useRouter = () => ({ push: vi.fn() });
export const usePathname = () => '/';
