#!/usr/bin/env python3
"""
Convert catalog to Glovo v2 API PUT format
The v2 API uses: {"products": [{"sku", "name", "price", "image_url", "active"}]}
"""
import json

def convert_to_v2_format():
    """Convert to v2 API format"""

    # Load the push format catalog
    with open('data/catalog_push_format.json', 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    products_push = catalog['products']

    print(f"📥 Converting {len(products_push)} products to v2 format")

    # Convert to v2 format
    v2_products = []

    for product in products_push:
        # v2 API format
        v2_product = {
            "sku": product.get('id'),
            "name": product.get('name'),
            "price": str(product.get('price')),  # v2 API expects string
            "image_url": product.get('image_url'),
            "active": product.get('available', False)
        }

        v2_products.append(v2_product)

    # Create v2 format structure
    v2_format = {
        "products": v2_products
    }

    # Save to file
    output_file = 'data/catalog_v2_format.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(v2_format, f, indent=2, ensure_ascii=False)

    print(f"✅ Converted to v2 format: {output_file}")
    print(f"📤 Total products: {len(v2_products)}")

    # Show stats
    print(f"\n📊 Statistics:")
    print(f"  Active products: {sum(1 for p in v2_products if p['active'])}")
    print(f"  Inactive products: {sum(1 for p in v2_products if not p['active'])}")
    print(f"  Products with images: {sum(1 for p in v2_products if p.get('image_url'))}")

    # Show sample
    print(f"\n🔍 Sample product in v2 format:")
    print(json.dumps(v2_products[0], indent=2, ensure_ascii=False))

    return v2_format

if __name__ == "__main__":
    convert_to_v2_format()
