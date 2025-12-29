ALTER TABLE "product_connectors" ADD COLUMN "exclude_filters" jsonb DEFAULT '[]'::jsonb;
