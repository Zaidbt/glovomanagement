#!/usr/bin/env python3
"""
Convert Glovo's GET catalog format to PUT bulk update format
"""
import json

def convert_catalog_format():
    """Convert retrieved catalog to push format"""

    # Load retrieved catalog
    with open('data/complete_catalog.json', 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    products_retrieved = catalog['products']

    print(f"📥 Retrieved format: {len(products_retrieved)} products")

    # Convert to push format
    products_push = []

    for product in products_retrieved:
        # Extract the French name (Morocco locale)
        name = product.get('translations', {}).get('fr_MA', product.get('title', ''))

        # Get first image if available
        images = product.get('images', [])
        image_url = images[0] if images else "https://i.imgur.com/Qj5MlEH.png"

        # Convert price from string to float
        price = float(product.get('price', '0'))

        # Convert to push format
        push_product = {
            "id": product.get('sku'),
            "name": name,
            "description": name,  # Using name as description
            "price": price,
            "image_url": image_url,
            "attributes_groups": [],
            "available": product.get('active', False)
        }

        products_push.append(push_product)

    # Create push format structure
    push_format = {
        "attributes": [],
        "attribute_groups": [],
        "products": products_push
    }

    # Save to file
    output_file = 'data/catalog_push_format.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(push_format, f, indent=2, ensure_ascii=False)

    print(f"✅ Converted to push format: {output_file}")
    print(f"📤 Push format: {len(products_push)} products")

    # Show comparison
    print(f"\n📊 Comparison:")
    print(f"  Products with real images: {sum(1 for p in products_push if 'deliveryhero.io' in p['image_url'])}")
    print(f"  Products with placeholder: {sum(1 for p in products_push if 'imgur.com' in p['image_url'])}")
    print(f"  Active products: {sum(1 for p in products_push if p['available'])}")
    print(f"  Inactive products: {sum(1 for p in products_push if not p['available'])}")

    # Show sample
    print(f"\n🔍 Sample product in push format:")
    print(json.dumps(products_push[0], indent=2, ensure_ascii=False))

    return push_format

if __name__ == "__main__":
    convert_catalog_format()
