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
from google.cloud import vision
import io
import requests

class MemoryEngine:
    def __init__(self, db_config: Dict[str, str]):
        # Load AI models - UPGRADED MODEL
        self.embedding_model = SentenceTransformer('all-mpnet-base-v2')
        self.embedding_dim = 768  # Dimension of all-mpnet-base-v2
        
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
        """Initialize PostgreSQL tables - Updated for new auth system"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            # Note: Main table creation is now handled by database.py
            # This just ensures memories table exists with proper indexes
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS memories (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL,
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
            
            # Create indexes for faster queries
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
                CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC);
                CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_memories_faiss_index ON memories(faiss_index);
            """)
            
            conn.commit()
            cursor.close()
            conn.close()
            
        except Exception as e:
            print(f"Database initialization error: {e}")
    
    def extract_entities(self, text: str, image_entities: List[str] = None) -> List[str]:
        """Extract named entities from text using spaCy + image entities"""
        entities = []
        
        # Original spaCy entity extraction
        if self.nlp:
            doc = self.nlp(text)
            
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
        
        # Add image-detected entities
        if image_entities:
            entities.extend(image_entities)
                    
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
    
    def categorize_memory(self, text: str, entities: List[str], user_pillars: List = None, image_objects: List[str] = None) -> List[str]:
        """Enhanced categorization with image objects and enhanced pillar matching"""
        categories = []
        text_lower = text.lower()
        
        # Combine text entities and image objects for categorization
        all_content = text_lower
        if image_objects:
            all_content += " " + " ".join(image_objects)
        
        # Enhanced category keywords (including image objects)
        category_keywords = {
            'work': ['work', 'job', 'office', 'meeting', 'project', 'colleague', 'boss', 'client', 'deadline', 'computer', 'laptop', 'desk'],
            'family': ['mom', 'dad', 'sister', 'brother', 'family', 'parent', 'child', 'baby', 'person'],
            'friends': ['friend', 'buddy', 'hang out', 'party', 'social', 'person', 'group'],
            'hobbies': ['hobby', 'learn', 'practice', 'play', 'game', 'sport', 'music', 'art', 'craft', 'guitar', 'piano', 'musical instrument', 'book', 'painting'],
            'health': ['doctor', 'exercise', 'gym', 'sick', 'medicine', 'therapy', 'workout', 'medical equipment'],
            'travel': ['trip', 'vacation', 'travel', 'visit', 'flight', 'hotel', 'airport', 'car', 'vehicle', 'landscape', 'building'],
            'food': ['restaurant', 'cook', 'eat', 'recipe', 'dinner', 'lunch', 'breakfast', 'meal', 'food', 'drink', 'kitchen'],
            'relationships': ['date', 'relationship', 'love', 'partner', 'wedding', 'person'],
            'learning': ['study', 'book', 'course', 'school', 'university', 'lesson'],
            'nature': ['plant', 'flower', 'tree', 'garden', 'outdoor', 'sky', 'animal', 'pet'],
            'personal': ['feel', 'think', 'remember', 'dream', 'goal', 'plan']
        }
        
        # Basic category matching
        for category, keywords in category_keywords.items():
            if any(keyword in all_content for keyword in keywords):
                categories.append(category)
        
        # ENHANCED PILLAR MATCHING (RESTORED)
        if user_pillars:
            for pillar in user_pillars:
                pillar_name_lower = pillar.name.lower()
                pillar_words = pillar_name_lower.split()
                
                # Direct name match in text
                if pillar_name_lower in text_lower:
                    categories.append(f"pillar_{pillar.category}")
                    # Also add the category itself for better search
                    categories.append(pillar.category)
                    
                # Partial word matching for multi-word pillars
                elif len(pillar_words) > 1:
                    if any(word in text_lower for word in pillar_words if len(word) > 2):
                        categories.append(f"pillar_{pillar.category}")
                        categories.append(pillar.category)
                
                # Entity matching
                for entity in entities:
                    if pillar_name_lower in entity.lower() or any(word in entity.lower() for word in pillar_words if len(word) > 2):
                        categories.append(f"pillar_{pillar.category}")
                        categories.append(pillar.category)
                
                # Image objects matching (NEW)
                if image_objects:
                    for image_obj in image_objects:
                        if (pillar_name_lower in image_obj.lower() or 
                            any(word in image_obj.lower() for word in pillar_words if len(word) > 2)):
                            categories.append(f"pillar_{pillar.category}")
                            categories.append(pillar.category)
        
        # Default category
        if not categories:
            categories = ['personal']
            
        return list(set(categories))  # Remove duplicates
    
    def extract_image_context(self, photos: List) -> Tuple[str, List[str]]:
        """Extract objects, text, and context from images using Google Vision API"""
        if not photos:
            return "", []
        
        try:
            # Initialize Vision API client
            client = vision.ImageAnnotatorClient()
            
            all_objects = []
            all_text = []
            photo_contexts = []
            
            for photo in photos:
                photo_url = photo.get('url')
                if not photo_url:
                    continue
                    
                try:
                    # Download image from Cloudinary
                    response = requests.get(photo_url)
                    if response.status_code != 200:
                        continue
                        
                    image_content = response.content
                    image = vision.Image(content=image_content)
                    
                    # Initialize variables
                    detected_objects = []
                    detected_labels = []
                    detected_text = ""  # Initialize here
                    
                    # 1. Object Detection
                    objects = client.object_localization(image=image).localized_object_annotations
                    for obj in objects:
                        if obj.score > 0.5:  # Only high-confidence objects
                            object_name = obj.name.lower()
                            detected_objects.append(object_name)
                            all_objects.append(object_name)
                    
                    # 2. Text Detection (OCR)
                    texts = client.text_detection(image=image).text_annotations
                    if texts:
                        # First annotation contains all detected text
                        detected_text = texts[0].description.strip()
                        if detected_text:
                            all_text.append(detected_text)
                    
                    # 3. Label Detection (broader categories)
                    labels = client.label_detection(image=image).label_annotations
                    for label in labels:
                        if label.score > 0.7:  # High confidence labels only
                            label_name = label.description.lower()
                            detected_labels.append(label_name)
                            all_objects.append(label_name)
                    
                    # Build context for this photo
                    photo_context_parts = []
                    if detected_objects:
                        photo_context_parts.extend(detected_objects)
                    if detected_labels:
                        photo_context_parts.extend(detected_labels[:3])  # Top 3 labels
                    if detected_text:
                        # Add key words from OCR text
                        text_words = [word.strip() for word in detected_text.split() if len(word.strip()) > 2]
                        photo_context_parts.extend(text_words[:5])  # First 5 meaningful words
                    
                    photo_context_parts.append("photo image visual")
                    photo_contexts.append(" ".join(photo_context_parts))
                    
                    print(f"🔍 Image Analysis Results:")
                    print(f"   Objects: {detected_objects}")
                    print(f"   Labels: {detected_labels}")
                    print(f"   Text: {detected_text if detected_text else 'None'}")
                    
                except Exception as photo_error:
                    print(f"Error processing individual photo: {photo_error}")
                    photo_contexts.append("photo image visual")
                    continue
            
            # Combine all contexts
            combined_context = " ".join(photo_contexts)
            unique_entities = list(set(all_objects + [word for text in all_text for word in text.split() if len(word) > 2]))
            
            print(f"🏷️ Final Image Entities: {unique_entities}")
            return combined_context, unique_entities[:10]  # Limit entities
            
        except Exception as e:
            print(f"Error in image processing: {e}")
            # Fallback to basic context
            return "photo image visual", []
    
    def calculate_importance(self, text: str, emotions: Dict[str, float], 
                       entities: List[str], categories: List[str], photos: List = None) -> float:
        """Calculate memory importance score (0-1) - Enhanced version"""
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
        
        # Pillar-related memories are more important (enhanced detection)
        pillar_boost = 0
        pillar_categories = [cat for cat in categories if cat.startswith('pillar_')]
        if pillar_categories:
            pillar_boost = min(len(pillar_categories) * 0.1, 0.2)  # More pillars = more important
        
        # Photos make memories more important
        photo_boost = 0
        if photos and len(photos) > 0:
            photo_boost = min(len(photos) * 0.05, 0.15)  # Each photo adds value, cap at 0.15
        
        # Length factor (detailed memories might be more important)
        word_count = len(text.split())
        length_factor = min(word_count / 100, 0.1) if word_count > 10 else 0
        
        importance = base_score + emotional_boost + emotion_boost + entity_boost + category_boost + pillar_boost + photo_boost + length_factor
        return min(max(importance, 0.1), 1.0)  # Clamp between 0.1 and 1.0
    
    def add_memory(self, text: str, user_id: str, user_pillars: List = None, photos: List = None) -> str:
        """Add a new memory to the system with enhanced photo processing"""
        try:
            # Extract image context and entities
            image_context, image_entities = self.extract_image_context(photos) if photos else ("", [])
            
            # Generate intelligent photo description if no text provided
            if not text.strip() and image_entities:
                # Create smart description from detected objects
                primary_objects = image_entities[:3]  # Top 3 detected objects
                if len(primary_objects) == 1:
                    text = f"A photo of {primary_objects[0]}"
                elif len(primary_objects) == 2:
                    text = f"A photo of {primary_objects[0]} and {primary_objects[1]}"
                else:
                    text = f"A photo of {', '.join(primary_objects[:-1])} and {primary_objects[-1]}"
            elif not text.strip():
                text = "A photo"
            
            searchable_text = f"{text} {image_context}".strip()
            
            print(f"📝 Original text: '{text}'")
            print(f"🔍 Searchable text: '{searchable_text}'")
            
            # Rest of the function stays the same...
            # Generate embedding from enhanced searchable text
            embedding = self.embedding_model.encode([searchable_text])[0]
            
            # Extract features (enhanced with image data)
            entities = self.extract_entities(text, image_entities)
            emotions = self.analyze_sentiment(text)
            categories = self.categorize_memory(text, entities, user_pillars, image_entities)
            importance = self.calculate_importance(text, emotions, entities, categories, photos)
            
            print(f"🏷️ Final entities: {entities}")
            print(f"📂 Final categories: {categories}")
            
            # Add to FAISS index
            faiss_index = self.index.ntotal
            embedding_normalized = embedding / np.linalg.norm(embedding)
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
            
            # Save photos with enhanced metadata
            if photos:
                for photo in photos:
                    cursor.execute("""
                        INSERT INTO memory_photos (memory_id, cloudinary_url, original_filename, metadata)
                        VALUES (%s, %s, %s, %s);
                    """, (
                        str(memory_id), 
                        photo.get('url'), 
                        photo.get('public_id'), 
                        json.dumps(photo.get('metadata', {}))
                    ))
            
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
                'created_at': datetime.now().isoformat(),
                'photos': photos or []
            }
            
            self._save_index()
            return str(memory_id)
            
        except Exception as e:
            print(f"Error adding memory: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
        
    def test_vision_api(self):
        """Test Google Vision API setup"""
        try:
            from google.cloud import vision
            import os
            
            # Check if credentials file exists
            cred_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
            if not cred_path or not os.path.exists(cred_path):
                print(f"❌ Credentials file not found at: {cred_path}")
                return False
                
            client = vision.ImageAnnotatorClient()
            print("✅ Google Vision API connected successfully!")
            print(f"✅ Using credentials from: {cred_path}")
            return True
        except Exception as e:
            print(f"❌ Google Vision API error: {e}")
            return False
    
    def search_memories(self, query: str, user_id: str, limit: int = 10, min_threshold: float = 0.25) -> List[Dict[str, Any]]:
        """Enhanced search with pillar boosting and better thresholds"""
        try:
            # Get user pillars for context boosting
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT name, category FROM user_pillars WHERE user_id = %s
            """, (user_id,))
            
            user_pillars = cursor.fetchall()
            pillar_terms = [p['name'].lower() for p in user_pillars]
            
            # Generate query embedding
            query_embedding = self.embedding_model.encode([query])[0]
            query_normalized = query_embedding / np.linalg.norm(query_embedding)
            
            # Search FAISS index
            scores, indices = self.index.search(
                np.array([query_normalized], dtype=np.float32), 
                min(limit * 5, self.index.ntotal)  # Get more to filter and boost
            )
            
            results = []
            seen_ids = set()
            query_lower = query.lower()
            
            for score, idx in zip(scores[0], indices[0]):
                if idx == -1:
                    continue
                    
                # Get memory from database
                cursor.execute("""
                    SELECT m.id, m.content, m.entities, m.categories, m.emotions, 
                        m.importance, m.created_at, m.faiss_index,
                        COALESCE(
                            json_agg(
                                json_build_object(
                                    'url', mp.cloudinary_url,
                                    'public_id', mp.original_filename,
                                    'metadata', mp.metadata
                                )
                            ) FILTER (WHERE mp.id IS NOT NULL), 
                            '[]'::json
                        ) as photos
                    FROM memories m
                    LEFT JOIN memory_photos mp ON m.id = mp.memory_id
                    WHERE m.user_id = %s AND m.faiss_index = %s
                    GROUP BY m.id, m.content, m.entities, m.categories, m.emotions, m.importance, m.created_at, m.faiss_index
                    LIMIT 1;
                """, (user_id, int(idx)))
                
                memory_row = cursor.fetchone()
                if not memory_row:
                    continue
                    
                memory_dict = dict(memory_row)
                memory_id = str(memory_dict['id'])
                
                if memory_id in seen_ids:
                    continue
                    
                # ENHANCED SCORING LOGIC
                final_score = float(score)
                content_lower = memory_dict['content'].lower()
                
                # 1. Exact query match boost
                if query_lower in content_lower:
                    final_score += 0.3
                    
                # 2. Pillar relevance boost
                pillar_boost = 0
                for pillar_term in pillar_terms:
                    if pillar_term in content_lower:
                        pillar_boost += 0.2
                    # Check entities too
                    entities = memory_dict.get('entities', [])
                    for entity in entities:
                        if pillar_term in entity.lower():
                            pillar_boost += 0.15
                
                final_score += min(pillar_boost, 0.4)  # Cap pillar boost
                
                # 3. Entity relevance boost
                entities = memory_dict.get('entities', [])
                for entity in entities:
                    if query_lower in entity.lower():
                        final_score += 0.2
                        
                # 4. Category relevance boost
                categories = memory_dict.get('categories', [])
                for category in categories:
                    if query_lower in category.lower():
                        final_score += 0.1
                        
                # 5. Importance boost
                importance = memory_dict.get('importance', 0)
                final_score += importance * 0.1
                
                # Apply minimum threshold
                if final_score < min_threshold:
                    continue
                    
                seen_ids.add(memory_id)
                
                # Convert and add to results
                if memory_dict.get('created_at'):
                    memory_dict['created_at'] = memory_dict['created_at'].isoformat()
                memory_dict['id'] = memory_id
                memory_dict['similarity_score'] = min(final_score, 1.0)  # Cap at 1.0
                results.append(memory_dict)
            
            # Sort by final score
            results.sort(key=lambda x: x['similarity_score'], reverse=True)
            
            cursor.close()
            conn.close()
            return results[:limit]
            
        except Exception as e:
            print(f"Error searching memories: {e}")
            return []
    
    def get_recent_memories(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent memories for a user with photos"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT m.id, m.content, m.entities, m.categories, m.emotions, m.importance, m.created_at,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'url', mp.cloudinary_url,
                                'public_id', mp.original_filename,
                                'metadata', mp.metadata
                            )
                        ) FILTER (WHERE mp.id IS NOT NULL), 
                        '[]'::json
                    ) as photos
                FROM memories m
                LEFT JOIN memory_photos mp ON m.id = mp.memory_id
                WHERE m.user_id = %s 
                GROUP BY m.id, m.content, m.entities, m.categories, m.emotions, m.importance, m.created_at
                ORDER BY m.created_at DESC 
                LIMIT %s;
            """, (user_id, limit))
            
            memories = cursor.fetchall()
            cursor.close()
            conn.close()
            
            # Convert to list of dicts and fix datetime
            result = []
            for memory in memories:
                memory_dict = dict(memory)
                # Convert datetime to string
                if memory_dict.get('created_at'):
                    memory_dict['created_at'] = memory_dict['created_at'].isoformat()
                # Convert UUID to string
                memory_dict['id'] = str(memory_dict['id'])
                result.append(memory_dict)
                
            return result
            
        except Exception as e:
            print(f"Error getting recent memories: {e}")
            return []
    
    def get_memory_clusters(self, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
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
            
            # Group by categories and fix data types
            clusters = {}
            for memory in memories:
                memory_dict = dict(memory)
                # Convert datetime to string
                if memory_dict.get('created_at'):
                    memory_dict['created_at'] = memory_dict['created_at'].isoformat()
                # Convert UUID to string
                memory_dict['id'] = str(memory_dict['id'])
                
                categories = memory_dict.get('categories', ['personal'])
                
                for category in categories:
                    if category not in clusters:
                        clusters[category] = []
                    clusters[category].append(memory_dict)
            
            return clusters
            
        except Exception as e:
            print(f"Error getting memory clusters: {e}")
            return {}