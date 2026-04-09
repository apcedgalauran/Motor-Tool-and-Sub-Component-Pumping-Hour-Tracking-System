-- Map old enum values to new standard statuses
UPDATE "Motor" SET "status" = 'ON_LOCATION' WHERE "status" = 'ACTIVE';
UPDATE "Motor" SET "status" = 'IN_BASE' WHERE "status" = 'INACTIVE';
UPDATE "Motor" SET "status" = 'FOR_MAINTENANCE' WHERE "status" = 'IN_MAINTENANCE';
