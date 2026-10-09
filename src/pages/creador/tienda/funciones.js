// Menú del panel de la tienda (/mi-tienda). Solo «Ventas», «Productos» y
// «Mi cuenta» funcionan en la versión gratuita; el resto existe para mostrar
// todo lo que la tienda puede crecer: al hacer clic abre «Desbloquear para
// más» con un CTA a NexCommit (patrón de módulos por plan de RestoMax).
import {
  BadgePercent, BarChart3, Bot, Boxes, CreditCard, FileSpreadsheet, FileText, Globe, Heart, Instagram,
  KeyRound, Layers, LayoutDashboard, Mail, Megaphone, Package, Palette, Receipt, Search, Shirt, ShoppingCart,
  Star, Tags, Truck, UserCog, Users,
} from 'lucide-react';

export const GRUPOS = [
  {
    titulo: 'Mi tienda',
    items: [
      { id: 'ventas', label: 'Ventas', icon: ShoppingCart },
      { id: 'productos', label: 'Productos', icon: Package },
      { id: 'dashboard', label: 'Estadísticas', icon: LayoutDashboard, bloqueada: true,
        detalle: 'Visitas, productos más vistos, conversión y ventas por día en un tablero.' },
    ],
  },
  {
    titulo: 'Ventas',
    items: [
      { id: 'pagos', label: 'Pagos online', icon: CreditCard, bloqueada: true,
        detalle: 'Cobra con Webpay, Mercado Pago o transferencia sin salir de tu tienda.' },
      { id: 'envios', label: 'Envíos y despacho', icon: Truck, bloqueada: true,
        detalle: 'Zonas y costos de despacho, retiro en tienda y seguimiento de pedidos.' },
      { id: 'cupones', label: 'Cupones y descuentos', icon: BadgePercent, bloqueada: true,
        detalle: 'Códigos de descuento, ofertas por tiempo limitado y precios por volumen.' },
      { id: 'boletas', label: 'Boletas y facturas', icon: Receipt, bloqueada: true,
        detalle: 'Emite boletas y facturas electrónicas del SII automáticamente.' },
    ],
  },
  {
    titulo: 'Catálogo',
    items: [
      { id: 'categorias', label: 'Categorías', icon: Tags, bloqueada: true,
        detalle: 'Ordena tus productos por categorías y filtros para que encuentren todo rápido.' },
      { id: 'inventario', label: 'Inventario y stock', icon: Boxes, bloqueada: true,
        detalle: 'Controla el stock y oculta automáticamente lo que se agota.' },
      { id: 'variantes', label: 'Tallas y colores', icon: Shirt, bloqueada: true,
        detalle: 'Variantes por producto: tallas, colores, sabores o tamaños, cada una con su precio.' },
      { id: 'importar', label: 'Importar desde Excel', icon: FileSpreadsheet, bloqueada: true,
        detalle: 'Sube cientos de productos de una vez desde una planilla.' },
      { id: 'mas_productos', label: 'Más de 10 productos', icon: Layers, bloqueada: true,
        detalle: 'Catálogo ilimitado para todos tus productos.' },
    ],
  },
  {
    titulo: 'Clientes',
    items: [
      { id: 'clientes', label: 'Clientes', icon: Users, bloqueada: true,
        detalle: 'Tu base de clientes con su historial de compras y datos de contacto.' },
      { id: 'resenas', label: 'Reseñas', icon: Star, bloqueada: true,
        detalle: 'Opiniones verificadas de tus compradores en cada producto.' },
      { id: 'fidelizacion', label: 'Fidelización', icon: Heart, bloqueada: true,
        detalle: 'Puntos y beneficios para que tus clientes vuelvan a comprar.' },
    ],
  },
  {
    titulo: 'Marketing',
    items: [
      { id: 'chatbot', label: 'Chatbot con IA', icon: Bot, bloqueada: true,
        detalle: 'Un asistente que responde y vende por WhatsApp, Instagram y tu web las 24 horas.' },
      { id: 'redes', label: 'Instagram y Facebook Shop', icon: Instagram, bloqueada: true,
        detalle: 'Conecta tu catálogo para vender directo desde tus redes sociales.' },
      { id: 'campanas', label: 'Campañas por correo', icon: Mail, bloqueada: true,
        detalle: 'Envía novedades y ofertas a tus clientes con diseños listos.' },
      { id: 'seo', label: 'Google y SEO', icon: Search, bloqueada: true,
        detalle: 'Aparece en Google con tu tienda optimizada y medición de visitas.' },
      { id: 'anuncios', label: 'Anuncios', icon: Megaphone, bloqueada: true,
        detalle: 'Campañas en Google y Meta Ads conectadas a tus ventas.' },
    ],
  },
  {
    titulo: 'Configuración',
    items: [
      { id: 'dominio', label: 'Dominio propio', icon: Globe, bloqueada: true,
        detalle: 'Tu tienda en tunegocio.cl, con certificado de seguridad incluido.' },
      { id: 'correos', label: 'Correos corporativos', icon: FileText, bloqueada: true,
        detalle: 'Correos profesionales como ventas@tunegocio.cl.' },
      { id: 'equipo', label: 'Usuarios del equipo', icon: UserCog, bloqueada: true,
        detalle: 'Invita a tu equipo con permisos para ventas, productos o despacho.' },
      { id: 'reportes', label: 'Reportes y exportar', icon: BarChart3, bloqueada: true,
        detalle: 'Descarga tus ventas y productos en Excel para tu contabilidad.' },
      { id: 'cuenta', label: 'Mi cuenta', icon: KeyRound },
      { id: 'diseno', label: 'Diseño de mi página', icon: Palette, enlace: '/crea-tu-web' },
    ],
  },
];

export const TODAS = GRUPOS.flatMap((g) => g.items);
