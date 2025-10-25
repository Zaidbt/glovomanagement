#!/usr/bin/env python3
"""
Merge all Glovo catalog pages into a single JSON file
"""
import json
import glob
import os

def merge_catalog_pages():
    """Merge all catalog page JSON files into one comprehensive catalog"""

    data_dir = "data"
    all_products = []

    # Get all catalog page files
    page_files = sorted(glob.glob(f"{data_dir}/catalog_page_*.json"))

    print(f"📄 Found {len(page_files)} catalog page files")

    # Merge all products from all pages
    for page_file in page_files:
        with open(page_file, 'r', encoding='utf-8') as f:
            page_data = json.load(f)
            products = page_data.get('products', [])
            all_products.extend(products)
            print(f"  ✓ {os.path.basename(page_file)}: {len(products)} products")

    # Load categories
    with open(f"{data_dir}/categories.json", 'r', encoding='utf-8') as f:
        categories_data = json.load(f)
        categories = categories_data.get('categories', [])

    # Create comprehensive catalog
    comprehensive_catalog = {
        "total_products": len(all_products),
        "total_categories": len(categories),
        "categories": categories,
        "products": all_products
    }

    # Save merged catalog
    output_file = f"{data_dir}/complete_catalog.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(comprehensive_catalog, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Merged catalog saved to: {output_file}")
    print(f"📊 Total products: {len(all_products)}")
    print(f"📁 Total categories: {len(categories)}")

    # Print sample products with images
    print(f"\n🖼️  Sample products with images:")
    for i, product in enumerate(all_products[:5]):
        images = product.get('images', [])
        image_status = f"✅ {len(images)} image(s)" if images else "❌ No images"
        print(f"  {i+1}. {product.get('title')} - {product.get('price')} MAD - {image_status}")
        if images:
            print(f"     Image: {images[0][:80]}...")

    # Count products with/without images
    with_images = sum(1 for p in all_products if p.get('images'))
    without_images = len(all_products) - with_images

    print(f"\n📈 Image Statistics:")
    print(f"  Products with images: {with_images} ({with_images/len(all_products)*100:.1f}%)")
    print(f"  Products without images: {without_images} ({without_images/len(all_products)*100:.1f}%)")

    # Count active vs inactive
    active_products = sum(1 for p in all_products if p.get('active'))
    inactive_products = len(all_products) - active_products

    print(f"\n🔄 Product Status:")
    print(f"  Active products: {active_products}")
    print(f"  Inactive products: {inactive_products}")

if __name__ == "__main__":
    merge_catalog_pages()
