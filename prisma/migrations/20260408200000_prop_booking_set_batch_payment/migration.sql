-- Prop hire: link bookings to set + batch; Stripe checkout tracking. (Idempotent for Neon / partial applies.)
ALTER TABLE "PropRentalBooking" ADD COLUMN IF NOT EXISTS "hireRequestBatchId" TEXT;
ALTER TABLE "PropRentalBooking" ADD COLUMN IF NOT EXISTS "propRentalSetId" TEXT;
ALTER TABLE "PropRentalBooking" ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT;
ALTER TABLE "PropRentalBooking" ADD COLUMN IF NOT EXISTS "hirePaidAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "PropRentalBooking_hireRequestBatchId_idx" ON "PropRentalBooking"("hireRequestBatchId");
CREATE INDEX IF NOT EXISTS "PropRentalBooking_propRentalSetId_idx" ON "PropRentalBooking"("propRentalSetId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PropRentalBooking_propRentalSetId_fkey'
  ) THEN
    ALTER TABLE "PropRentalBooking" ADD CONSTRAINT "PropRentalBooking_propRentalSetId_fkey" FOREIGN KEY ("propRentalSetId") REFERENCES "PropRentalSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
