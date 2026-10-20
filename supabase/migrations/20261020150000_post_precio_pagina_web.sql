-- Post del blog: cuánto cuesta una página web en Chile (búsqueda #1 de la campaña:
-- "precio pagina web chile"). Enlaza a /precios. Idempotente (actualiza si existe).
DO $do$
DECLARE
  v_slug  text := 'cuanto-cuesta-una-pagina-web-en-chile';
  v_title text := '¿Cuánto cuesta una página web en Chile en 2026?';
  v_excerpt text := 'Precios reales de una landing page, una tienda online, un sistema de reservas y una página empresarial en Chile, qué incluye cada una y qué hace subir o bajar el valor.';
  v_image text := 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=1640&auto=format&fit=crop';
  v_content text := $md$
"¿Cuánto cuesta una página web?" es la primera pregunta de casi todos los que nos escriben. La respuesta honesta es que **depende de lo que la página tenga que hacer**: no cuesta lo mismo una página para que te contacten que una tienda que cobra con Webpay o una agenda donde tus clientes reservan solos.

Para que no tengas que adivinar, en NexCommit publicamos nuestros precios. Puedes verlos con el detalle de cada plan en **[nexcommit.com/precios](https://www.nexcommit.com/precios)**.

## Precios de NexCommit en 2026

| Tipo de página | Precio (+ IVA) | Plazo aproximado |
|---|---|---|
| Landing page | $300.000 | ~1 semana |
| E-commerce (tienda online) | $800.000 | ~4 semanas |
| Reservas y citas | $1.000.000 | según tu agenda |
| Página empresarial a medida | $1.200.000 | ~3 a 4 semanas |

Son valores del plan base. Si necesitas algo adicional, te lo cotizamos **antes de partir**, con precio cerrado.

## ¿Qué tipo de página necesitas?

**Landing page.** Una sola página con un objetivo: que te escriban, te llamen o te compren. Es la opción para lanzar un producto, apoyar una campaña de Google o Meta Ads, o tener presencia rápida. Incluye diseño con tu marca, botones de WhatsApp y llamada, formulario y SEO técnico.

**E-commerce.** Para vender productos en línea y cobrar con medios de pago chilenos: Webpay (Transbank), Flow o Mercado Pago. Incluye un panel para cargar productos, controlar stock y revisar pedidos.

**Reservas y citas.** Para clínicas, consultas, centros de estética, terapeutas y cualquier servicio con agenda. Tus clientes ven las horas disponibles, reservan y pagan solos, y reciben confirmación y recordatorio por correo. Tú administras todo desde un panel.

**Página empresarial a medida.** Un sitio completo de varias páginas (inicio, servicios, nosotros, casos, contacto y blog), con diseño a medida y textos pensados para las búsquedas de tus clientes.

## ¿Qué hace subir o bajar el precio?

- **Cantidad de páginas y secciones.** Una landing es una página; un sitio empresarial tiene varias.
- **Funciones.** Cobrar en línea, agendar horas, un panel de administración o un chatbot suman trabajo.
- **Integraciones.** Conectar un CRM, un courier o un sistema que ya usas.
- **Contenido.** Si los textos y las fotos los aportas tú o hay que crearlos.
- **Diseño a medida o plantilla.** Una plantilla es más barata al inicio, pero se parece a la de tu competencia y cuesta más adaptarla después.

## Lo que también hay que considerar

Además del desarrollo, toda página necesita **dominio** (por ejemplo, tuempresa.cl), **hosting** y **mantención**. En NexCommit eso va en un plan mensual aparte, para que tu sitio siga funcionando, seguro y actualizado después del lanzamiento.

## ¿Y las páginas "gratis"?

Existen y sirven para empezar. De hecho, tenemos un **[creador de páginas gratis con IA](https://www.nexcommit.com/crea-tu-web)** para que veas cómo se vería la tuya en 2 minutos. Pero si tu página tiene que vender, cobrar o agendar, conviene una hecha a medida: es la que trabaja por tu negocio todos los días.

## Cotiza la tuya

Revisa los planes en **[nexcommit.com/precios](https://www.nexcommit.com/precios)** o escríbenos por WhatsApp: en una conversación corta te recomendamos el plan justo y te enviamos la propuesta con alcance, plazo y precio cerrado.
$md$;
  v_seo jsonb := jsonb_build_object(
    'og_title', '¿Cuánto cuesta una página web en Chile en 2026?',
    'meta_description', 'Precios reales 2026: landing page $300.000, tienda online $800.000, reservas y citas $1.000.000 y página empresarial $1.200.000 (+ IVA). Qué incluye cada una.',
    'meta_keywords', 'precio página web chile, cuánto cuesta una página web, precio landing page, precio tienda online chile, cuánto cobra un programador por una página web'
  );
BEGIN
  IF EXISTS (SELECT 1 FROM public.posts WHERE slug = v_slug) THEN
    UPDATE public.posts
       SET title = v_title, excerpt = v_excerpt, content = v_content, image_url = v_image,
           seo_metadata = v_seo, status = 'published', published = true, updated_at = now()
     WHERE slug = v_slug;
  ELSE
    INSERT INTO public.posts (title, slug, content, excerpt, image_url, status, published, seo_metadata)
    VALUES (v_title, v_slug, v_content, v_excerpt, v_image, 'published', true, v_seo);
  END IF;
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261020150000', 'post_precio_pagina_web') ON CONFLICT DO NOTHING;
  END IF;
END
$do$;

-- Verificación:
-- SELECT slug, published, length(content) FROM public.posts WHERE slug = 'cuanto-cuesta-una-pagina-web-en-chile';
