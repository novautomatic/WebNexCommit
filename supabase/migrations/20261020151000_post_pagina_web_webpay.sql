-- Post del blog: página web con Webpay (el enlace "Pagos Online" y la palabra
-- "integrar webpay" atraen interés). Enlaza a /precios y /servicios/pagos. Idempotente.
DO $do$
DECLARE
  v_slug  text := 'pagina-web-con-webpay-chile';
  v_title text := 'Página web con Webpay en Chile: qué necesitas para cobrar en línea';
  v_excerpt text := 'Qué necesitas para recibir pagos con tarjeta en tu página web en Chile: Webpay (Transbank), Flow o Mercado Pago, cómo elegir, cuánto tiempo toma y qué cuesta.';
  v_image text := 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1640&auto=format&fit=crop';
  v_content text := $md$
Cada vez más clientes quieren pagar en el momento, desde el celular, sin transferir ni mandar comprobantes. Si tu negocio vende productos o servicios, **cobrar en tu propia página web** te ahorra tiempo y te hace vender más. Aquí te explicamos qué necesitas en Chile.

## Las tres opciones más usadas en Chile

**Webpay (Transbank).** Es el medio de pago que todos reconocen en Chile. Acepta tarjetas de crédito, débito y prepago. Para usarlo necesitas afiliar tu comercio a Transbank, que te asigna un código de comercio, y luego integrarlo a tu página.

**Mercado Pago.** Muy fácil de activar: creas tu cuenta y la conectas a tu página. Acepta tarjetas y saldo de Mercado Pago. Es una buena opción para partir rápido.

**Flow.** Reúne varios medios de pago (Webpay, tarjetas, transferencias y más) en una sola integración. Es práctico si quieres ofrecer varias formas de pago sin integrar cada una por separado.

Cada proveedor cobra una comisión por venta, que depende del medio de pago y de tu contrato. Revisa sus tarifas vigentes antes de decidir: cambian con el tiempo.

## ¿Cuál te conviene?

- **Quieres partir esta semana:** Mercado Pago.
- **Tus clientes esperan ver "Webpay":** Transbank, o Flow si además quieres otros medios.
- **Vendes mucho con tarjeta de débito:** compara las comisiones de débito de cada opción; ahí está la mayor diferencia.

## Qué necesitas tener listo

1. **RUT y datos de tu negocio** para abrir la cuenta en el proveedor de pagos.
2. **Una cuenta bancaria** a tu nombre o de tu empresa, donde llegará la plata.
3. **Tu página web**, con los productos o servicios y sus precios.
4. **Políticas visibles**: cambios, devoluciones y despacho. Dan confianza y los proveedores suelen pedirlas.

## Cómo funciona el cobro en tu página

El cliente elige lo que quiere, pulsa pagar y es llevado al formulario seguro del proveedor. Los datos de la tarjeta **nunca pasan por tu página**: los procesa Transbank, Flow o Mercado Pago. Cuando el pago se aprueba, tu página lo recibe automáticamente: el pedido queda pagado, el cliente recibe su confirmación y tú lo ves en tu panel.

## ¿Cuánto cuesta una página que cobra en línea?

En NexCommit, una **tienda online cuesta $800.000 + IVA** e incluye un medio de pago (Webpay, Flow o Mercado Pago), y un **sistema de reservas y citas con pago al reservar cuesta $1.000.000 + IVA**. Revisa qué incluye cada plan en **[nexcommit.com/precios](https://www.nexcommit.com/precios)**.

Si ya tienes página y solo quieres agregarle pagos, también lo hacemos: conoce nuestro servicio de **[pagos online y presenciales](https://www.nexcommit.com/servicios/pagos)**.

## Empieza a cobrar en línea

Escríbenos por WhatsApp y te ayudamos a elegir el medio de pago que más te conviene y a dejar tu página cobrando, con alcance, plazo y precio cerrado antes de partir.
$md$;
  v_seo jsonb := jsonb_build_object(
    'og_title', 'Página web con Webpay en Chile: qué necesitas para cobrar en línea',
    'meta_description', 'Cómo cobrar con tarjeta en tu página web en Chile: Webpay (Transbank), Flow o Mercado Pago, qué necesitas, cómo funciona y cuánto cuesta una tienda online.',
    'meta_keywords', 'página web con webpay, integrar webpay en mi web, webpay transbank, mercado pago página web, flow chile, tienda online chile'
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
    VALUES ('20261020151000', 'post_pagina_web_webpay') ON CONFLICT DO NOTHING;
  END IF;
END
$do$;

-- Verificación:
-- SELECT slug, published, length(content) FROM public.posts WHERE slug = 'pagina-web-con-webpay-chile';
