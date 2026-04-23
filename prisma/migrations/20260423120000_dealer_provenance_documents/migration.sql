-- Dealer Piece Passport: optional supporting documents (images, PDFs) per listing
ALTER TABLE "Listing" ADD COLUMN "dealerProvenanceDocuments" JSONB;
