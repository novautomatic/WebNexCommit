import React, { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Menu, X } from 'lucide-react';
import Home from './pages/Home';
import { BlogList } from './pages/blog/BlogList';
import { BlogPost } from './pages/blog/BlogPost';
import { BlogAdmin } from './pages/blog/BlogAdmin';
import NCAdmin from './pages/NCAdmin';
import Login from './pages/Login';
import { AuthProvider } from './components/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { BrandLogo } from './components/Brand';

const queryClient = new QueryClient();

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <div className="app-shell w-full min-h-screen">
        <nav
          className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 md:px-8 py-5 border-b"
          style={{
            backgroundColor: 'rgba(5, 20, 34, 0.72)',
            borderColor: 'rgba(119, 165, 210, 0.12)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
          }}
        >
          <Link to="/" aria-label="Ir al inicio">
            <BrandLogo />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-brand-muted">
            <Link to="/blog" className="hover:text-white transition-colors duration-200">
              Blog
            </Link>
            <a
              href="https://wa.me/56929237511?text=Hola!%20Vengo%20desde%20la%20web%20de%20NexCommit%20y%20me%20gustar%C3%ADa%20m%C3%A1s%20informaci%C3%B3n."
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors duration-200"
            >
              Contacto
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div
            className="fixed top-20 left-0 w-full z-40 md:hidden"
            style={{
              backgroundColor: 'rgba(5, 20, 34, 0.95)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              borderBottom: '1px solid rgba(119, 165, 210, 0.12)',
            }}
          >
            <div className="container py-4 flex flex-col gap-4">
              <Link
                to="/blog"
                className="text-white text-sm font-medium py-2 hover:text-brand-light transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Blog
              </Link>
              <a
                href="https://wa.me/56929237511?text=Hola!%20Vengo%20desde%20la%20web%20de%20NexCommit%20y%20me%20gustar%C3%ADa%20m%C3%A1s%20informaci%C3%B3n."
                target="_blank"
                rel="noopener noreferrer"
                className="text-white text-sm font-medium py-2 hover:text-brand-light transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contacto
              </a>
            </div>
          </div>
        )}

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route
            path="/blog/admin"
            element={
              <ProtectedRoute>
                <BlogAdmin />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route
            path="/ncadmin"
            element={
              <ProtectedRoute>
                <NCAdmin />
              </ProtectedRoute>
            }
          />
        </Routes>

        <footer className="py-16 border-t border-white/5">
          <div className="container">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
              <Link to="/" aria-label="Ir al inicio">
                <BrandLogo />
              </Link>
              <div className="flex items-center gap-8 text-sm font-medium text-brand-muted">
                <Link to="/blog" className="hover:text-white transition-colors">
                  Blog
                </Link>
                <a
                  href="https://wa.me/56929237511?text=Hola!%20Vengo%20desde%20la%20web%20de%20NexCommit%20y%20me%20gustar%C3%ADa%20m%C3%A1s%20informaci%C3%B3n."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  WhatsApp
                </a>
                <a href="#" className="hover:text-white transition-colors">
                  LinkedIn
                </a>
              </div>
            </div>
            <div className="text-center text-sm border-t border-white/5 pt-8 text-brand-footer">
              <p>&copy; {new Date().getFullYear()} NexCommit. Todos los derechos reservados.</p>
              <p className="mt-2 text-xs italic opacity-70">Mas que un proyecto, una alianza.</p>
            </div>
          </div>
        </footer>
      </div>
    </AuthProvider>
    </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
