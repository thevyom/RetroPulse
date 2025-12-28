// MongoDB initialization script
// This runs automatically when the container first starts

// Switch to the retroboard database
db = db.getSiblingDB('retroboard');

// Create collections with validation
db.createCollection('boards');
db.createCollection('cards');
db.createCollection('reactions');
db.createCollection('user_sessions');

// Create indexes for boards collection
db.boards.createIndex({ shareable_link: 1 }, { unique: true });
db.boards.createIndex({ state: 1 });
db.boards.createIndex({ created_at: -1 });

// Create indexes for cards collection
db.cards.createIndex({ board_id: 1, created_at: -1 });
db.cards.createIndex({ board_id: 1, created_by_hash: 1, card_type: 1 });
db.cards.createIndex({ parent_card_id: 1 });
db.cards.createIndex({ board_id: 1, column_id: 1 });

// Create indexes for reactions collection
db.reactions.createIndex({ card_id: 1, user_cookie_hash: 1 }, { unique: true });
db.reactions.createIndex({ card_id: 1 });

// Create indexes for user_sessions collection
db.user_sessions.createIndex({ board_id: 1, cookie_hash: 1 }, { unique: true });
db.user_sessions.createIndex({ board_id: 1, last_active_at: -1 });

print('RetroPulse database initialized with indexes');
