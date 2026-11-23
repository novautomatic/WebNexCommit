-- 16-11-2026: menos ejecuciones por minuto.
-- · Las 4 «procesar-*» no envían nada: solo pasan los envíos de «pendiente» a
--   «enviado»/«error» leyendo la respuesta de pg_net. Cada 5 min basta (los
--   mensajes salen igual al instante; solo el ✓ del panel tarda un poco más).
-- · La sincronización con GitHub era lo más caro de la base (56k ejecuciones,
--   ~33 h de CPU). Pasa a cada 2 min y el panel deja de dispararla (ver
--   src/hooks/tareas.js → useSyncGithub).

DO $$
BEGIN
  PERFORM cron.alter_job(jobid, schedule := '*/5 * * * *')
     FROM cron.job
    WHERE jobname IN ('procesar-avisos-tareas', 'procesar-avisos-tareas-cliente',
                      'procesar-correos-clientes', 'procesar-envios-resenas');
  PERFORM cron.alter_job(jobid, schedule := '*/2 * * * *')
     FROM cron.job WHERE jobname = 'sync-github-tareas';
END $$;
