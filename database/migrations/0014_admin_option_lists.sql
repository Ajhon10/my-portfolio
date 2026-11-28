CREATE TABLE admin_option_list (
 id TEXT PRIMARY KEY CHECK (id IN ('projects', 'gears', 'photography', 'tech-stack', 'chatbot-tags')),
 options_json TEXT NOT NULL CHECK (json_valid(options_json) AND json_type(options_json)='array'),
 revision TEXT NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
