CREATE TABLE "gear" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "name" VARCHAR(160) NOT NULL,
    "brand" VARCHAR(120) NOT NULL DEFAULT '',
    "category" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "specifications" VARCHAR(1000) NOT NULL DEFAULT '',
    "image_url" TEXT NOT NULL DEFAULT '',
    "alt_text" VARCHAR(500) NOT NULL,
    "product_url" TEXT NOT NULL DEFAULT '',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "gear_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gear_sort_order_nonnegative" CHECK ("sort_order" >= 0)
);

CREATE INDEX "gear_public_list_idx" ON "gear"("deleted", "published", "sort_order");
