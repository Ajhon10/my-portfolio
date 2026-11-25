ALTER TABLE project ADD COLUMN company TEXT NOT NULL DEFAULT '';
ALTER TABLE shop_product ADD COLUMN sold_count INTEGER NOT NULL DEFAULT 0 CHECK(sold_count>=0);
ALTER TABLE shop_product ADD COLUMN rating_average REAL CHECK(rating_average IS NULL OR (rating_average>=0 AND rating_average<=5));
ALTER TABLE shop_product ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0 CHECK(rating_count>=0 AND ((rating_count=0 AND rating_average IS NULL) OR (rating_count>0 AND rating_average IS NOT NULL)));
