import firebase_admin
from firebase_admin import credentials, firestore
import json
import os

# Initialize Firebase Admin SDK
cred = credentials.Certificate("path/to/your/serviceAccountKey.json")  # You'll need to add your service account key
firebase_admin.initialize_app(cred)
db = firestore.client()

def fetch_all_products():
    """Fetch all products from Firestore and create embeddings data"""
    products = []
    
    try:
        # Get all documents from products collection
        docs = db.collection('products').stream()
        
        for doc in docs:
            data = doc.to_dict()
            product_text = f"{data.get('name', '')} {data.get('description', '')} {data.get('category', '')}"
            products.append({
                "id": doc.id,
                "text": product_text.strip(),
                "name": data.get('name', ''),
                "category": data.get('category', ''),
                "description": data.get('description', '')
            })
        
        print(f"✅ Fetched {len(products)} products from Firestore!")
        
        # Save to JSON file for embedding generation
        with open('src/product_data.json', 'w', encoding='utf-8') as f:
            json.dump(products, f, indent=2, ensure_ascii=False)
        
        print(f"📁 Saved product data to src/product_data.json")
        
        # Show first few products as preview
        print("\n📋 First 10 products preview:")
        for i, product in enumerate(products[:10]):
            print(f"{i+1}. {product['name']} - {product['category']}")
        
        return products
        
    except Exception as e:
        print(f"❌ Error fetching products: {e}")
        return []

if __name__ == "__main__":
    print("🚀 Fetching all products from Firestore...")
    products = fetch_all_products()
    print(f"\n🎯 Total products ready for embedding: {len(products)}") 