ALTER TABLE property_searches
DROP CONSTRAINT IF EXISTS property_searches_transaction_check;

ALTER TABLE property_searches
ADD CONSTRAINT property_searches_transaction_check
CHECK (transaction IN ('SALE', 'RENT', 'AUCTION'));
