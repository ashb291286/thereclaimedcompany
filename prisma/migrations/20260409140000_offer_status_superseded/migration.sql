-- AlterEnum: buyer offer row marked superseded when seller counters from pending
-- Idempotent: label may already exist if applied manually or from a retried/partial deploy.
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_enum e
    INNER JOIN pg_catalog.pg_type t ON e.enumtypid = t.oid
    INNER JOIN pg_catalog.pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.typname = 'OfferStatus'
      AND e.enumlabel = 'superseded'
  ) THEN
    ALTER TYPE "OfferStatus" ADD VALUE 'superseded';
  END IF;
END
$migration$;
