ALTER TABLE shop_product ADD COLUMN marketplace_links TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(marketplace_links));
