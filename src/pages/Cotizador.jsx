import { useState, useMemo } from 'react';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const LOGO_LIGHT = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wgARCAEaA2ADASIAAhEBAxEB/8QAGwABAQADAQEBAAAAAAAAAAAAAAECAwQFBgf/xAAYAQEBAQEBAAAAAAAAAAAAAAAAAQIDBP/aAAwDAQACEAMQAAAC6kAAAAAAAAAAAApFgWAApFEURRFEURRFgUQApFEAKRRFEUSiRSxRFEURYAAFEURRFEUQABRFEURYAMM8DMAAAAAAAQpQQAlAUAIFgsFAEABQAQAFRSRQliglQVKAEqgAABACWAWALC0QIWFFgWIsS0AACWAUwzwMwFQlgFgKAAAABQAAgKACAoAAAAAQAFAAJYgKAogAAShQQRVSwllAgKUAgKliFSpRBQFSwBBQIxyxXIFEJRBXx8Oy4dOmcQ1O2cTU7b08BkfpDWbPOgUUgKhKhahKAFEAQVQgAAAKAACEqosFhKgqFogAQUsBUpIAAChQABCoALAAWAICxjliuQFiKCLKfH7D8983fcLvGA1mlTPueE9U13r5fXnsFAHmT0ue3xmFBKFgFlJQCAoCAqEoUIEoChAEsUIqAAKoQFBIFKSFAAUCAAAABAUUgGOWJkAACywBGr2g/NXVcr0xbMtZtmVzsux/P91jfTjn1Aajb6hOI/Rfzn9Fs9QmgQABYWoigACksAAFiLCgSoKgsFAAABAWoKgsqJSoCoSpVQQAAAFBAFhQGOWJkAEWVQIEAcp1cPze7PWdeeWfyz1j65Y/XWOg3fD9Ry67Ac+rUbfUHD/ov53+i2ekTRpfantCgGj96e0KsRUVYFgBAWAHw1tm5aL72bZ8/pnQAAAKCAApRKhYBYAAgABqfXrPrGdggAKAEBYxyxXJYAiwtQWAAB8+F77yXPBXPDryz+/wy1j2ffxevpx6r7830Xm9WWp22px24f8ARfzr9FufTLJr89+f08m8fo/34TucayC/nfR850Vz0QmgAAAAAGiy0Hbljs977E5/ydWzrhupy+qekc+oICgAAgLUJULUFQVACAAum9ntbw1mz0SezY6XdAY2CgBAUxyxMgAgKAoIAAGr439G0Gsc1ljl245Z4Zax7dxzno1y7PUeryeT3cT+jfnP6Mvplk1+e+zx7/WeW6T0cmfpjV7TOvzzouc6PWei8n3/AD7N92s3PRVxG/2XI2foXN/bcZvK9h+ebzU6jRerijZdj4vfLxHQ8r3nfl9x5+oKWDVzT9eL4dZ99Tld/wCXQWdr4/v5eHbXY6vpfRw5/PrtZnX283PbazyYdd883U7vjeiXYct1PGXO803v368httry2s9HoL0ubyfp6jn9Td/XQb/h20vr1mw6c/Dq+w0W54Pt7tynh2Mvn7hKAWKCMcsVyACAAqwAAAOd9PI6xllhl2455YW5+nqz3OuHr8W503l9/E/o35z+jr6BNfnnQ890Vz0HH9jhL+dd/wAR9dTy9HznRn34/rOTOzvO2XotJ8afPueV6uNdw36LwWp8ul5XtrNrMmNfnnd8puO/Ldjh2BAXkN/zfU+jh6x5+7nOj0HXl9vV5PUmi63lupoOPXh+w5DtPRxzHn7899cMvR597xXa8Sdj9Tz93PdDz/Xn6NxrNnm3X7DwZ1pun5fqOvPndhrtjrOy0W+0XPf03Go26hz2AUIKCMcsVyAAEBQIACtf6OEufmjryyuP11mbXH7d/N6d78/R5PU0+41PP0cN+jfnP6Nc+kk1+e9Fz3RXPQCa8vA/pGns4rq+U6uzbfn36Zz8vq235psDu/FyPhP0i6rxRrfh5e91NHz36Lxp1Xp4Pupdfy/dajpz9Hv4f12da5n4ZvQ5ct0laj7bvlt565zHp563XJtp157D57DwcO2m6jmOn3iyzl14ns+O7Dvx+g4dtDljl6OG84vtOMTsx5/Q5/oNB05+zaavZ51fB7vDLpOp5fqOvPndjrtlc7HR7vwc+nm3HI7Lrz3jxe3h2CUAFAY5YmcsAAAAAGGXGJ5vHHXnbPVrE9nzy9Hn+nQ+Pe8Owef0tVtdUcL+jfnX6LZ6RNa70+ggALrPX6AlHl1e+Jo9p6CzV7UeT1gwzGq9/wBgBj4Nis0/o2CyUzQPF8tk1nzelc6mH0h5fUpFL4faJZUvmehY8XtBRPP6YfL7A+f0Hj9dh5vt9BFL5fhsZc/L6koAAADHLFc5YgKAACDQnj56Xpi16d879MHbj9Nh4+x59PpTzemkGq2urOF/Rfzz9Es9AmikgUEBQQAAogAAABVBAWUQAFAAAAAQKlQAFAAAAAAAAQQFBGOWK5kRYUICweI+HEZ/PeX0fbpztxvTlc/n1Odez2Hm9IAAKABYIAAAACrKEBYFEAAsoIlQAVBUoCggKIAgAFACgAAAAAAQIACgjHLFc5YgqpYAefiO/J+c5/oTU4G961ng/p3A026MbCAAAUEBQQAsUUiwAAWCiAIsoEWVUsAAQAAAFAsEBQARQBQgKAAAASwABAUBjliZwFgsAAAAAUgAAAQFAAABAUCwAAAARYUABZUiiBQAAQFAAAABAKFAAACAAogAAAABGOWK5AAAAAABFgqFABAAUAAAAAAAAAAAAABYKgAsAAAAAAAAACoAFhKhagqAAAAAAABhhngZpDJBUFQVBUFQVBUFQVBUFQVBUFQVBUFQVBUFQVBUFQVBUFQVBUFQVBUFQVBUFQVjSoKgqCoKgqCoKgqCoKgqCoKgqC4ZYH//aAAwDAQACAAMAAAAh88888888888840084wwwwww0w84w84wwwhwwww088wwwww88www08A8888888+gCCSAAE0sACCAACCAxxU9NJBIAAACCW99sCGc01uCCCW8U8yW9488888AABAABAAAAAACCAAAV88hBBCACMKU98wBAVyS88KC89A8CS8vO7PR848NMNBAE94CCCCAAACQ0tNMCCGhAR999AAAEM8c8s+9A8uC0scUb0Z885509A8ogCAA8NACE8BBU+O+8BAB8x5BAA88889848A888U9JY4dnU81fU999sOCCAU88uc9NNc88898MMSg8NId999899s8A89oA9tDAZ7P1tzwx0810uMcc+95/759998998wkc08999389988+9A09sMc8sb3njDgTUBHgXQwww04wMhof8x88818BMMIM918wzb988+8A8988gc8szQ2O7rUQJ0dbWRvFNmAV80z5V2SD+bK1+K7A2+Qd99909A8998s884DZ27n7ArzpRx4Sbflx6U98A8tvs9E8/u289WEYzc99xc9A88+8994TlBg34/E/AAG8yybm/oUGjQkeMSeVW9LvV+ue8KJ499988AU88888vkjYp9tzMVdsAcTS4ks0MMMdtt6l6wOS++x2hB2iw299999EV8889lhPHf8ARebfMfPfPffcffffeAQIQQAAAAAHCQQAAAAAAAAHfPXBbPvYaKq59/fbDPHfffffKDNMPPKBTfTSQAQBPffQQAAAAAAAPffPdFeFPM7rHgHfffPfPfdONPPLAgtPaFPPffffPHfPPYQAgAAAAFPPfPDHLHPLDPOPPPPfPPPPfPHPPPbPPKcfPPPfPPPPPfQAAAAggDPPPPPcPPPPPPPbTPPefPPPPPPNPPPPPPPLDPHPPPPPPPPPDPLTDDPPONPPPFJAALAFDDDDDAAILHFPIEMAENPPPPPONPPNMMMOMPPPPMNMMHPDBBCCP/aAAwDAQACAAMAAAAQ8+84a888888840084wwwwww0w84w84wwwhwwww048wwwww88www0o8888sUww+gCCSAAE0sACCAACCAxxU5NJBIAAACCW/8AbAhnNNbgggloL/MlqRAAEPPAAAQAAQAAAAAAggAAFfPIQQQgAjClPfMAQFckvPCgvC6/AkqFoLSY9OPDTjQQBPeAggggAAAkNLTTAghoQEfffQAABDPHPLPi/wDy4LRpsbZ8XTyUtj0DyiAIADw0AITwEFT477wEAHzHkEADzzz7/wA4o9888Utj54OOw4bNo999sOCCAU88uc9NPc88898MMSg8NId9/wD/AK/2yj/z2gD3lvozY4leEwtDgMi4xxz6EUzobf31z33zCRzTz33kjDX/AO8+p/2/sMc8cxUiJzaE8EcaPsEMYY0A9XXrQ504w54NEIEE55k9dc188+o9+/8APIHPOH7rafJvX1OgIMgXRj/JaTBAiu0unKfuT4MmgQ22vh/fdKb/ALv3yzziR6xNoBipI9yRTsVLz/fKj3gDTC1llLw9dX3VPI2HX33Fyn/zz7TW0S2dkTZbywib8DsRk3ezU91t/Str2JE73yZ4q0uI8/TH33zj9TzyzTga85IV0OiAuMK7D0zb5qrxiw800udmA9J45GWJOXKBd733/wB7V88s5PATs8/FDTUx+/8Ar3/cffffeAQIQQAAAAAHCQQAAAAAEAAHfPYxbPpX/wBa68j30hTx3/3/AP8AKDNMPPKBT/zyQAQBP/8A0EAAAAAAAD33z0tXhSiBx9yWEX+j/wC7904088sCC09oU8//AP8A/wC8d88/hACAAAAAU898szcsc8c8MIMM894e+2/88c8889s8+rz+++/++++89/AAAACCAM+8889PwwwwwwxhAwhX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";

const projects = [
  {
    name: 'Landing Page', price: 250000, weeks: 1, includedKeys: [],
    includes: ['Diseño UX/UI personalizado', 'Responsive', 'Hasta 5 secciones', 'Formulario de contacto', 'Botón WhatsApp', 'SEO básico', '1 integración simple', '2 revisiones']
  },
  {
    name: 'Sitio Corporativo', price: 580000, weeks: 3, includedKeys: [],
    includes: ['Diseño UX/UI personalizado', 'Responsive', 'Estructura corporativa', 'Hasta 8 secciones', 'Formulario de contacto', 'Botón WhatsApp', 'SEO básico ampliado', 'Carga inicial de contenido', '1 integración simple', '3 revisiones']
  },
  {
    name: 'Ecommerce', price: 890000, weeks: 4, includedKeys: ['supabase', 'postgresql', 'vercel_deploy', 'basic_admin_panel', 'product_management', 'order_management', 'stock_management', 'basic_coupons', 'product_variants', 'basic_transactional_emails', 'content_management'],
    includes: ['Diseño UX/UI personalizado', 'Responsive', 'Estructura corporativa', 'Hasta 8 secciones', 'Catálogo', 'Hasta 50 productos', 'Carrito de compras', 'Checkout', '1 pasarela de pago base', 'Panel admin básico', 'Gestión de productos', 'Pedidos', 'Stock', 'Cupones básicos', 'Variantes', 'Emails transaccionales básicos', 'Gestión contenidos', 'Supabase/PostgreSQL', 'Deploy en Vercel', '3 revisiones']
  },
  {
    name: 'Plataforma Operacional', price: 1750000, weeks: 8, includedKeys: ['supabase', 'postgresql', 'vercel_deploy', 'basic_admin_panel', 'full_admin_panel', 'users_roles', 'basic_permissions', 'product_management', 'order_management', 'stock_management', 'content_management', 'customer_management', 'basic_reports', 'basic_export', 'custom_internal_flows'],

    includes: ['Diseño UX/UI personalizado', 'Responsive', 'Panel administrativo completo', 'Usuarios y roles', 'Permisos básicos', 'Dashboard operacional básico', 'Gestión de productos', 'Pedidos', 'Stock', 'Gestión contenidos', 'Gestión de clientes/usuarios', 'Reportes básicos', 'Exportación básica', 'Flujos internos personalizados', 'Base de datos Supabase/PostgreSQL', 'Deploy en Vercel']
  },
  {
    name: 'SaaS', price: 3500000, weeks: 10, includedKeys: ['supabase', 'postgresql', 'vercel_deploy', 'basic_admin_panel', 'full_admin_panel', 'users_roles', 'basic_permissions', 'product_management', 'order_management', 'stock_management', 'content_management', 'customer_management', 'basic_reports', 'basic_export', 'custom_internal_flows', 'auth', 'user_management', 'plans_access_levels', 'admin_panel', 'user_panel'],
    includes: ['Diseño UX/UI personalizado', 'Responsive', 'Panel administrativo completo', 'Usuarios y roles', 'Permisos básicos', 'Dashboard operacional básico', 'Gestión de productos', 'Pedidos', 'Stock', 'Gestión contenidos', 'Gestión de clientes/usuarios', 'Reportes básicos', 'Exportación básica', 'Flujos internos personalizados', 'Base de datos Supabase/PostgreSQL', 'Deploy en Vercel', 'Arquitectura SaaS inicial', 'Registro e inicio de sesión', 'Gestión de usuarios', 'Planes o niveles de acceso', 'Panel administrador', 'Panel usuario/cliente', 'Roles y permisos', 'Dashboard principal', 'Notificaciones básicas', 'Logs básicos', 'Documentación funcional básica']
  },
  {
    name: 'Enterprise', price: 6000000, weeks: 12, includedKeys: ['supabase', 'postgresql', 'vercel_deploy', 'basic_admin_panel', 'full_admin_panel', 'users_roles', 'basic_permissions', 'advanced_permissions', 'product_management', 'order_management', 'stock_management', 'content_management', 'customer_management', 'basic_reports', 'advanced_reports', 'basic_export', 'custom_internal_flows', 'auth', 'user_management', 'plans_access_levels', 'admin_panel', 'user_panel'],
    includes: ['Diseño UX/UI personalizado', 'Responsive', 'Panel administrativo completo', 'Usuarios y roles', 'Permisos básicos', 'Permisos avanzados', 'Dashboard operacional básico', 'Dashboard ejecutivo', 'Gestión de productos', 'Pedidos', 'Stock', 'Gestión contenidos', 'Gestión de clientes/usuarios', 'Reportes básicos', 'Reportes avanzados', 'Exportación básica', 'Flujos internos personalizados', 'Base de datos Supabase/PostgreSQL', 'Deploy en Vercel', 'Arquitectura SaaS inicial', 'Registro e inicio de sesión', 'Gestión de usuarios', 'Planes o niveles de acceso', 'Panel administrador', 'Panel usuario/cliente', 'Roles y permisos', 'Dashboard principal', 'Notificaciones básicas', 'Logs básicos', 'Arquitectura dedicada', 'Preparación para alta concurrencia', 'Módulos empresariales personalizados', 'Integración API avanzada', 'Preparación para ERP', 'BI inicial', 'Seguridad reforzada']
  },
];

const SERVICE_COPY = {
  ux_ui: { label: 'Diseño UX/UI personalizado', description: 'Diseño adaptado al negocio para que el cliente final entienda rápido la oferta y avance con menos fricción.' },
  responsive: { label: 'Responsive', description: 'La solución se adapta a celular, tablet y computador para no perder oportunidades por mala visualización.' },
  contact_form: { label: 'Formulario de contacto', description: 'Permite recibir consultas o solicitudes de forma ordenada, sin depender solo de WhatsApp.' },
  whatsapp_button: { label: 'Botón WhatsApp', description: 'Facilita que prospectos y clientes contacten en un clic, acelerando cotizaciones y cierres.' },
  basic_seo: { label: 'SEO básico', description: 'Se deja una base técnica ordenada para que Google entienda el sitio y pueda indexarlo correctamente.' },
  basic_seo_extended: { label: 'SEO básico ampliado', description: 'Incluye una estructura más sólida para mejorar visibilidad orgánica en búsquedas relevantes del negocio.' },
  scalable_structure: { label: 'Estructura corporativa', description: 'El sitio queda ordenado para presentar mejor la empresa, sus servicios y su propuesta de valor.' },
  catalog: { label: 'Catálogo', description: 'Muestra productos de forma clara para que el cliente compare opciones y avance a compra con menos dudas.' },
  cart: { label: 'Carrito de compras', description: 'Permite acumular productos y aumentar el ticket promedio antes de pagar.' },
  checkout: { label: 'Checkout', description: 'Proceso de compra estructurado para que el cliente termine el pedido con menos abandono.' },
  one_payment_gateway_base: { label: '1 pasarela de pago base', description: 'Permite cobrar online de manera formal y automática sin depender de transferencias manuales.' },
  basic_admin_panel: { label: 'Panel admin básico', description: 'Da control inicial para administrar información clave sin pedir cambios técnicos cada vez.' },
  full_admin_panel: { label: 'Panel administrativo completo', description: 'Centraliza la operación diaria para revisar, editar y controlar procesos desde un solo lugar.' },
  product_management: { label: 'Gestión de productos', description: 'Permite crear, editar y actualizar productos de forma más rápida y ordenada.' },
  order_management: { label: 'Pedidos', description: 'Ayuda a revisar el estado de cada venta y reducir errores en seguimiento y despacho.' },
  stock_management: { label: 'Stock', description: 'Permite controlar disponibilidad para evitar vender productos agotados o desordenar la operación.' },
  basic_coupons: { label: 'Cupones básicos', description: 'Permite activar promociones simples para mover ventas y apoyar campañas comerciales.' },
  product_variants: { label: 'Variantes', description: 'Facilita vender versiones de un mismo producto sin duplicar fichas ni complicar la gestión.' },
  basic_transactional_emails: { label: 'Emails transaccionales básicos', description: 'Envía confirmaciones y avisos automáticos para dar más confianza después de cada acción.' },
  content_management: { label: 'Gestión contenidos', description: 'Permite actualizar textos, bloques o secciones clave sin rehacer el sitio completo.' },
  customer_management: { label: 'Gestión de clientes/usuarios', description: 'Ordena la información de clientes para dar mejor seguimiento comercial y operativo.' },
  supabase: { label: 'Supabase/PostgreSQL', description: 'Base sólida para guardar y consultar datos críticos del negocio de forma centralizada.' },
  postgresql: { label: 'PostgreSQL avanzado', description: 'Estructura robusta para manejar información con mayor estabilidad y proyección de crecimiento.' },
  vercel_deploy: { label: 'Deploy en Vercel', description: 'Publicación profesional para que la solución quede online con buen rendimiento inicial.' },
  users_roles: { label: 'Usuarios y roles', description: 'Permite definir quién entra al sistema y qué puede hacer cada perfil dentro de la operación.' },
  basic_permissions: { label: 'Permisos básicos', description: 'Restringe funciones sensibles para evitar errores operativos por accesos innecesarios.' },
  advanced_permissions: { label: 'Permisos avanzados', description: 'Entrega un control más fino por área, cargo o tipo de usuario dentro de la operación.' },
  basic_reports: { label: 'Reportes básicos', description: 'Entrega visibilidad rápida sobre la operación para tomar decisiones con menos intuición y más datos.' },
  advanced_reports: { label: 'Reportes avanzados', description: 'Permite analizar mejor tendencias, rendimientos y desvíos para gestionar con más precisión.' },
  basic_export: { label: 'Exportación básica', description: 'Facilita sacar información a Excel o planillas para revisión, respaldo o análisis externo.' },
  custom_internal_flows: { label: 'Flujos internos personalizados', description: 'Adapta procesos clave a la forma real en que opera el negocio, reduciendo trabajo manual.' },
  dashboard_basic: { label: 'Dashboard operacional básico', description: 'Muestra indicadores principales en un solo vistazo para seguir la operación diaria.' },
  executive_dashboard: { label: 'Dashboard ejecutivo', description: 'Entrega una visión más estratégica para revisar desempeño global y apoyar decisiones de gerencia.' },
  saas_architecture: { label: 'Arquitectura SaaS inicial', description: 'Deja una base preparada para crecer como producto digital con múltiples usuarios o cuentas.' },
  auth: { label: 'Registro e inicio de sesión', description: 'Permite acceso seguro para usuarios y clientes sin depender de gestiones manuales.' },
  user_management: { label: 'Gestión de usuarios', description: 'Facilita altas, cambios y control de usuarios dentro de la plataforma.' },
  plans_access_levels: { label: 'Planes o niveles de acceso', description: 'Permite diferenciar funcionalidades según tipo de cliente o plan contratado.' },
  admin_panel: { label: 'Panel administrador', description: 'Concentra la administración general del producto o negocio en un entorno controlado.' },
  user_panel: { label: 'Panel usuario/cliente', description: 'Entrega autonomía al cliente para revisar información y ejecutar acciones por sí mismo.' },
  structured_database: { label: 'Base de datos estructurada', description: 'Organiza la información para que el sistema siga siendo mantenible a medida que crece.' },
  roles_permissions: { label: 'Roles y permisos', description: 'Separa responsabilidades y limita accesos según perfil para operar con más orden.' },
  main_dashboard: { label: 'Dashboard principal', description: 'Resume el estado general de la plataforma y acelera la lectura de métricas clave.' },
  manual_subscription_access: { label: 'Acceso manual por suscripción', description: 'Permite controlar activaciones iniciales de clientes o cuentas mientras se valida el modelo comercial.' },
  basic_email_notifications: { label: 'Notificaciones básicas', description: 'Mantiene informados a usuarios y equipo sobre acciones importantes sin seguimiento manual.' },
  basic_activity_logs: { label: 'Logs básicos', description: 'Entrega trazabilidad para revisar acciones importantes y resolver incidencias con más claridad.' },
  dedicated_architecture: { label: 'Arquitectura dedicada', description: 'Prepara una infraestructura más robusta para operaciones con mayor exigencia técnica.' },
  high_concurrency_ready: { label: 'Preparación para alta concurrencia', description: 'Ayuda a responder mejor cuando hay muchos usuarios o procesos activos al mismo tiempo.' },
  enterprise_modules: { label: 'Módulos empresariales personalizados', description: 'Permite cubrir necesidades específicas del negocio que no resuelve una solución genérica.' },
  erp_ready: { label: 'Preparación para ERP', description: 'Facilita futuras integraciones con sistemas centrales de administración o inventario.' },
  initial_bi: { label: 'BI inicial', description: 'Crea una base de lectura de datos para comenzar a medir áreas relevantes del negocio.' },
  reinforced_security: { label: 'Seguridad reforzada', description: 'Agrega medidas extra para proteger accesos, datos sensibles y operación crítica.' },
  flow: { label: 'Flow', description: 'Permite cobrar online de forma práctica y automatizar confirmaciones de pago.' },
  mercado_pago: { label: 'Mercado Pago', description: 'Abre una alternativa de pago conocida para facilitar conversiones en distintos perfiles de cliente.' },
  transbank: { label: 'Transbank / Webpay', description: 'Integra una pasarela reconocida en Chile para dar más confianza al momento de pagar.' },
  stripe: { label: 'Stripe', description: 'Facilita cobros online con una pasarela ampliamente usada, útil en modelos más escalables.' },
  fintoc: { label: 'Fintoc', description: 'Permite conectar cobros o validaciones bancarias con una experiencia más directa.' },
  subscriptions: { label: 'Suscripciones', description: 'Permite cobrar de forma recurrente y ordenar ingresos mensuales del negocio.' },
  multi_payment_gateway: { label: 'Multi pasarela de pago', description: 'Da flexibilidad para ofrecer más de una opción de cobro y reducir fricción en pago.' },
  uber_direct: { label: 'Uber Direct', description: 'Permite sumar reparto de última milla y mejorar tiempos de entrega al cliente final.' },
  correos_chile: { label: 'CorreosChile', description: 'Facilita operar despachos con un proveedor logístico conocido y trazable.' },
  chilexpress: { label: 'Chilexpress', description: 'Permite calcular y gestionar envíos con una logística habitual para ecommerce en Chile.' },
  starken: { label: 'Starken', description: 'Suma una alternativa de despacho útil para ampliar cobertura y opciones de entrega.' },
  order_tracking: { label: 'Tracking de pedidos', description: 'Permite que el cliente y el equipo sepan en qué etapa va cada pedido.' },
  shipping_quote: { label: 'Cotizador de despacho', description: 'Entrega un valor de envío antes del pago para evitar fricción y reclamos posteriores.' },
  hubspot: { label: 'HubSpot', description: 'Ordena contactos y seguimiento comercial para no depender de planillas o mensajes dispersos.' },
  activecampaign: { label: 'ActiveCampaign', description: 'Permite automatizar seguimiento comercial y campañas según comportamiento del lead.' },
  gohighlevel: { label: 'GoHighLevel', description: 'Concentra gestión comercial, automatizaciones y seguimiento en una sola herramienta.' },
  custom_crm_base: { label: 'CRM personalizado base', description: 'Entrega un flujo comercial adaptado al negocio, no forzado a una herramienta genérica.' },
  whatsapp_api: { label: 'WhatsApp API', description: 'Permite automatizar conversaciones y ordenar contacto comercial a mayor escala.' },
  email_marketing: { label: 'Email marketing', description: 'Ayuda a reactivar contactos, nutrir leads y sostener campañas con menos trabajo manual.' },
  resend: { label: 'Resend', description: 'Facilita el envío técnico de correos automáticos del sistema de forma más estable.' },
  twilio: { label: 'Twilio', description: 'Abre opciones de mensajería y comunicaciones para flujos automáticos del negocio.' },
  basic_ai_chatbot: { label: 'Chatbot IA básico', description: 'Responde preguntas frecuentes y reduce carga operativa en atención repetitiva.' },
  trained_ai_chatbot: { label: 'Chatbot entrenado', description: 'Entrega respuestas más alineadas al negocio, mejorando calidad en atención automática.' },
  sales_ai_agent: { label: 'Agente IA ventas', description: 'Ayuda a calificar, responder y mover oportunidades comerciales con mayor velocidad.' },
  voice_ai: { label: 'Voice AI', description: 'Permite automatizar interacciones por voz para atención o seguimiento en ciertos procesos.' },
  support_ai: { label: 'IA soporte', description: 'Reduce tiempos de respuesta y ordena la atención de clientes o usuarios.' },
  lead_classification_ai: { label: 'IA clasificación leads', description: 'Prioriza contactos con mayor potencial para enfocar mejor el tiempo comercial.' },
  ai_reports: { label: 'IA reportes', description: 'Resume información clave y facilita lectura ejecutiva de resultados o desvíos.' },
  commercial_dashboard: { label: 'Dashboard comercial', description: 'Muestra avance de ventas, oportunidades y estados clave para seguimiento del equipo.' },
  multi_branch: { label: 'Multi sucursal', description: 'Permite operar distintas sedes o puntos de atención dentro de una misma solución.' },
  billing: { label: 'Facturación', description: 'Ordena emisión o gestión ligada a cobros para reducir pasos manuales de administración.' },
  reservations: { label: 'Reservas', description: 'Permite agendar cupos, horas o espacios de forma más clara y ordenada.' },
  kds: { label: 'KDS cocina', description: 'Organiza pedidos en cocina para reducir errores, tiempos muertos y confusiones del equipo.' },
  audit_logs: { label: 'Logs y auditoría', description: 'Permite revisar quién hizo qué dentro del sistema para mayor control operativo.' },
  whatsapp_followup: { label: 'Seguimiento WhatsApp', description: 'Automatiza mensajes de seguimiento para no enfriar oportunidades comerciales.' },
  cart_recovery: { label: 'Recuperación carrito', description: 'Busca rescatar ventas no terminadas antes de que el cliente se pierda.' },
  lead_scoring: { label: 'Lead scoring', description: 'Ordena leads según calidad o intención para priorizar mejor el esfuerzo comercial.' },
  crm_pipeline: { label: 'Pipeline CRM', description: 'Hace visible en qué etapa está cada oportunidad para mover ventas con más control.' },
  email_sequence: { label: 'Secuencia emails', description: 'Permite nutrir contactos y sostener seguimiento sin enviar correos manualmente.' },
  automatic_reports: { label: 'Reportes automáticos', description: 'Entrega información periódica sin tener que armarla a mano cada vez.' },
  internal_alerts: { label: 'Alertas internas', description: 'Notifica eventos importantes para reaccionar más rápido ante ventas, errores o pendientes.' },
  webhooks: { label: 'Webhooks', description: 'Permiten conectar eventos del sistema con otras herramientas en tiempo real.' },
  etl_sync: { label: 'ETL / sincronización', description: 'Ayuda a mover y ordenar datos entre sistemas para evitar dobles trabajos.' },
  erp_integration: { label: 'Integración ERP', description: 'Conecta procesos críticos con sistemas de gestión más amplios del negocio.' },
  controlled_scraping: { label: 'Scraping controlado', description: 'Permite recopilar información útil para operación o análisis bajo reglas definidas.' },
  automatic_quote: { label: 'Cotización automática', description: 'Reduce tiempo comercial al generar propuestas más rápido y con menos intervención manual.' },
  automatic_scheduling: { label: 'Agendamiento automático', description: 'Permite coordinar horas o reuniones con menos ida y vuelta operativa.' },
  basic_hosting: { label: 'Hosting básico', description: 'Mantiene el proyecto online con un costo controlado para operaciones simples.' },
  enterprise_hosting: { label: 'Hosting empresarial', description: 'Entrega una base más robusta para proyectos con mayor exigencia o tráfico.' },
  basic_maintenance: { label: 'Mantención básica', description: 'Ayuda a mantener el proyecto operativo y actualizado en tareas esenciales.' },
  advanced_maintenance: { label: 'Mantención avanzada', description: 'Cubre un soporte más activo para ajustes, revisión y continuidad operacional.' },
  priority_support: { label: 'Soporte prioritario', description: 'Da tiempos de atención más rápidos cuando el proyecto es crítico para la operación.' },
  monitoring: { label: 'Monitoreo', description: 'Permite detectar caídas o problemas antes de que impacten demasiado al negocio.' },
  backups: { label: 'Backups', description: 'Genera respaldos para reducir riesgo frente a errores o pérdidas de información.' },
  chatbot_saas: { label: 'Chatbot SaaS', description: 'Entrega una capa mensual de atención automatizada lista para seguir operando.' },
  crm_saas: { label: 'CRM SaaS', description: 'Mantiene disponible la operación comercial sobre un sistema mensual en la nube.' },
  ecommerce_saas: { label: 'Ecommerce SaaS', description: 'Permite sostener la operación de venta online con componentes mensuales administrados.' },
  reservations_saas: { label: 'Reservas SaaS', description: 'Mantiene activo un sistema de agenda o reservas con soporte mensual.' },
  kds_saas: { label: 'KDS SaaS', description: 'Sostiene operación de cocina digital o flujo interno con una capa mensual de servicio.' },
  analytics_saas: { label: 'Analytics SaaS', description: 'Mantiene métricas y visibilidad continua del negocio dentro de un esquema mensual.' }
};

const TEXT_COPY = {
  'Hasta 5 secciones': 'Permite presentar lo esencial del negocio con una estructura clara y enfocada en conversión.',
  'Hasta 8 secciones': 'Da más espacio para ordenar servicios, confianza, preguntas frecuentes y contacto sin saturar.',
  '1 integración simple': 'Conecta una herramienta clave para evitar tareas manuales desde el primer día.',
  '2 revisiones': 'Incluye instancias de ajuste para afinar el resultado antes de publicar.',
  '3 revisiones': 'Entrega más margen de feedback para alinear mejor el proyecto con la operación real.',
  'Carga inicial de contenido': 'Deja el proyecto listo para salir con información base cargada y ordenada.',
  'Hasta 50 productos': 'Permite salir a vender con un catálogo inicial amplio sin cargar producto por producto después.',
  'Supabase/PostgreSQL': 'Base sólida para guardar y consultar datos críticos del negocio de forma centralizada.',
  'Base de datos Supabase/PostgreSQL': 'Base sólida para guardar y consultar datos críticos del negocio de forma centralizada.',
  'Preparación para alta concurrencia': 'Ayuda a responder mejor cuando hay muchos usuarios o procesos activos al mismo tiempo.',
  'Integración API avanzada': 'Deja la solución mejor preparada para conversar con sistemas externos de mayor complejidad.',
  'BI inicial': 'Crea una base de lectura de datos para comenzar a medir áreas relevantes del negocio.',
  'Documentación funcional básica': 'Deja una referencia útil para entender el flujo general del sistema y facilitar continuidad.'
};

const groups = {
  paymentItems: [
    ['Flow', 90000, false, 'flow'], ['Mercado Pago', 120000, false, 'mercado_pago'], ['Transbank / Webpay', 200000, false, 'transbank'], ['Stripe', 200000, false, 'stripe'], ['Fintoc', 250000, false, 'fintoc'], ['Suscripciones', 300000, false, 'subscriptions'], ['Multi pasarela de pago', 400000, false, 'multi_payment_gateway'],
  ],
  logisticsItems: [
    ['Uber Direct', 350000, false, 'uber_direct'], ['CorreosChile', 150000, false, 'correos_chile'], ['Chilexpress', 150000, false, 'chilexpress'], ['Starken', 150000, false, 'starken'], ['Tracking de pedidos', 150000, false, 'order_tracking'], ['Cotizador de despacho', 200000, false, 'shipping_quote'],
  ],
  crmItems: [
    ['HubSpot', 350000, false, 'hubspot'], ['ActiveCampaign', 300000, false, 'activecampaign'], ['GoHighLevel', 400000, false, 'gohighlevel'], ['CRM personalizado base', 950000, false, 'custom_crm_base'], ['WhatsApp API', 400000, false, 'whatsapp_api'], ['Email marketing', 150000, false, 'email_marketing'], ['Resend', 90000, false, 'resend'], ['Twilio', 250000, false, 'twilio'],
  ],
  aiItems: [
    ['Chatbot IA básico', 600000, false, 'basic_ai_chatbot'], ['Chatbot entrenado', 1000000, false, 'trained_ai_chatbot'], ['Agente IA ventas', 2500000, false, 'sales_ai_agent'], ['Voice AI', 4000000, false, 'voice_ai'], ['IA soporte', 1200000, false, 'support_ai'], ['IA clasificación leads', 700000, false, 'lead_classification_ai'], ['IA reportes', 900000, false, 'ai_reports'],
  ],
  infraItems: [
    ['Supabase', 120000, false, 'supabase'], ['PostgreSQL avanzado', 90000, false, 'postgresql'], ['Vercel deploy', 60000, false, 'vercel_deploy'], ['Arquitectura dedicada', 2000000, false, 'dedicated_architecture'], ['Microservicios', 3000000, false, 'microservices'], ['Alta concurrencia', 2500000, false, 'high_concurrency_ready'], ['BI avanzado', 1500000, false, 'advanced_reports'],
  ],
  adminItems: [
    ['Usuarios y roles', 200000, false, 'users_roles'], ['Permisos avanzados', 250000, false, 'advanced_permissions'], ['Inventario', 200000, false, 'stock_management'], ['Pedidos', 200000, false, 'order_management'], ['Reportes', 300000, false, 'basic_reports'], ['Dashboard comercial', 320000, false, 'commercial_dashboard'], ['Multi sucursal', 650000, false, 'multi_branch'], ['Facturación', 420000, false, 'billing'], ['Reservas', 320000, false, 'reservations'], ['KDS cocina', 900000, false, 'kds'], ['Logs y auditoría', 350000, false, 'audit_logs'], ['Exportación Excel', 150000, false, 'basic_export'], ['Gestión contenidos', 200000, false, 'content_management'], ['Gestión clientes', 250000, false, 'customer_management'],
  ],
  automationItems: [
    ['Seguimiento WhatsApp', 220000, false, 'whatsapp_followup'], ['Recuperación carrito', 280000, false, 'cart_recovery'], ['Lead scoring', 350000, false, 'lead_scoring'], ['Pipeline CRM', 420000, false, 'crm_pipeline'], ['Secuencia emails', 220000, false, 'email_sequence'], ['Reportes automáticos', 320000, false, 'automatic_reports'], ['Alertas internas', 150000, false, 'internal_alerts'], ['Webhooks', 200000, false, 'webhooks'], ['ETL / sincronización', 600000, false, 'etl_sync'], ['Integración ERP', 2500000, false, 'erp_integration'], ['Scraping controlado', 550000, false, 'controlled_scraping'], ['Cotización automática', 420000, false, 'automatic_quote'], ['Agendamiento automático', 280000, false, 'automatic_scheduling'],
  ],
  monthlyItems: [
    ['Hosting básico', 14990, true, 'basic_hosting'], ['Hosting empresarial', 39990, true, 'enterprise_hosting'], ['Mantención básica', 50000, true, 'basic_maintenance'], ['Mantención avanzada', 79990, true, 'advanced_maintenance'], ['Soporte prioritario', 149990, true, 'priority_support'], ['Monitoreo', 39990, true, 'monitoring'], ['Backups', 14990, true, 'backups'], ['Chatbot SaaS', 90000, true, 'chatbot_saas'], ['CRM SaaS', 100000, true, 'crm_saas'], ['Ecommerce SaaS', 149990, true, 'ecommerce_saas'], ['Reservas SaaS', 59990, true, 'reservations_saas'], ['KDS SaaS', 119990, true, 'kds_saas'], ['Analytics SaaS', 49990, true, 'analytics_saas'],
  ],
};

function getServiceMeta(key, fallbackName, monthly) {
  const byKey = SERVICE_COPY[key] || null;
  const title = byKey?.label || fallbackName || key;
  const description = byKey?.description || TEXT_COPY[title] || (monthly
    ? 'Servicio recurrente para mantener esta capacidad activa y disponible en la operación.'
    : 'Implementación orientada a resolver una necesidad concreta del negocio y generar una mejora operativa visible.');
  return { title, description, monthly: Boolean(monthly), key: key || '' };
}

function getProjectDisplayItems(project) {
  return (project.includes || []).map(title => getServiceMeta('', title, false));
}

function formatFeatureList(items, withCheck) {
  return items.map(item => `
    <li>
      <strong>${withCheck ? '✓ ' : ''}${esc(item.title)}</strong>
      <span>${esc(item.description)}</span>
    </li>
  `).join('');
}

function esc(v) { return String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }

export default function Cotizador() {
  const [f, setF] = useState(() => ({
    clientName: '', clientIndustry: '', clientContact: '', quoteDate: new Date().toISOString().slice(0, 10),
    projectGoal: '', projectIndex: 0, complexity: 1, extraMeetings: 0,
    discountType: 'none', discountValue: 0, discountReason: '',
    installments: 3, interestFreeInstallments: 3, installmentSurcharge: 8,
    downPaymentEnabled: 'yes', downPaymentPercent: 50, downPaymentLabel: 'Pago inicial para iniciar el proyecto',
    customNotes: '', selected: {},
  }));
  const [proposalHtml, setProposalHtml] = useState('');

  const upd = (key) => (e) => {
    const t = e.target;
    setF(prev => ({ ...prev, [key]: t.type === 'checkbox' ? t.checked : t.value }));
  };
  const updNum = (key) => (e) => setF(prev => ({ ...prev, [key]: Number(e.target.value) || 0 }));

  const handleCheck = (key) => (e) => {
    setF(prev => ({ ...prev, selected: { ...prev.selected, [key]: e.target.checked } }));
  };

  const d = useMemo(() => calc(f), [f]);

  const project = projects[f.projectIndex] || projects[0];

  const handleGenerateProposal = () => {
    const html = generateProposal(f, d);
    setProposalHtml(html);
    setTimeout(() => {
      const el = document.getElementById('proposalContainer');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#248bde] to-[#67c8f3] flex items-center justify-center text-white font-bold">NC</div>
            <h1 className="text-2xl font-bold text-white">Cotizador NexCommit</h1>
          </div>
          <p className="text-[#9aafc3] text-sm mt-2 max-w-2xl">Herramienta para crear cotizaciones con desglose de alcance, inversión, cuotas, descuento y condiciones generales.</p>
        </div>
        <div className="px-4 py-2 rounded-full border border-white/10 text-xs text-[#67c8f3] bg-[#67c8f3]/5 shrink-0">
          Precios actualizados mercado Chile 2026
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
        <div className="space-y-5">
          {/* 1. Cliente */}
          <Section title="1. Datos del cliente">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Cliente / Empresa" value={f.clientName} onChange={upd('clientName')} placeholder="Ej: Clínica Los Andes" />
              <Input label="Rubro" value={f.clientIndustry} onChange={upd('clientIndustry')} placeholder="Ej: Salud, Ecommerce" />
              <Input label="Contacto" value={f.clientContact} onChange={upd('clientContact')} placeholder="Nombre del contacto" />
              <Input label="Fecha" type="date" value={f.quoteDate} onChange={upd('quoteDate')} />
            </div>
            <div className="mt-3">
              <Label>Objetivo del proyecto</Label>
              <textarea value={f.projectGoal} onChange={upd('projectGoal')} placeholder="Ej: centralizar ventas, agendamiento, pagos online y automatización."
                className="w-full bg-[#151f33] border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#67c8f3] transition-colors resize-none min-h-[72px]" />
            </div>
          </Section>

          {/* 2. Tipo de proyecto */}
          <Section title="2. Tipo de proyecto">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Proyecto base</Label>
                <select value={f.projectIndex} onChange={updNum('projectIndex')} className="w-full bg-[#151f33] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#67c8f3]">
                  {projects.map((p, i) => (
                    <option key={p.name} value={i}>{p.name} — {CLP.format(p.price)}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Complejidad</Label>
                <select value={f.complexity} onChange={updNum('complexity')} className="w-full bg-[#151f33] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#67c8f3]">
                  <option value={1}>Básico x1</option>
                  <option value={1.5}>Intermedio x1.5</option>
                  <option value={2}>Avanzado x2</option>
                  <option value={3}>Enterprise x3</option>
                </select>
              </div>
              <div>
                <Label>Reuniones extra</Label>
                <input type="number" min={0} value={f.extraMeetings} onChange={updNum('extraMeetings')} className="w-full bg-[#151f33] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#67c8f3]" />
              </div>
            </div>
            <div className="mt-4 p-4 rounded-xl border border-[#67c8f3]/30 bg-[#67c8f3]/5">
              <h4 className="text-[#67c8f3] text-xs uppercase tracking-widest font-semibold mb-3">Incluido por defecto en el proyecto seleccionado</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {project.includes.map((inc, i) => (
                  <div key={i} className="flex flex-col px-3 py-2 rounded-lg bg-[#0f172a]/60 border border-white/5">
                    <span className="text-white text-xs font-medium">✓ {inc}</span>
                    <span className="text-[#9aafc3] text-[11px] mt-0.5 leading-relaxed">{TEXT_COPY[inc] || ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* 3. Integraciones extras disponibles */}
          <Section title="3. Integraciones extras disponibles">
            <ExtrasSubSection title="Pagos" group="paymentItems" />
            <ExtrasSubSection title="Logística" group="logisticsItems" />
            <ExtrasSubSection title="CRM y comunicación" group="crmItems" />
            <ExtrasSubSection title="IA" group="aiItems" />
            <ExtrasSubSection title="Infraestructura" group="infraItems" />
          </Section>

          {/* 4. Panel administrativo */}
          <Section title="4. Panel administrativo y módulos extras">
            <ExtrasSubSection title="" group="adminItems" />
          </Section>

          {/* 5. Automatizaciones */}
          <Section title="5. Automatizaciones extras">
            <ExtrasSubSection title="" group="automationItems" />
          </Section>

          {/* 6. SaaS / mensualidades */}
          <Section title="6. SaaS, mensualidades y soporte">
            <ExtrasSubSection title="" group="monthlyItems" />
          </Section>

          {/* 7. Descuento */}
          <Section title="7. Descuento comercial">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Tipo</Label>
                <select value={f.discountType} onChange={upd('discountType')} className="w-full bg-[#151f33] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#67c8f3]">
                  <option value="none">Sin descuento</option>
                  <option value="percent">Porcentaje</option>
                  <option value="fixed">Monto fijo</option>
                </select>
              </div>
              <div>
                <Label>Valor</Label>
                <input type="number" min={0} step={1000} value={f.discountValue} onChange={updNum('discountValue')} className="w-full bg-[#151f33] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#67c8f3]" />
              </div>
              <div>
                <Label>Motivo visible</Label>
                <input value={f.discountReason} onChange={upd('discountReason')} placeholder="Ej: descuento lanzamiento" className="w-full bg-[#151f33] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#9aafc3] outline-none focus:border-[#67c8f3]" />
              </div>
            </div>
          </Section>

          {/* 8. Cuotas */}
          <Section title="8. Calculador de cuotas">
            <div className="grid grid-cols-3 gap-3">
              <Input label="Cantidad de cuotas" type="number" min={1} value={f.installments} onChange={updNum('installments')} />
              <Input label="Cuotas sin interés hasta" type="number" min={1} value={f.interestFreeInstallments} onChange={updNum('interestFreeInstallments')} />
              <Input label="% recargo cuota superior" type="number" min={0} step={0.1} value={f.installmentSurcharge} onChange={updNum('installmentSurcharge')} />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <Label>¿Pago PIE?</Label>
                <select value={f.downPaymentEnabled} onChange={upd('downPaymentEnabled')} className="w-full bg-[#151f33] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#67c8f3]">
                  <option value="yes">Sí, aplicar PIE</option>
                  <option value="no">No aplicar PIE</option>
                </select>
              </div>
              <Input label="% PIE inicial" type="number" min={0} max={100} value={f.downPaymentPercent} onChange={updNum('downPaymentPercent')} />
              <Input label="Descripción PIE" value={f.downPaymentLabel} onChange={upd('downPaymentLabel')} />
            </div>
            <div className="mt-4 p-4 rounded-xl border border-[#67c8f3]/30 bg-[#67c8f3]/5">
              <h4 className="text-[#67c8f3] text-xs uppercase tracking-widest font-semibold mb-3">Resultado de pago en cuotas</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ['PIE inicial', CLP.format(d.downPaymentAmount)],
                  ['Saldo a financiar', CLP.format(d.balanceToFinance)],
                  ['Total financiado', CLP.format(d.financedTotal)],
                  ['Valor por cuota', CLP.format(d.installmentAmount)],
                  ['Recargo aplicado', `${d.appliedSurcharge}%`],
                  ['Condición', d.installmentCondition],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between px-3 py-2 rounded-lg bg-[#0f172a]/60 border border-white/5">
                    <span className="text-[#9aafc3] text-xs">{l}</span>
                    <span className="text-white text-xs font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* 9. Notas */}
          <Section title="9. Condiciones personalizadas">
            <textarea value={f.customNotes} onChange={upd('customNotes')} placeholder="Condiciones particulares, hitos, exclusiones o notas comerciales."
              className="w-full bg-[#151f33] border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-[#67c8f3] transition-colors resize-none min-h-[80px]" />
          </Section>
        </div>

        {/* Summary sidebar */}
        <div className="xl:sticky xl:top-6 space-y-4">
          <div className="bg-[#0d1e30] border border-white/10 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4 text-base">Resumen comercial</h2>
            <div className="bg-gradient-to-br from-[#67c8f3]/20 to-[#248bde]/20 border border-[#67c8f3]/30 rounded-xl p-4 mb-4">
              <div className="text-[#9aafc3] text-xs">Total final con IVA</div>
              <div className="text-3xl font-extrabold text-white mt-1 tracking-tight">{CLP.format(d.grand)}</div>
            </div>
            {[
              ['Subtotal implementación', CLP.format(d.subtotal)],
              ['Descuento', d.discountAmount ? `-${CLP.format(d.discountAmount)}` : '$0'],
              ['Subtotal c/ descuento', CLP.format(d.discountedSubtotal)],
              ['IVA 19%', CLP.format(d.tax)],
              ['PIE inicial', `${CLP.format(d.downPaymentAmount)}${d.downPaymentPercent ? ` (${d.downPaymentPercent}%)` : ''}`],
              ['Saldo a financiar', CLP.format(d.balanceToFinance)],
              ['Mensualidad', d.monthly ? `${CLP.format(d.monthly)}/mes` : '$0'],
              ['Tiempo estimado', `${d.estimatedWeeks} sem.`],
              ['Extras', `${d.selectedCount} items`],
              ['Cuotas', `${d.installments} x ${CLP.format(d.installmentAmount)}`],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between py-2 border-b border-white/5 text-sm">
                <span className="text-[#9aafc3]">{l}</span>
                <span className="text-white font-medium">{v}</span>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button onClick={handleGenerateProposal} className="py-3 rounded-xl bg-gradient-to-r from-[#67c8f3] to-[#248bde] text-white font-bold text-sm hover:opacity-90 transition-all">
                Generar propuesta
              </button>
              <button onClick={() => window.print()} className="py-3 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/15 transition-all">
                Descargar PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Proposal below everything */}
      {proposalHtml && (
        <div
          id="proposalContainer"
          className="bg-white text-gray-900 rounded-2xl p-8 print:block"
          dangerouslySetInnerHTML={{ __html: proposalHtml }}
        />
      )}
    </div>
  );

  function ExtrasSubSection({ title, group }) {
    const items = groups[group] || [];
    const includedKeys = new Set(project.includedKeys || []);
    const visible = items.filter(item => !includedKeys.has(item[3]));

    if (!visible.length) return null;

    return (
      <>
        {title && <h3 className="text-[#67c8f3] text-xs uppercase tracking-widest font-semibold mt-4 mb-2">{title}</h3>}
        <div className="grid grid-cols-2 gap-2">
          {visible.map(([name, price, monthly, key]) => {
            const meta = getServiceMeta(key, name, monthly);
            const checked = !!f.selected[key];
            return (
              <label key={key} className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-[#0f172a]/60 cursor-pointer hover:border-white/10 transition-colors">
                <input type="checkbox" checked={checked} onChange={handleCheck(key)} className="mt-0.5 w-4 h-4 accent-[#67c8f3]" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <span className="text-white text-sm font-medium">{meta.title}</span>
                    <span className="text-[#9aafc3] text-xs shrink-0">{CLP.format(price)}{monthly ? '/mes' : ''}</span>
                  </div>
                  <p className="text-[#9aafc3] text-xs mt-1 leading-relaxed">{meta.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </>
    );
  }
}

function Section({ title, children }) {
  return (
    <div className="bg-[#0d1e30] border border-white/5 rounded-2xl p-5">
      <h2 className="text-white font-semibold text-base mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Label({ children }) {
  return <label className="block text-[#9aafc3] text-xs mb-1.5">{children}</label>;
}

function Input({ label, type = 'text', ...props }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <input type={type} {...props} className="w-full bg-[#151f33] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-[#9aafc3] outline-none focus:border-[#67c8f3] transition-colors" />
    </div>
  );
}

function calc(f) {
  const project = projects[f.projectIndex] || projects[0];
  const selected = Object.entries(f.selected).filter(([, v]) => v).map(([key]) => key);
  const oneTime = [];
  const monthly = [];
  Object.entries(groups).forEach(([, items]) => {
    items.forEach(([, price, isMonth, key]) => {
      if (selected.includes(key)) {
        if (isMonth) monthly.push(price);
        else oneTime.push(price);
      }
    });
  });

  const rawSubtotal = project.price + oneTime.reduce((a, b) => a + b, 0) + Math.max(0, f.extraMeetings) * 70000;
  const subtotal = Math.round(rawSubtotal * f.complexity);
  let discountAmount = 0;
  if (f.discountType === 'percent') discountAmount = Math.round(subtotal * Math.min(f.discountValue, 100) / 100);
  else if (f.discountType === 'fixed') discountAmount = Math.min(Math.round(f.discountValue), subtotal);
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const tax = Math.round(discountedSubtotal * 0.19);
  const grand = discountedSubtotal + tax;
  const monthlyTotal = monthly.reduce((a, b) => a + b, 0);
  const estimatedWeeks = Math.ceil(project.weeks * Math.max(1, f.complexity * 0.75) + Math.floor(oneTime.length / 4));
  const downPaymentEnabled = f.downPaymentEnabled === 'yes';
  const downPaymentPercent = downPaymentEnabled ? Math.min(100, Math.max(0, f.downPaymentPercent)) : 0;
  const downPaymentAmount = Math.round(grand * downPaymentPercent / 100);
  const balanceToFinance = Math.max(0, grand - downPaymentAmount);
  const appliedSurcharge = f.installments <= f.interestFreeInstallments ? 0 : f.installmentSurcharge;
  const financedTotal = Math.round(balanceToFinance * (1 + appliedSurcharge / 100));
  const installmentAmount = Math.round(financedTotal / f.installments);
  const installmentCondition = appliedSurcharge === 0
    ? `${f.installments} cuota${f.installments === 1 ? '' : 's'} sin interés`
    : `${f.installments} cuotas con ${appliedSurcharge}% recargo`;
  return {
    subtotal, discountAmount, discountedSubtotal, tax, grand, monthly: monthlyTotal,
    estimatedWeeks, installments: f.installments, downPaymentAmount, downPaymentPercent,
    balanceToFinance, appliedSurcharge, financedTotal, installmentAmount, installmentCondition, selectedCount: selected.length,
  };
}

function generateProposal(f, d) {
  const project = projects[f.projectIndex] || projects[0];
  const selected = Object.entries(f.selected).filter(([, v]) => v).map(([key]) => key);
  const oneTimeRows = [];
  const monthlyRows = [];
  Object.entries(groups).forEach(([, items]) => {
    items.forEach(([name, price, isMonth, key]) => {
      if (selected.includes(key)) {
        if (isMonth) monthlyRows.push(`<tr><td>${esc(name)}</td><td>${CLP.format(price)}/mes</td></tr>`);
        else oneTimeRows.push(`<tr><td>${esc(name)}</td><td>${CLP.format(price)}</td></tr>`);
      }
    });
  });

  const discountLabel = d.discountAmount
    ? `${CLP.format(d.discountAmount)}${f.discountType === 'percent' ? ` (${f.discountValue}%)` : ''}${f.discountReason ? ' — ' + esc(f.discountReason) : ''}`
    : 'No aplica';

  const includeItems = getProjectDisplayItems(project);
  const includeList = formatFeatureList(includeItems, false);

  const extrasSelected = selected.map(key => {
    for (const [, items] of Object.entries(groups)) {
      for (const [name, , isMonth, k] of items) {
        if (k === key) {
          const meta = getServiceMeta(k, name, isMonth);
          return meta;
        }
      }
    }
    return { title: key, description: '' };
  });
  const extrasList = extrasSelected.length
    ? formatFeatureList(extrasSelected.map(item => ({
        title: `${item.title}${item.monthly ? ' — servicio mensual' : ''}`,
        description: item.description || 'Implementación complementaria solicitada para reforzar la solución base.'
      })), false)
    : '<li><strong>No se agregaron extras adicionales.</strong><span>El proyecto se cotiza con el paquete base seleccionado.</span></li>';

  const clientName = f.clientName || 'Cliente';
  const clientIndustry = f.clientIndustry || 'No especificado';
  const clientContact = f.clientContact || 'No especificado';
  const quoteDate = f.quoteDate || '';
  const projectGoal = f.projectGoal || 'Desarrollo de solución tecnológica para mejorar presencia digital, operación, ventas y automatización del negocio.';
  const customNotes = f.customNotes || 'No se agregaron condiciones adicionales.';

  return `
    <div style="font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:32px;color:#111827;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #e5e7eb;padding-bottom:20px;margin-bottom:24px;">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#248bde,#67c8f3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;">NC</div>
            <span style="font-weight:bold;font-size:20px;">NexCommit</span>
          </div>
          <h1 style="margin:0;font-size:22px;">Propuesta Comercial</h1>
          <p style="color:#4b5563;margin:4px 0 0;"><strong>Proyecto:</strong> ${esc(project.name)}</p>
        </div>
        <div style="text-align:right;font-size:13px;color:#4b5563;">
          <p><strong>Cliente:</strong> ${esc(clientName)}</p>
          <p><strong>Rubro:</strong> ${esc(clientIndustry)}</p>
          <p><strong>Contacto:</strong> ${esc(clientContact)}</p>
          <p><strong>Fecha:</strong> ${esc(quoteDate)}</p>
        </div>
      </div>

      <h2 style="font-size:16px;margin:24px 0 8px;">1. Contexto y objetivo</h2>
      <div style="background:#f8fafc;border:1px solid #e5e7eb;padding:16px;border-radius:12px;margin-bottom:16px;">
        <p style="margin:0;color:#374151;">${esc(projectGoal)}</p>
      </div>

      <h2 style="font-size:16px;margin:24px 0 8px;">2. Alcance general del proyecto</h2>
      <p style="color:#374151;font-size:13px;line-height:1.6;">Se propone desarrollar una soluci&oacute;n tipo <strong>${esc(project.name)}</strong>, orientada a entregar una presencia digital profesional, mejorar la gesti&oacute;n comercial y facilitar la operaci&oacute;n diaria del negocio.</p>
      <p style="color:#374151;font-size:13px;line-height:1.6;">El proyecto considera dise&ntilde;o, implementaci&oacute;n, configuraci&oacute;n inicial y entrega funcional para que el cliente pueda comenzar a utilizar la soluci&oacute;n seg&uacute;n el alcance definido.</p>

      <h2 style="font-size:16px;margin:24px 0 8px;">3. Qu&eacute; incluye el proyecto</h2>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:16px 18px;margin:14px 0;">
        <ul style="margin:0;padding-left:0;list-style:none;">${includeList}</ul>
      </div>

      <h2 style="font-size:16px;margin:24px 0 8px;">4. Extras, integraciones o m&oacute;dulos adicionales seleccionados</h2>
      <p style="color:#374151;font-size:13px;line-height:1.6;">Adem&aacute;s del alcance base, se consideran los siguientes elementos adicionales solicitados para complementar la soluci&oacute;n:</p>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:16px 18px;margin:14px 0;">
        <ul style="margin:0;padding-left:0;list-style:none;">${extrasList}</ul>
      </div>

      <h2 style="font-size:16px;margin:24px 0 8px;">5. Detalle comercial de implementaci&oacute;n</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <thead><tr style="background:#f3f4f6;"><th style="border:1px solid #e5e7eb;padding:8px;text-align:left;font-size:13px;">Concepto</th><th style="border:1px solid #e5e7eb;padding:8px;text-align:left;font-size:13px;">Valor</th></tr></thead>
        <tbody>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Proyecto base: ${esc(project.name)}</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${CLP.format(project.price)}</td></tr>
          ${oneTimeRows.join('')}
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Reuniones extra</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${CLP.format(Math.max(0, f.extraMeetings) * 70000)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Complejidad</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">x${f.complexity}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;"><strong>Subtotal implementaci&oacute;n</strong></td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;"><strong>${CLP.format(d.subtotal)}</strong></td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Descuento</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${discountLabel}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Subtotal c/ descuento</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${CLP.format(d.discountedSubtotal)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">IVA 19%</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${CLP.format(d.tax)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;background:#eff6ff;"><strong>Total final con IVA</strong></td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;background:#eff6ff;"><strong>${CLP.format(d.grand)}</strong></td></tr>
        </tbody>
      </table>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:18px;border-radius:14px;font-size:20px;font-weight:800;margin-top:20px;">Total final con IVA: ${CLP.format(d.grand)}</div>

      <h2 style="font-size:16px;margin:24px 0 8px;">6. Alternativa de pago en cuotas</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tbody>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">PIE inicial</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${d.downPaymentAmount ? `${CLP.format(d.downPaymentAmount)} (${d.downPaymentPercent}%)` : 'No aplica'}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Detalle PIE</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${esc(f.downPaymentLabel)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Saldo a financiar</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${CLP.format(d.balanceToFinance)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Cuotas</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${d.installments} x ${CLP.format(d.installmentAmount)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Total financiado</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${CLP.format(d.financedTotal)}</td></tr>
          <tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">Condici&oacute;n</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:13px;">${esc(d.installmentCondition)}</td></tr>
        </tbody>
      </table>

      ${monthlyRows.length ? `
      <h2 style="font-size:16px;margin:24px 0 8px;">7. Servicios mensuales</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <thead><tr style="background:#f3f4f6;"><th style="border:1px solid #e5e7eb;padding:8px;text-align:left;font-size:13px;">Servicio</th><th style="border:1px solid #e5e7eb;padding:8px;text-align:left;font-size:13px;">Valor</th></tr></thead>
        <tbody>${monthlyRows.join('')}</tbody>
      </table>` : ''}

      <h2 style="font-size:16px;margin:24px 0 8px;">8. Plazos y forma de trabajo</h2>
      <ul style="color:#374151;font-size:13px;line-height:1.6;">
        <li>El plazo estimado de desarrollo es de <strong>${d.estimatedWeeks} semana${d.estimatedWeeks === 1 ? '' : 's'}</strong>.</li>
        <li>El plazo comienza desde la aprobaci&oacute;n de la propuesta, pago inicial y entrega de la informaci&oacute;n necesaria por parte del cliente.</li>
        <li>Se considera una reuni&oacute;n semanal de avance durante el desarrollo.</li>
        <li>Los ajustes fuera del alcance original se revisan y cotizan por separado antes de ejecutarse.</li>
      </ul>

      <h2 style="font-size:16px;margin:24px 0 8px;">9. Qu&eacute; no incluye, salvo acuerdo previo</h2>
      <ul style="color:#374151;font-size:13px;line-height:1.6;">
        <li>Compra de dominio web.</li>
        <li>Costos de hosting, servidores, correos corporativos o servicios externos no seleccionados.</li>
        <li>Comisiones de pasarelas de pago, bancos o plataformas externas.</li>
        <li>Consumos variables de APIs, WhatsApp, inteligencia artificial, email marketing u otros proveedores.</li>
        <li>Redacci&oacute;n completa de contenidos, fotograf&iacute;a profesional, producci&oacute;n audiovisual o carga masiva de informaci&oacute;n no indicada en el alcance.</li>
        <li>Campa&ntilde;as publicitarias, inversi&oacute;n en anuncios o gesti&oacute;n mensual de marketing, salvo que se indique expresamente.</li>
      </ul>

      <h2 style="font-size:16px;margin:24px 0 8px;">10. Condiciones generales</h2>
      <ul style="color:#374151;font-size:13px;line-height:1.6;">
        <li>Precios en pesos chilenos con IVA 19% incluido.</li>
        <li>Si aplica PIE, corresponde al pago inicial para comenzar el proyecto.</li>
        <li>Compra de dominio web es responsabilidad del cliente.</li>
        <li>Integraciones dependen de cada proveedor externo.</li>
        <li>Cambios de alcance se cotizan por separado.</li>
      </ul>

      ${customNotes !== 'No se agregaron condiciones adicionales.' ? `<h2 style="font-size:16px;margin:24px 0 8px;">11. Notas personalizadas</h2><p style="color:#374151;font-size:13px;">${esc(customNotes)}</p>` : ''}

      <h2 style="font-size:16px;margin:24px 0 8px;">12. Cierre</h2>
      <p style="color:#374151;font-size:13px;line-height:1.6;">NexCommit desarrolla soluciones digitales para ordenar procesos, mejorar la experiencia del cliente y facilitar el crecimiento comercial de cada negocio.</p>
    </div>
  `;
}
