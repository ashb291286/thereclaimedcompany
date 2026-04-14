-- Generated from legacy reclaim MySQL dump
-- TEST slice — review before production
BEGIN;
-- Optional: remove previous legacy import
DELETE FROM "Listing" WHERE "id" LIKE 'legacy_l_%';
DELETE FROM "SellerProfile" WHERE "userId" LIKE 'legacy_u_%';
DELETE FROM "User" WHERE "id" LIKE 'legacy_u_%';

INSERT INTO "User" ("id","email","emailVerified","name","image","password","role","createdAt","updatedAt") VALUES ('legacy_u_1', 'ashley@hotboxstoves.co.uk', NOW(), 'Shayne Simpson', 'https://thereclaimedcompany.com/uploads/profile/avatar_61b34bc53dcd10-14963592-41034218.jpg', '$2a$08$LciWyT6UtmvuzNWzuvTWkO6Qml0J5dDRJaWa.r.5pxMvxISwpsSei', 'reclamation_yard', NOW(), NOW());
INSERT INTO "SellerProfile" ("id","userId","businessName","displayName","postcode","yardSlug","yardAbout","yardContactPhone","yardWebsiteUrl","yardSocialJson","verificationStatus","createdAt","updatedAt") VALUES ('legacy_sp_1', 'legacy_u_1', 'Halifax Reclamation', 'Halifax Reclamation', 'HX5 0PX', 'admin-r1', 'Finder of strange items with great potential', NULL, NULL, NULL, 'none', NOW(), NOW());
INSERT INTO "User" ("id","email","emailVerified","name","image","password","role","createdAt","updatedAt") VALUES ('legacy_u_2', 'sales@thereclaimedcompany.co.uk', NOW(), 'Roy Elvin', 'https://thereclaimedcompany.com/uploads/profile/avatar_60fad35e96ad77-62158907-60271278.jpg', '$2a$08$kUjZiDHIZa2nPtE4ZUe8nOQ97MyDDuTPxhWIgRGW61/hTFHiskw1W', 'reclamation_yard', NOW(), NOW());
INSERT INTO "SellerProfile" ("id","userId","businessName","displayName","postcode","yardSlug","yardAbout","yardContactPhone","yardWebsiteUrl","yardSocialJson","verificationStatus","createdAt","updatedAt") VALUES ('legacy_sp_2', 'legacy_u_2', 'The Reclaimed Company', 'The Reclaimed Company', 'YO32 2RB', 'the-reclaimed-company-r2', 'Home of salvaged roofing materials and reclaimed artifacts.', '01904289846', 'https://shop.thereclaimedcompany.co.uk/home/', '{"facebook":"http://www.facebook.com/thereclaimedcompany","twitter":"https://twitter.com/the_reclaimedco","instagram":"http://www.instagram.com/thereclaimedcompany","youtube":"https://www.youtube.com/channel/UCDoW-4idf5worKd57k7fdQA"}', 'none', NOW(), NOW());
INSERT INTO "User" ("id","email","emailVerified","name","image","password","role","createdAt","updatedAt") VALUES ('legacy_u_3', 'oliver@hotboxstoves.co.uk', NOW(), 'Oliver Neal', 'https://thereclaimedcompany.com/uploads/profile/avatar_61016e1a7882f4-80388815-50181959.jpg', '$2a$08$1yFwGoANNgfM/XxOotwr.e3d2881xcYNxv5W.jvnKIFNCgx3QlnY6', 'reclamation_yard', NOW(), NOW());
INSERT INTO "SellerProfile" ("id","userId","businessName","displayName","postcode","yardSlug","yardAbout","yardContactPhone","yardWebsiteUrl","yardSocialJson","verificationStatus","createdAt","updatedAt") VALUES ('legacy_sp_3', 'legacy_u_3', 'Hot Box Stoves', 'Hot Box Stoves', 'YO322RB', 'hot-box-stoves-r3', 'Second Hand Fireplaces, stoves and more', '07736050593', NULL, NULL, 'none', NOW(), NOW());
INSERT INTO "User" ("id","email","emailVerified","name","image","password","role","createdAt","updatedAt") VALUES ('legacy_u_4', 'sarah_bolingbroke@hotmail.com', NOW(), 'Suzy Scent', NULL, '$2a$08$FHqhOMmZt6A5k9m8Qnc5iOJfxt1fNut6XRNR9SC/986RaEh689Lgy', 'reclamation_yard', NOW(), NOW());
INSERT INTO "SellerProfile" ("id","userId","businessName","displayName","postcode","yardSlug","yardAbout","yardContactPhone","yardWebsiteUrl","yardSocialJson","verificationStatus","createdAt","updatedAt") VALUES ('legacy_sp_4', 'legacy_u_4', 'Suzy Scent', 'Suzy Scent', 'YO1 7HD', 'heavenscent-r4', NULL, NULL, NULL, NULL, 'none', NOW(), NOW());

INSERT INTO "Listing" (
"id","sellerId","title","sellerReference","description","price","condition","categoryId","postcode","lat","lng","images","status","listingKind","pricingMode","unitsAvailable","offersDelivery","deliveryCostPence","auctionEndsAt","visibleOnMarketplace","createdAt","updatedAt"
) VALUES (
'legacy_l_1','legacy_u_1','Bedside table lamp on reclaimed timber','GR420Z1Y6','Detailed Specifications: - Base Dimensions: 33cm x 11.5 cm - Height Dimensions: 27cm - Cable: 1.5m long, black cable - Weight: 2kg (4.4lbs) - Maximum Bulb Wattage: 60 Watt - Voltage: 110-240V - Socket: E26/E27 - Switch: Included - black in-line cord switch - Plug: Included - UK plug (3 pins) alternative plugs available EU & US Included in the package are: 1. Lamp base 2. Black cord 3. Plug 4. In-line Switch',8500,'used',(SELECT "id" FROM "Category" WHERE "slug" = 'other' LIMIT 1),'hx5 0px',53.6846543,-1.8404989,ARRAY['https://thereclaimedcompany.com/uploads/images/202107/img_1920x_60fe886c703de1-27308462-47509698.jpg','https://thereclaimedcompany.com/uploads/images/202107/img_1920x_60fe886b0d2128-79052979-44406810.jpg','https://thereclaimedcompany.com/uploads/images/202107/img_1920x_60fe886b9af997-59756230-41952604.jpg']::text[],'active','sell','LOT',NULL,true,25,NULL,true,'2021-07-23T13:33:53Z'::timestamptz,'2021-07-23T13:33:53Z'::timestamptz);

INSERT INTO "Listing" (
"id","sellerId","title","sellerReference","description","price","condition","categoryId","postcode","lat","lng","images","status","listingKind","pricingMode","unitsAvailable","offersDelivery","deliveryCostPence","auctionEndsAt","visibleOnMarketplace","createdAt","updatedAt"
) VALUES (
'legacy_l_3','legacy_u_2','Weathered Tiles','GR5F1O1L1','Tiles from a recent roof repair 100 available weathered brown/grey',250,'used',(SELECT "id" FROM "Category" WHERE "slug" = 'other' LIMIT 1),NULL,NULL,NULL,ARRAY['https://thereclaimedcompany.com/uploads/images/202107/img_1920x_60fad5f40161b0-00803163-11642935.jpeg']::text[],'active','sell','PER_UNIT',100,false,NULL,NULL,true,'2021-07-23T14:46:35Z'::timestamptz,'2021-07-23T14:46:35Z'::timestamptz);

INSERT INTO "Listing" (
"id","sellerId","title","sellerReference","description","price","condition","categoryId","postcode","lat","lng","images","status","listingKind","pricingMode","unitsAvailable","offersDelivery","deliveryCostPence","auctionEndsAt","visibleOnMarketplace","createdAt","updatedAt"
) VALUES (
'legacy_l_4','legacy_u_2','Seawings 355 hardtop sportscruiser from Hardy',NULL,'The Pearl 43 is an evolution of the Pearl 41, only the second boat from what was a fledgling British boat builder in the early noughties (its first boat was the larger Pearl 45). The hull is actually based on a John Bennett design for the Humber 40 with a modified transom. The big change to the 43 is a usefully larger bathing platform capable of supporting a tender.',0,'used',(SELECT "id" FROM "Category" WHERE "slug" = 'other' LIMIT 1),NULL,NULL,NULL,ARRAY['https://thereclaimedcompany.com/uploads/images/202107/img_1920x_60fad6beae3e76-38941666-91505780.jpg']::text[],'active','auction','LOT',NULL,false,NULL,'2021-08-02T15:40:18Z'::timestamptz,true,'2021-07-23T14:49:46Z'::timestamptz,'2021-07-23T14:49:46Z'::timestamptz);

INSERT INTO "Listing" (
"id","sellerId","title","sellerReference","description","price","condition","categoryId","postcode","lat","lng","images","status","listingKind","pricingMode","unitsAvailable","offersDelivery","deliveryCostPence","auctionEndsAt","visibleOnMarketplace","createdAt","updatedAt"
) VALUES (
'legacy_l_5','legacy_u_2','Roll Top Ridge Tile',NULL,'Order online from the reclaimed company.',800,'used',(SELECT "id" FROM "Category" WHERE "slug" = 'other' LIMIT 1),NULL,NULL,NULL,ARRAY['https://thereclaimedcompany.com/uploads/images/202107/img_1920x_60fae6a66ad1d1-09846583-90010586.jpg']::text[],'active','sell','LOT',NULL,false,NULL,NULL,true,'2021-07-23T15:56:22Z'::timestamptz,'2021-07-23T15:56:22Z'::timestamptz);

INSERT INTO "Listing" (
"id","sellerId","title","sellerReference","description","price","condition","categoryId","postcode","lat","lng","images","status","listingKind","pricingMode","unitsAvailable","offersDelivery","deliveryCostPence","auctionEndsAt","visibleOnMarketplace","createdAt","updatedAt"
) VALUES (
'legacy_l_6','legacy_u_2','Clay Angle Capped Ridge Tile (natural red)',NULL,'Order online from the reclaimed company.',500,'used',(SELECT "id" FROM "Category" WHERE "slug" = 'other' LIMIT 1),NULL,NULL,NULL,ARRAY['https://thereclaimedcompany.com/uploads/images/202107/img_1920x_60fae6a76d4407-48734039-48426969.jpg']::text[],'active','sell','PER_UNIT',154,false,NULL,NULL,true,'2021-07-23T15:56:23Z'::timestamptz,'2021-07-23T15:56:23Z'::timestamptz);

INSERT INTO "Listing" (
"id","sellerId","title","sellerReference","description","price","condition","categoryId","postcode","lat","lng","images","status","listingKind","pricingMode","unitsAvailable","offersDelivery","deliveryCostPence","auctionEndsAt","visibleOnMarketplace","createdAt","updatedAt"
) VALUES (
'legacy_l_7','legacy_u_2','Plain Angle Clay Ridge Tile',NULL,'Order online from the reclaimed company.',450,'used',(SELECT "id" FROM "Category" WHERE "slug" = 'other' LIMIT 1),NULL,NULL,NULL,ARRAY['https://thereclaimedcompany.com/uploads/images/202107/img_1920x_60fae6a87d3e16-05032602-83647400.jpg']::text[],'active','sell','LOT',NULL,false,NULL,NULL,true,'2021-07-23T15:56:24Z'::timestamptz,'2021-07-23T15:56:24Z'::timestamptz);

INSERT INTO "Listing" (
"id","sellerId","title","sellerReference","description","price","condition","categoryId","postcode","lat","lng","images","status","listingKind","pricingMode","unitsAvailable","offersDelivery","deliveryCostPence","auctionEndsAt","visibleOnMarketplace","createdAt","updatedAt"
) VALUES (
'legacy_l_8','legacy_u_2','Decorative Clay Ridge Tile',NULL,'Order online from the reclaimed company.',800,'used',(SELECT "id" FROM "Category" WHERE "slug" = 'other' LIMIT 1),NULL,NULL,NULL,ARRAY['https://thereclaimedcompany.com/uploads/images/202107/img_1920x_60fae6a9272503-25050577-55965142.jpg']::text[],'active','sell','LOT',NULL,false,NULL,NULL,true,'2021-07-23T15:56:25Z'::timestamptz,'2021-07-23T15:56:25Z'::timestamptz);

INSERT INTO "Listing" (
"id","sellerId","title","sellerReference","description","price","condition","categoryId","postcode","lat","lng","images","status","listingKind","pricingMode","unitsAvailable","offersDelivery","deliveryCostPence","auctionEndsAt","visibleOnMarketplace","createdAt","updatedAt"
) VALUES (
'legacy_l_9','legacy_u_2','Plain Angled Red Ridge',NULL,'Order online from the reclaimed company.',1000,'used',(SELECT "id" FROM "Category" WHERE "slug" = 'other' LIMIT 1),NULL,NULL,NULL,ARRAY['https://thereclaimedcompany.com/uploads/images/202107/img_1920x_60fae6a9796be4-80676176-35407106.jpg']::text[],'active','sell','LOT',NULL,false,NULL,NULL,true,'2021-07-23T15:56:25Z'::timestamptz,'2021-07-23T15:56:25Z'::timestamptz);

INSERT INTO "Listing" (
"id","sellerId","title","sellerReference","description","price","condition","categoryId","postcode","lat","lng","images","status","listingKind","pricingMode","unitsAvailable","offersDelivery","deliveryCostPence","auctionEndsAt","visibleOnMarketplace","createdAt","updatedAt"
) VALUES (
'legacy_l_10','legacy_u_2','Blue Angle Capped Ridge (Shallow)',NULL,'Order online from the reclaimed company.',1000,'used',(SELECT "id" FROM "Category" WHERE "slug" = 'other' LIMIT 1),NULL,NULL,NULL,ARRAY['https://thereclaimedcompany.com/uploads/images/202107/img_1920x_60fae6a9ee23f6-01111559-77330941.jpg']::text[],'active','sell','LOT',NULL,false,NULL,NULL,true,'2021-07-23T15:56:25Z'::timestamptz,'2021-07-23T15:56:25Z'::timestamptz);

INSERT INTO "Listing" (
"id","sellerId","title","sellerReference","description","price","condition","categoryId","postcode","lat","lng","images","status","listingKind","pricingMode","unitsAvailable","offersDelivery","deliveryCostPence","auctionEndsAt","visibleOnMarketplace","createdAt","updatedAt"
) VALUES (
'legacy_l_11','legacy_u_2','Staffordshire Blue Angled Ridge',NULL,'Order online from the reclaimed company.',1000,'used',(SELECT "id" FROM "Category" WHERE "slug" = 'other' LIMIT 1),NULL,NULL,NULL,ARRAY['https://thereclaimedcompany.com/uploads/images/202107/img_1920x_60fae6aab49189-29921324-46179400.jpg']::text[],'active','sell','LOT',NULL,false,NULL,NULL,true,'2021-07-23T15:56:26Z'::timestamptz,'2021-07-23T15:56:26Z'::timestamptz);

INSERT INTO "Listing" (
"id","sellerId","title","sellerReference","description","price","condition","categoryId","postcode","lat","lng","images","status","listingKind","pricingMode","unitsAvailable","offersDelivery","deliveryCostPence","auctionEndsAt","visibleOnMarketplace","createdAt","updatedAt"
) VALUES (
'legacy_l_12','legacy_u_2','Decorative Ridge Tile',NULL,'Order online from the reclaimed company.',3000,'used',(SELECT "id" FROM "Category" WHERE "slug" = 'other' LIMIT 1),NULL,NULL,NULL,ARRAY[]::text[],'active','sell','LOT',NULL,false,NULL,NULL,true,'2021-07-23T15:56:27Z'::timestamptz,'2021-07-23T15:56:27Z'::timestamptz);

INSERT INTO "Listing" (
"id","sellerId","title","sellerReference","description","price","condition","categoryId","postcode","lat","lng","images","status","listingKind","pricingMode","unitsAvailable","offersDelivery","deliveryCostPence","auctionEndsAt","visibleOnMarketplace","createdAt","updatedAt"
) VALUES (
'legacy_l_13','legacy_u_2','Over Tile',NULL,'Order online from the reclaimed company.',1000,'used',(SELECT "id" FROM "Category" WHERE "slug" = 'other' LIMIT 1),NULL,NULL,NULL,ARRAY['https://thereclaimedcompany.com/uploads/images/202107/img_1920x_60fae6c18b5145-98722715-46259338.jpg']::text[],'active','sell','LOT',NULL,false,NULL,NULL,true,'2021-07-23T15:56:49Z'::timestamptz,'2021-07-23T15:56:49Z'::timestamptz);

INSERT INTO "Listing" (
"id","sellerId","title","sellerReference","description","price","condition","categoryId","postcode","lat","lng","images","status","listingKind","pricingMode","unitsAvailable","offersDelivery","deliveryCostPence","auctionEndsAt","visibleOnMarketplace","createdAt","updatedAt"
) VALUES (
'legacy_l_14','legacy_u_2','Tegelen Dutch clay ridge tile',NULL,'Order online from the reclaimed company.',1000,'used',(SELECT "id" FROM "Category" WHERE "slug" = 'other' LIMIT 1),NULL,NULL,NULL,ARRAY[]::text[],'active','sell','LOT',NULL,false,NULL,NULL,true,'2021-07-23T15:56:49Z'::timestamptz,'2021-07-23T15:56:49Z'::timestamptz);

INSERT INTO "Listing" (
"id","sellerId","title","sellerReference","description","price","condition","categoryId","postcode","lat","lng","images","status","listingKind","pricingMode","unitsAvailable","offersDelivery","deliveryCostPence","auctionEndsAt","visibleOnMarketplace","createdAt","updatedAt"
) VALUES (
'legacy_l_15','legacy_u_2','Stone Ridge 001',NULL,'Order online from the reclaimed company.',3900,'used',(SELECT "id" FROM "Category" WHERE "slug" = 'other' LIMIT 1),NULL,NULL,NULL,ARRAY['https://thereclaimedcompany.com/uploads/images/202107/img_1920x_60fae6d7486107-46147844-29772053.jpg']::text[],'active','sell','LOT',NULL,false,NULL,NULL,true,'2021-07-23T15:57:11Z'::timestamptz,'2021-07-23T15:57:11Z'::timestamptz);

INSERT INTO "Listing" (
"id","sellerId","title","sellerReference","description","price","condition","categoryId","postcode","lat","lng","images","status","listingKind","pricingMode","unitsAvailable","offersDelivery","deliveryCostPence","auctionEndsAt","visibleOnMarketplace","createdAt","updatedAt"
) VALUES (
'legacy_l_16','legacy_u_2','Stone Ridge 002',NULL,'Order online from the reclaimed company.',3900,'used',(SELECT "id" FROM "Category" WHERE "slug" = 'other' LIMIT 1),NULL,NULL,NULL,ARRAY['https://thereclaimedcompany.com/uploads/images/202107/img_1920x_60fae6d7ce4c90-90454389-33960784.jpg']::text[],'active','sell','LOT',NULL,false,NULL,NULL,true,'2021-07-23T15:57:11Z'::timestamptz,'2021-07-23T15:57:11Z'::timestamptz);

COMMIT;