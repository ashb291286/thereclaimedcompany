-- Private deal: shipping breakdown on present, optional images on messages
ALTER TABLE "DealerDeal" ADD COLUMN "buyerArrangesShipping" BOOLEAN;
ALTER TABLE "DealerDeal" ADD COLUMN "agreedItemPence" INTEGER;
ALTER TABLE "DealerDeal" ADD COLUMN "agreedShippingPence" INTEGER;

ALTER TABLE "DealerDealMessage" ADD COLUMN "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
