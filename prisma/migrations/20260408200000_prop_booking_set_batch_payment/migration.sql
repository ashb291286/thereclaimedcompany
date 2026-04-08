-- Prop hire: link bookings to set + batch; Stripe checkout tracking.
ALTER TABLE "PropRentalBooking" ADD COLUMN "hireRequestBatchId" TEXT;
ALTER TABLE "PropRentalBooking" ADD COLUMN "propRentalSetId" TEXT;
ALTER TABLE "PropRentalBooking" ADD COLUMN "stripeCheckoutSessionId" TEXT;
ALTER TABLE "PropRentalBooking" ADD COLUMN "hirePaidAt" TIMESTAMP(3);

CREATE INDEX "PropRentalBooking_hireRequestBatchId_idx" ON "PropRentalBooking"("hireRequestBatchId");
CREATE INDEX "PropRentalBooking_propRentalSetId_idx" ON "PropRentalBooking"("propRentalSetId");

ALTER TABLE "PropRentalBooking" ADD CONSTRAINT "PropRentalBooking_propRentalSetId_fkey" FOREIGN KEY ("propRentalSetId") REFERENCES "PropRentalSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
