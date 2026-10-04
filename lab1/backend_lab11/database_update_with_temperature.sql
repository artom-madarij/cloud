USE lamp_store;

ALTER TABLE cart_items ADD COLUMN temperature VARCHAR(50) DEFAULT 'warm-white';

ALTER TABLE cart_items DROP INDEX unique_user_product;
ALTER TABLE cart_items ADD UNIQUE KEY unique_user_product_temp (user_id, product_id, temperature);