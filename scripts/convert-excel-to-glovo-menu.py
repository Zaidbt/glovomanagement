#!/usr/bin/env python3
"""
Convert Natura Beldi Excel export to Glovo menu JSON format
"""
import pandas as pd
import json
from collections import defaultdict

def convert_excel_to_glovo_menu(excel_path, output_path):
    """Convert Excel to Glovo menu JSON format"""

    print(f"📥 Reading Excel file: {excel_path}")
    df = pd.read_excel(excel_path)

    print(f"✅ Loaded {len(df)} products")
    print(f"Columns: {list(df.columns)}")

    # Group products by category
    category_products = defaultdict(list)
    products_list = []

    for idx, row in df.iterrows():
        sku = str(row['sku'])
        name = str(row['name'])
        price = float(row['price'])
        category = str(row['category 1']) if pd.notna(row['category 1']) else 'Autres'
        image_url = str(row['images']) if pd.notna(row['images']) else None

        # Create product object
        product = {
            "id": sku,
            "name": name,
            "description": name,  # Using name as description
            "price": price,
            "image_url": image_url,
            "attributes_groups": [],
            "available": True  # All products active by default
        }

        products_list.append(product)
        category_products[category].append(sku)

    print(f"\n📊 Statistics:")
    print(f"  Total products: {len(products_list)}")
    print(f"  Total categories: {len(category_products)}")

    # Create collections (categories)
    collections = []
    for position, (category_name, product_ids) in enumerate(sorted(category_products.items())):
        collection = {
            "name": category_name,
            "position": position,
            "image_url": "https://images.deliveryhero.io/image/global-catalog-glovo/nv-global-catalog/aa/default-category.png",
            "sections": [
                {
                    "name": category_name,
                    "position": 0,
                    "products": product_ids
                }
            ]
        }
        collections.append(collection)
        print(f"  {category_name}: {len(product_ids)} products")

    # Create final menu object
    menu = {
        "attributes": [],
        "attribute_groups": [],
        "collections": collections,
        "products": products_list
    }

    # Write to JSON file
    print(f"\n💾 Writing to: {output_path}")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(menu, f, ensure_ascii=False, indent=2)

    print(f"✅ Menu JSON created successfully!")
    print(f"\n📦 Summary:")
    print(f"  Products: {len(products_list)}")
    print(f"  Collections: {len(collections)}")
    print(f"  Output: {output_path}")

    return menu

if __name__ == "__main__":
    excel_file = "data/Natura beldi export.xlsx"
    output_file = "public/glovo-menu-store-01.json"

    menu = convert_excel_to_glovo_menu(excel_file, output_file)

    print(f"\n🚀 Next steps:")
    print(f"1. Deploy the JSON file to your server")
    print(f"2. Upload to Glovo using:")
    print(f"   curl -X POST https://stageapi.glovoapp.com/webhook/stores/store-01/menu \\")
    print(f"     -H 'Authorization: 8b979af6-8e38-4bdb-aa07-26408928052a' \\")
    print(f"     -H 'Content-Type: application/json' \\")
    print(f"     -d '{{\"menuUrl\": \"https://natura.bixlor.com/glovo-menu-store-01.json\"}}'")
