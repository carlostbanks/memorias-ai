import uuid
import json
import pickle
import os
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from sentence_transformers import SentenceTransformer
import spacy
from textblob import TextBlob
import faiss
import psycopg2
from psycopg2.extras import RealDictCursor
from sklearn.metrics.pairwise import cosine_similarity

class MemoryEngine:
    def __init__(self, db_config: Dict[str, str]):
        # Load AI models
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.embedding_dim = 384  # Dimension of all-MiniLM-L6-v2
        
        try:
            self.nlp = spacy.load('en_core_web_sm')
        except IOError:
            print("Please install spacy model: python -m spacy download en_core_web_sm")
            self.nlp = None
            
        # Initialize FAISS index
        self.index_path = "./memory_index.faiss"
        self.metadata_path = "./memory_metadata.pkl"
        self._load_or_create_index()
        
        # PostgreSQL connection
        self.db_config = db_config
        self._init_database()
        
    def _load_or_create_index(self):
        """Load existing FAISS index or create new one"""
        if os.path.exists(self.index_path):
            self.index = faiss.read_index(self.index_path)
            with open(self.metadata_path, 'rb') as f:
                self.id_to_metadata = pickle.load(f)
        else:
            # Create new FAISS index (using IndexFlatIP for cosine similarity)
            self.index = faiss.IndexFlatIP(self.embedding_dim)
            self.id_to_metadata = {}
            
    def _save_index(self):
        """Save FAISS index and metadata to disk"""
        faiss.write_index(self.index, self.index_path)
        with open(self.metadata_path, 'wb') as f:
            pickle.dump(self.id_to_metadata, f)
            
    def _init_database(self):
        """Initialize PostgreSQL tables"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            # Create memories table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS memories (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id VARCHAR(100) NOT NULL,
                    content TEXT NOT NULL,
                    entities JSONB,
                    categories JSONB,
                    emotions JSONB,
                    importance FLOAT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    faiss_index INTEGER
                );
            """)
            
            # Create index for faster queries
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
                CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC);
                CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
            """)
            
            conn.commit()
            cursor.close()
            conn.close()
            
        except Exception as e:
            print(f"Database initialization error: {e}")
    
    def extract_entities(self, text: str) -> List[str]:
        """Extract named entities from text using spaCy"""
        if not self.nlp:
            return []
        
        doc = self.nlp(text)
        entities = []
        
        # Get named entities
        for ent in doc.ents:
            if ent.label_ in ['PERSON', 'ORG', 'GPE', 'EVENT', 'PRODUCT', 'DATE']:
                entities.append(ent.text)
                
        # Get important nouns and proper nouns
        for token in doc:
            if ((token.pos_ in ['NOUN', 'PROPN']) and 
                not token.is_stop and 
                len(token.text) > 2 and
                token.text not in entities):
                entities.append(token.text)
                
        return list(set(entities))
    
    def analyze_sentiment(self, text: str) -> Dict[str, float]:
        """Analyze emotional content of text"""
        blob = TextBlob(text)
        
        # Basic sentiment
        polarity = blob.sentiment.polarity  # -1 to 1
        subjectivity = blob.sentiment.subjectivity  # 0 to 1
        
        # Convert to emotional categories
        emotions = {
            'joy': max(0, polarity) if polarity > 0.1 else 0,
            'sadness': max(0, -polarity) if polarity < -0.1 else 0,
            'neutral': 1 - subjectivity if abs(polarity) < 0.1 else 0,
            'intensity': subjectivity,
            'polarity': polarity
        }
        
        return emotions
    
    def categorize_memory(self, text: str, entities: List[str]) -> List[str]:
        """Categorize memory based on content and entities"""
        categories = []
        text_lower = text.lower()
        
        # Define category keywords
        category_keywords = {
            'work': ['work', 'job', 'office', 'meeting', 'project', 'colleague', 'boss', 'client', 'deadline'],
            'family': ['mom', 'dad', 'sister', 'brother', 'family', 'parent', 'child', 'grandmother', 'grandfather'],
            'friends': ['friend', 'buddy', 'hang out', 'party', 'social', 'catch up'],
            'hobbies': ['hobby', 'learn', 'practice', 'play', 'game', 'sport', 'music', 'art', 'craft'],
            'health': ['doctor', 'exercise', 'gym', 'sick', 'medicine', 'therapy', 'workout', 'diet'],
            'travel': ['trip', 'vacation', 'travel', 'visit', 'flight', 'hotel', 'airport', 'destination'],
            'food': ['restaurant', 'cook', 'eat', 'recipe', 'dinner', 'lunch', 'breakfast', 'meal'],
            'relationships': ['date', 'relationship', 'love', 'partner', 'boyfriend', 'girlfriend', 'spouse'],
            'learning': ['study', 'book', 'course', 'school', 'university', 'lesson', 'tutorial'],
            'personal': ['feel', 'think', 'remember', 'dream', 'goal', 'plan', 'decision']
        }
        
        for category, keywords in category_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                categories.append(category)
                
        # Entity-based categorization
        for entity in entities:
            entity_lower = entity.lower()
            if any(name in entity_lower for name in ['restaurant', 'cafe', 'bar']):
                categories.append('food')
            elif any(place in entity_lower for name in ['gym', 'hospital', 'clinic']):
                categories.append('health')
                
        # Default category if none found
        if not categories:
            categories = ['personal']
            
        return list(set(categories))
    
    def calculate_importance(self, text: str, emotions: Dict[str, float], 
                           entities: List[str], categories: List[str]) -> float:
        """Calculate memory importance score (0-1)"""
        base_score = 0.3
        
        # Emotional intensity increases importance
        emotional_boost = emotions.get('intensity', 0) * 0.25
        
        # Strong emotions (positive or negative) increase importance
        emotion_strength = max(emotions.get('joy', 0), emotions.get('sadness', 0))
        emotion_boost = emotion_strength * 0.2
        
        # More entities = more important (people, places, things mentioned)
        entity_boost = min(len(entities) * 0.03, 0.15)
        
        # Certain categories are more important
        important_categories = ['work', 'family', 'relationships', 'health']
        category_boost = 0.1 if any(cat in important_categories for cat in categories) else 0
        
        # Length factor (detailed memories might be more important)
        word_count = len(text.split())
        length_factor = min(word_count / 100, 0.1) if word_count > 10 else 0
        
        importance = base_score + emotional_boost + emotion_boost + entity_boost + category_boost + length_factor
        return min(max(importance, 0.1), 1.0)  # Clamp between 0.1 and 1.0
    
    def add_memory(self, text: str, user_id: str = "default") -> str:
        """Add a new memory to the system"""
        try:
            # Generate embedding
            embedding = self.embedding_model.encode([text])[0]
            
            # Extract features
            entities = self.extract_entities(text)
            emotions = self.analyze_sentiment(text)
            categories = self.categorize_memory(text, entities)
            importance = self.calculate_importance(text, emotions, entities, categories)
            
            # Add to FAISS index
            faiss_index = self.index.ntotal
            embedding_normalized = embedding / np.linalg.norm(embedding)  # Normalize for cosine similarity
            self.index.add(np.array([embedding_normalized], dtype=np.float32))
            
            # Save to PostgreSQL
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO memories (user_id, content, entities, categories, emotions, importance, faiss_index)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                user_id, text, json.dumps(entities), json.dumps(categories), 
                json.dumps(emotions), importance, faiss_index
            ))
            
            memory_id = cursor.fetchone()[0]
            conn.commit()
            cursor.close()
            conn.close()
            
            # Update metadata
            self.id_to_metadata[faiss_index] = {
                'id': str(memory_id),
                'user_id': user_id,
                'content': text,
                'entities': entities,
                'categories': categories,
                'emotions': emotions,
                'importance': importance,
                'created_at': datetime.now().isoformat()
            }
            
            # Save index
            self._save_index()
            
            return str(memory_id)
            
        except Exception as e:
            print(f"Error adding memory: {e}")
            return None
    
    def search_memories(self, query: str, user_id: str = "default", 
                       limit: int = 10) -> List[Dict[str, Any]]:
        """Search for similar memories using FAISS"""
        try:
            # Generate query embedding
            query_embedding = self.embedding_model.encode([query])[0]
            query_normalized = query_embedding / np.linalg.norm(query_embedding)
            
            # Search FAISS index
            scores, indices = self.index.search(
                np.array([query_normalized], dtype=np.float32), 
                min(limit * 2, self.index.ntotal)  # Get more results to filter by user
            )
            
            # Filter results by user and format response
            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx == -1:  # FAISS returns -1 for invalid indices
                    continue
                    
                metadata = self.id_to_metadata.get(idx)
                if metadata and metadata['user_id'] == user_id:
                    result = metadata.copy()
                    result['similarity_score'] = float(score)
                    results.append(result)
                    
                if len(results) >= limit:
                    break
            
            return results
            
        except Exception as e:
            print(f"Error searching memories: {e}")
            return []
    
    def get_recent_memories(self, user_id: str = "default", limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent memories for a user"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT id, content, entities, categories, emotions, importance, created_at
                FROM memories 
                WHERE user_id = %s 
                ORDER BY created_at DESC 
                LIMIT %s;
            """, (user_id, limit))
            
            memories = cursor.fetchall()
            cursor.close()
            conn.close()
            
            # Convert to list of dicts
            return [dict(memory) for memory in memories]
            
        except Exception as e:
            print(f"Error getting recent memories: {e}")
            return []
    
    def get_memory_clusters(self, user_id: str = "default") -> Dict[str, List[Dict[str, Any]]]:
        """Get memories grouped by categories"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT id, content, entities, categories, emotions, importance, created_at
                FROM memories 
                WHERE user_id = %s 
                ORDER BY importance DESC, created_at DESC;
            """, (user_id,))
            
            memories = cursor.fetchall()
            cursor.close()
            conn.close()
            
            # Group by categories
            clusters = {}
            for memory in memories:
                memory_dict = dict(memory)
                categories = memory_dict.get('categories', ['personal'])
                
                for category in categories:
                    if category not in clusters:
                        clusters[category] = []
                    clusters[category].append(memory_dict)
            
            return clusters
            
        except Exception as e:
            print(f"Error getting memory clusters: {e}")
            return {}