import { QueryClient } from '@tanstack/react-query';

// Single app-wide client. Lives in its own module so the build-time prerender
// (src/entry-server.jsx) can seed it with blog posts before rendering.
export const queryClient = new QueryClient();
