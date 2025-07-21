from sentence_transformers import SentenceTransformer
import json

# Load your product data here (replace with your real data source)
products = [
    {"id": "1", "text": "Nike Air Max 270 running shoes"},
    {"id": "2", "text": "Apple iPhone 15 Pro smartphone"},
    {"id": "3", "text": "Aiwibi Baby Diaper Small 52Pcs"},
    # Add more products as needed
]

model = SentenceTransformer('all-MiniLM-L6-v2')

for p in products:
    p['embedding'] = model.encode(p['text']).tolist()

with open('product_embeddings.json', 'w') as f:
    json.dump(products, f)

print("Embeddings generated and saved to product_embeddings.json") 