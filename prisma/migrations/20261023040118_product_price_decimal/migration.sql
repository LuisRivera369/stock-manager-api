ALTER TABLE "products"
  ALTER COLUMN "price" SET DATA TYPE DECIMAL(10, 2) USING "price"::numeric(10, 2);
