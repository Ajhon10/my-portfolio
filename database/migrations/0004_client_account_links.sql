CREATE TABLE client_account_links(request_id TEXT PRIMARY KEY REFERENCES client_request(id));
