CREATE TABLE shop_subcategory (
 id TEXT PRIMARY KEY, category_id TEXT NOT NULL REFERENCES shop_category(id),
 name TEXT NOT NULL COLLATE NOCASE, sort_order INTEGER NOT NULL DEFAULT 0,
 deleted INTEGER NOT NULL DEFAULT 0, deleted_at TEXT,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(category_id,name)
);
CREATE INDEX shop_subcategory_parent ON shop_subcategory(category_id,deleted,sort_order,id);
CREATE TABLE shop_product_subcategory (
 product_id TEXT NOT NULL REFERENCES shop_product(id),
 subcategory_id TEXT NOT NULL REFERENCES shop_subcategory(id),
 PRIMARY KEY(product_id,subcategory_id)
);
CREATE INDEX shop_subcategory_products ON shop_product_subcategory(subcategory_id,product_id);
CREATE TRIGGER shop_subcategory_parent_active BEFORE INSERT ON shop_subcategory BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM shop_category WHERE id=NEW.category_id AND deleted=0) THEN RAISE(ABORT,'SHOP_CATEGORY_UNAVAILABLE') END;
END;
CREATE TRIGGER shop_subcategory_parent_fixed BEFORE UPDATE OF category_id ON shop_subcategory
WHEN NEW.category_id<>OLD.category_id BEGIN
 SELECT RAISE(ABORT,'SHOP_SUBCATEGORY_PARENT_FIXED');
END;
CREATE TRIGGER shop_subcategory_link_valid BEFORE INSERT ON shop_product_subcategory BEGIN
 SELECT CASE WHEN NOT EXISTS(
  SELECT 1 FROM shop_subcategory s JOIN shop_category c ON c.id=s.category_id
  JOIN shop_product_category pc ON pc.category_id=s.category_id AND pc.product_id=NEW.product_id
  WHERE s.id=NEW.subcategory_id AND s.deleted=0 AND c.deleted=0
 ) THEN RAISE(ABORT,'SHOP_SUBCATEGORY_INVALID') END;
END;
CREATE TRIGGER shop_category_link_required BEFORE DELETE ON shop_product_category
WHEN EXISTS(SELECT 1 FROM shop_product_subcategory ps JOIN shop_subcategory s ON s.id=ps.subcategory_id WHERE ps.product_id=OLD.product_id AND s.category_id=OLD.category_id) BEGIN
 SELECT RAISE(ABORT,'SHOP_SUBCATEGORY_PARENT_REQUIRED');
END;
CREATE TRIGGER shop_category_children_active BEFORE UPDATE OF deleted ON shop_category
WHEN NEW.deleted=1 AND OLD.deleted=0 AND EXISTS(SELECT 1 FROM shop_subcategory WHERE category_id=OLD.id AND deleted=0) BEGIN
 SELECT RAISE(ABORT,'SHOP_CATEGORY_HAS_CHILDREN');
END;
