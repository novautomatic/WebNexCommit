import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import BlogIndex from './pages/BlogIndex';
import PostDetail from './pages/PostDetail';
import NCAdmin from './pages/NCAdmin';
import Login from './pages/Login';
import { AuthProvider } from './components/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { BrandLogo } from './components/Brand';

function App() {
  return (
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
          <a href="/" aria-label="Ir al inicio">
            <BrandLogo />
          </a>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-brand-muted">
            <a href="/blog" className="hover:text-white transition-colors duration-200">
              Blog
            </a>
            <a
              href="https://wa.me/56929237511?text=Hola!%20Vengo%20desde%20la%20web%20de%20NexCommit%20y%20me%20gustar%C3%ADa%20m%C3%A1s%20informaci%C3%B3n."
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors duration-200"
            >
              Contacto
            </a>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/blog/:slug" element={<PostDetail />} />
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
              <a href="/" aria-label="Ir al inicio">
                <BrandLogo />
              </a>
              <div className="flex items-center gap-8 text-sm font-medium text-brand-muted">
                <a href="/blog" className="hover:text-white transition-colors">
                  Blog
                </a>
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
  );
}

export default App;
