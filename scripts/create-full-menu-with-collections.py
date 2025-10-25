#!/usr/bin/env python3
"""
Create complete menu with collections (categories) for Glovo Partners API
"""
import json

def create_full_menu():
    """Create menu with products and collections"""

    # Load catalog
    with open('data/complete_catalog.json', 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    products_retrieved = catalog['products']
    categories_retrieved = catalog['categories']

    print(f"📥 Processing {len(products_retrieved)} products and {len(categories_retrieved)} categories")

    # Check for duplicate SKUs
    skus = [p.get('sku') for p in products_retrieved]
    unique_skus = set(skus)
    if len(skus) != len(unique_skus):
        print(f"⚠️  Found duplicate SKUs! {len(skus)} total, {len(unique_skus)} unique")
        # Find duplicates
        from collections import Counter
        sku_counts = Counter(skus)
        duplicates = [sku for sku, count in sku_counts.items() if count > 1]
        print(f"   Duplicates: {duplicates[:5]}...")
        # Remove duplicates, keeping first occurrence
        seen = set()
        products_unique = []
        for p in products_retrieved:
            sku = p.get('sku')
            if sku not in seen:
                seen.add(sku)
                products_unique.append(p)
        products_retrieved = products_unique
        print(f"✅ Removed duplicates, now {len(products_retrieved)} unique products")

    # Convert categories to collections format (Glovo Partners API format)
    collections = []
    category_map = {}  # Map global_id to collection info

    for idx, category in enumerate(categories_retrieved):
        category_global_id = category.get('global_id')
        category_name = category.get('details', {}).get('name', {}).get('fr_MA', f'Category {idx+1}')
        category_image = category.get('image_url', 'https://i.imgur.com/Qj5MlEH.png')

        collection = {
            "name": category_name,
            "position": idx,
            "image_url": category_image,
            "sections": [
                {
                    "name": category_name,
                    "position": 0,
                    "products": []
                }
            ]
        }

        collections.append(collection)
        category_map[category_global_id] = idx  # Store index to find collection later

    print(f"📁 Created {len(collections)} collections")

    # Convert products and assign to collections
    products_push = []

    for product in products_retrieved:
        name = product.get('translations', {}).get('fr_MA', product.get('title', ''))
        images = product.get('images', [])
        image_url = images[0] if images else "https://i.imgur.com/Qj5MlEH.png"
        price = float(product.get('price', '0'))

        push_product = {
            "id": product.get('sku'),
            "name": name,
            "description": name,
            "price": price,
            "image_url": image_url,
            "attributes_groups": [],
            "available": product.get('active', False)
        }

        products_push.append(push_product)

        # Add product to its categories' collections
        product_categories = product.get('categories', [])
        for cat in product_categories:
            cat_global_id = cat.get('global_id')
            if cat_global_id in category_map:
                collection_idx = category_map[cat_global_id]
                # Add product id to the section's products list
                collections[collection_idx]['sections'][0]['products'].append(product.get('sku'))

    # Create complete menu format
    complete_menu = {
        "attributes": [],
        "attribute_groups": [],
        "collections": collections,
        "products": products_push
    }

    # Save to file
    output_file = 'public/natura-beldi-menu-with-images.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(complete_menu, f, indent=2, ensure_ascii=False)

    print(f"✅ Complete menu saved to: {output_file}")
    print(f"\n📊 Statistics:")
    print(f"  Total products: {len(products_push)}")
    print(f"  Total collections: {len(collections)}")
    print(f"  Active products: {sum(1 for p in products_push if p['available'])}")
    print(f"  Products with images: {sum(1 for p in products_push if 'deliveryhero.io' in p['image_url'])}")

    # Show collection stats
    non_empty = [c for c in collections if len(c['sections'][0]['products']) > 0]
    print(f"  Non-empty collections: {len(non_empty)}")
    print(f"\n🔍 Top 5 collections by product count:")
    sorted_collections = sorted(collections, key=lambda x: len(x['sections'][0]['products']), reverse=True)
    for i, coll in enumerate(sorted_collections[:5]):
        print(f"    {i+1}. {coll['name']}: {len(coll['sections'][0]['products'])} products")

if __name__ == "__main__":
    create_full_menu()
