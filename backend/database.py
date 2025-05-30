import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any, Optional
import json
from uuid import UUID
from models import User, UserCreate, Pillar, PillarCreate

class Database:
    def __init__(self, db_config: Dict[str, str]):
        self.db_config = db_config
        self._init_database()
    
    def _init_database(self):
        """Initialize PostgreSQL tables"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            # Create users table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    email VARCHAR(255) UNIQUE NOT NULL,
                    name VARCHAR(255),
                    google_id VARCHAR(255) UNIQUE,
                    avatar_url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # Create user_pillars table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_pillars (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    category VARCHAR(50) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    avatar_url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # Create memory_photos table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS memory_photos (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
                    cloudinary_url TEXT NOT NULL,
                    original_filename TEXT,
                    metadata JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # Update memories table to use UUID for user_id (if not already)
            cursor.execute("""
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'memories' AND column_name = 'user_id' AND data_type = 'uuid'
                    ) THEN
                        -- Add temporary column
                        ALTER TABLE memories ADD COLUMN user_id_temp UUID;
                        
                        -- Add users if they don't exist (for existing data)
                        INSERT INTO users (email, name, google_id) 
                        SELECT 'migration@example.com', 'Migration User', 'migration_user'
                        WHERE NOT EXISTS (SELECT 1 FROM users WHERE google_id = 'migration_user');
                        
                        -- Update temp column with actual user ID
                        UPDATE memories SET user_id_temp = (SELECT id FROM users WHERE google_id = 'migration_user');
                        
                        -- Drop old column and rename
                        ALTER TABLE memories DROP COLUMN user_id;
                        ALTER TABLE memories RENAME COLUMN user_id_temp TO user_id;
                        
                        -- Add foreign key constraint
                        ALTER TABLE memories ADD CONSTRAINT fk_memories_user_id 
                        FOREIGN KEY (user_id) REFERENCES users(id);
                    END IF;
                END $$;
            """)
            
            # Create indexes
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
                CREATE INDEX IF NOT EXISTS idx_user_pillars_user_id ON user_pillars(user_id);
                CREATE INDEX IF NOT EXISTS idx_user_pillars_category ON user_pillars(category);
                CREATE INDEX IF NOT EXISTS idx_memory_photos_memory_id ON memory_photos(memory_id);
                CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
            """)
            
            conn.commit()
            cursor.close()
            conn.close()
            print("✅ Database initialized successfully")
            
        except Exception as e:
            print(f"❌ Database initialization error: {e}")
    
    def create_user(self, user_data: UserCreate) -> Optional[User]:
        """Create a new user"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                INSERT INTO users (email, name, google_id, avatar_url)
                VALUES (%s, %s, %s, %s)
                RETURNING id, email, name, google_id, avatar_url, created_at;
            """, (user_data.email, user_data.name, user_data.google_id, user_data.avatar_url))
            
            user_row = cursor.fetchone()
            conn.commit()
            cursor.close()
            conn.close()
            
            if user_row:
                return User(**dict(user_row))
            
        except Exception as e:
            print(f"Error creating user: {e}")
            return None
    
    def get_user_by_google_id(self, google_id: str) -> Optional[User]:
        """Get user by Google ID"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT id, email, name, google_id, avatar_url, created_at
                FROM users WHERE google_id = %s;
            """, (google_id,))
            
            user_row = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if user_row:
                return User(**dict(user_row))
            
        except Exception as e:
            print(f"Error getting user: {e}")
            return None
    
    def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        """Get user by ID"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT id, email, name, google_id, avatar_url, created_at
                FROM users WHERE id = %s;
            """, (str(user_id),))
            
            user_row = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if user_row:
                return User(**dict(user_row))
            
        except Exception as e:
            print(f"Error getting user by ID: {e}")
            return None
    
    def create_pillars(self, user_id: UUID, pillars: List[PillarCreate]) -> List[Pillar]:
        """Create multiple pillars for a user"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            created_pillars = []
            for pillar in pillars:
                cursor.execute("""
                    INSERT INTO user_pillars (user_id, category, name, avatar_url)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id, user_id, category, name, avatar_url, created_at;
                """, (str(user_id), pillar.category, pillar.name, pillar.avatar_url))
                
                pillar_row = cursor.fetchone()
                if pillar_row:
                    created_pillars.append(Pillar(**dict(pillar_row)))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return created_pillars
            
        except Exception as e:
            print(f"Error creating pillars: {e}")
            return []
    
    def get_user_pillars(self, user_id: UUID) -> List[Pillar]:
        """Get all pillars for a user"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT id, user_id, category, name, avatar_url, created_at
                FROM user_pillars WHERE user_id = %s
                ORDER BY category, created_at;
            """, (str(user_id),))
            
            pillar_rows = cursor.fetchall()
            cursor.close()
            conn.close()
            
            return [Pillar(**dict(row)) for row in pillar_rows]
            
        except Exception as e:
            print(f"Error getting user pillars: {e}")
            return []