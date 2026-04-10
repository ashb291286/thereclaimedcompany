-- Optional DVLA Vehicle Enquiry Service snapshot on Driven vehicles
ALTER TABLE "DrivenVehicle" ADD COLUMN "dvlaSnapshotJson" JSONB;
