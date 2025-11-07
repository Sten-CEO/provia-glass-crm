-- Seed test data for revenue module testing
-- Insert paid invoices with different dates
INSERT INTO public.factures (numero, client_id, client_nom, montant, statut, echeance, total_ht, total_ttc, date_paiement, created_at)
SELECT 
  'FAC-2025-' || LPAD((ROW_NUMBER() OVER())::TEXT, 3, '0'),
  c.id,
  c.nom,
  CASE ROW_NUMBER() OVER()
    WHEN 1 THEN '120'
    WHEN 2 THEN '300'
    ELSE '480'
  END,
  'Payée',
  (CURRENT_DATE - INTERVAL '5 days')::TEXT,
  CASE ROW_NUMBER() OVER()
    WHEN 1 THEN 100.00
    WHEN 2 THEN 250.00
    ELSE 400.00
  END,
  CASE ROW_NUMBER() OVER()
    WHEN 1 THEN 120.00
    WHEN 2 THEN 300.00
    ELSE 480.00
  END,
  CURRENT_DATE - INTERVAL '1 day' * (ROW_NUMBER() OVER() * 3),
  CURRENT_DATE - INTERVAL '1 day' * (ROW_NUMBER() OVER() * 3)
FROM (SELECT id, nom FROM public.clients LIMIT 1) c
CROSS JOIN generate_series(1, 3)
WHERE NOT EXISTS (
  SELECT 1 FROM public.factures WHERE statut = 'Payée' LIMIT 3
);