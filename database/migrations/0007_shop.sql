CREATE TABLE shop_category (
 id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE,
 sort_order INTEGER NOT NULL DEFAULT 0, deleted INTEGER NOT NULL DEFAULT 0,
 deleted_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE shop_product (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL,
 price_label TEXT NOT NULL DEFAULT '', purchase_url TEXT NOT NULL DEFAULT '',
 published INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0,
 deleted INTEGER NOT NULL DEFAULT 0, deleted_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE shop_product_category (
 product_id TEXT NOT NULL REFERENCES shop_product(id),
 category_id TEXT NOT NULL REFERENCES shop_category(id), PRIMARY KEY(product_id,category_id)
);
CREATE INDEX shop_category_products ON shop_product_category(category_id,product_id);
CREATE TABLE shop_media (
 id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES shop_product(id),
 url TEXT NOT NULL, alt_text TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX shop_media_product ON shop_media(product_id,sort_order,created_at,id);
CREATE INDEX shop_public_products ON shop_product(deleted,published,sort_order,id);
CREATE TRIGGER shop_gallery_limit BEFORE INSERT ON shop_media BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM shop_media WHERE product_id=NEW.product_id)>=50 THEN RAISE(ABORT,'SHOP_GALLERY_LIMIT') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM shop_product WHERE id=NEW.product_id AND deleted=0) THEN RAISE(ABORT,'SHOP_PRODUCT_UNAVAILABLE') END;
END;
CREATE TRIGGER shop_active_category BEFORE INSERT ON shop_product_category BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM shop_category WHERE id=NEW.category_id AND deleted=0) THEN RAISE(ABORT,'SHOP_CATEGORY_UNAVAILABLE') END;
END;
