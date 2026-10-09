import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Menu, X } from 'lucide-react';
import Home from './pages/Home';
import { BlogList } from './pages/blog/BlogList';
import { BlogPost } from './pages/blog/BlogPost';
const Admin = lazy(() => import('./pages/Admin'));
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import ServicesIndex from './pages/ServicesIndex';
import Services from './pages/Services';
import { AuthProvider } from './components/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { BrandLogo } from './components/Brand';
import SiteMeta from './components/SiteMeta';
import AdLanding from './pages/AdLanding';
import CreaTuWeb from './pages/CreaTuWeb';
import { ContactDock, WhatsAppLink } from './components/ContactButtons';
import CookieConsent, { resetCookieConsent } from './components/CookieConsent';
import { captureAdClick, GOOGLE_ADS } from './config/contact';
import { getAdLanding } from './data/ADS_LANDINGS';

const queryClient = new QueryClient();

/** Every navigation starts at the top of the new page (or at its #anchor). */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return null;
}

// Run before the first render so every WhatsApp link already carries the [Google] tag.
captureAdClick();
const GA_MEASUREMENT_ID = 'G-FBHZGW2YB7';

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const hideDock = isAdmin || location.pathname === '/login';
  const lpMatch = location.pathname.match(/^\/lp\/([^/]+)/);
  const dockTopic = lpMatch ? getAdLanding(lpMatch[1])?.topic : undefined;

  // Load the Google Ads tag (once).
  useEffect(() => {
    if (GOOGLE_ADS.conversionId && typeof window.gtag === 'function') {
      window.gtag('config', GOOGLE_ADS.conversionId);
    }
  }, []);

  useEffect(() => {
    if (typeof window.gtag !== 'function') return;
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: location.pathname + location.search,
    });
  }, [location.pathname, location.search]);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SiteMeta />
          <ScrollToTop />
          <div className={`${isAdmin ? '' : 'app-shell pb-24 md:pb-0'} w-full min-h-screen`}>
        {!isAdmin && (<>
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
              <Link to="/servicios" className="hover:text-white transition-colors duration-200">
                Servicios
              </Link>
              <Link to="/blog" className="hover:text-white transition-colors duration-200">
                Blog
              </Link>
              <WhatsAppLink
                  placement="nav"
                  className="hover:text-white transition-colors duration-200"
              >
                Contacto
              </WhatsAppLink>
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
                  to="/servicios"
                  className="text-white text-sm font-medium py-2 hover:text-brand-light transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Servicios
                </Link>
                <Link
                  to="/blog"
                  className="text-white text-sm font-medium py-2 hover:text-brand-light transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Blog
                </Link>
                <WhatsAppLink
                  placement="nav"
                  className="text-white text-sm font-medium py-2 hover:text-brand-light transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contacto
                </WhatsAppLink>
              </div>
            </div>
          )}
        </>)}

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/servicios" element={<ServicesIndex />} />
          <Route path="/servicios/:slug" element={<Services />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/blog/admin" element={<Navigate to="/admin" replace />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Suspense fallback={null}>
                  <Admin />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/lp/:slug" element={<AdLanding />} />
          <Route path="/crea-tu-web" element={<CreaTuWeb />} />
        </Routes>

        {!isAdmin && (<>
        <footer className="py-12 md:py-16 border-t border-white/5">
          <div className="container">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-10 md:mb-12">
              <Link to="/" aria-label="Ir al inicio" className="shrink-0">
                <BrandLogo />
              </Link>
              <nav
                aria-label="Pie de página"
                className="flex flex-wrap items-center justify-center md:justify-end gap-x-6 gap-y-3 text-sm font-medium text-brand-muted max-w-full"
              >
                <Link to="/servicios" className="hover:text-white transition-colors">
                  Servicios
                </Link>
                <Link to="/blog" className="hover:text-white transition-colors">
                  Blog
                </Link>
                <WhatsAppLink
                  placement="footer"
                  className="hover:text-white transition-colors"
                >
                  WhatsApp
                </WhatsAppLink>
                <Link to="/privacy" className="hover:text-white transition-colors">
                  Política de Privacidad
                </Link>
                <Link to="/terms" className="hover:text-white transition-colors">
                  Términos y Condiciones
                </Link>
                <button
                  type="button"
                  onClick={resetCookieConsent}
                  className="hover:text-white transition-colors"
                >
                  Cookies
                </button>
              </nav>
            </div>
            <div className="text-center text-sm border-t border-white/5 pt-8 text-brand-footer">
              <p>&copy; {new Date().getFullYear()} NexCommit. Todos los derechos reservados.</p>
              <p className="mt-2 text-xs italic opacity-70">Mas que un proyecto, una alianza.</p>
            </div>
          </div>
        </footer>
        </>)}
        {!hideDock && <ContactDock topic={dockTopic} />}
        {!isAdmin && <CookieConsent />}
      </div>
    </AuthProvider>
    </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
