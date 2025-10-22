# 📊 Excel to Glovo Menu Converter Guide

## ✅ What We Just Created

A Python script that converts your Excel product file (with 492 products!) into Glovo menu JSON format.

## 📋 Your Excel File Format

Your file (`oulfa.xlsx`) has these columns:
- `sku` → Product ID (used as Glovo product ID)
- `name` → Product name
- `price` → Product price
- `active` → Product availability (true/false)
- `category 1` → Main category
- `category 2` → Secondary category (optional)

**Stats from your file:**
- **492 total products**
- **403 active products**
- **89 inactive products**
- **47 categories**

---

## 🚀 How to Upload Your 492 Products to Glovo

### Step 1: Deploy to VPS

```bash
# On your VPS
cd /path/to/natura-beldi
git pull origin main
pm2 restart natura-beldi
```

### Step 2: Verify the menu JSON is accessible

```bash
curl https://natura.bixlor.com/natura-beldi-menu.json | head -50
```

Should show your products in JSON format.

### Step 3: Upload to Glovo

```bash
curl -X POST https://natura.bixlor.com/api/glovo/menu/upload \
  -H "Content-Type: application/json" \
  -d '{"menuUrl": "https://natura.bixlor.com/natura-beldi-menu.json"}'
```

**Expected response:**
```json
{
  "success": true,
  "transaction_id": "xxx-xxx-xxx",
  "message": "Menu upload initiated...",
  "menuUrl": "https://natura.bixlor.com/natura-beldi-menu.json"
}
```

### Step 4: Check upload status (wait 10-30 seconds)

```bash
curl "https://natura.bixlor.com/api/glovo/menu/upload?transactionId=YOUR_TRANSACTION_ID"
```

**Success response:**
```json
{
  "success": true,
  "status": "SUCCESS",
  "transaction_id": "xxx",
  "details": ["Menu uploaded successfully"]
}
```

### Step 5: Verify on Glovo

Go to: https://testglovo.com/es/en/barcelona/natura-beldi-ma-test/

You should now see:
- ✅ All 492 products organized by category
- ✅ 47 categories
- ✅ Proper names and prices
- ✅ Only active products are available

---

## 🔄 How to Update Products in the Future

### Option A: Update Excel and Re-convert

If you update your Excel file:

```bash
# On your local machine
cd /path/to/natura-beldi
python scripts/convert-excel-to-glovo-menu.py ../oulfa.xlsx public/natura-beldi-menu.json
git add public/natura-beldi-menu.json
git commit -m "Update product menu"
git push

# Then on VPS
git pull
pm2 restart natura-beldi

# Upload to Glovo (WARNING: counts against your 5 per day limit!)
curl -X POST https://natura.bixlor.com/api/glovo/menu/upload \
  -H "Content-Type: application/json" \
  -d '{"menuUrl": "https://natura.bixlor.com/natura-beldi-menu.json"}'
```

### Option B: Bulk Updates for Small Changes (RECOMMENDED)

For updating prices or availability of specific products:

```bash
# Update single product price
curl -X POST https://natura.bixlor.com/api/glovo/menu/update-price \
  -H "Content-Type: application/json" \
  -d '{"productId": "0d65ab45-529d-4707-97a8-8d959b6d509b", "price": 20.00}'

# Update availability
curl -X POST https://natura.bixlor.com/api/glovo/menu/update-availability \
  -H "Content-Type: application/json" \
  -d '{"productId": "0d65ab45-529d-4707-97a8-8d959b6d509b", "available": true}'

# Bulk update multiple products
curl -X POST https://natura.bixlor.com/api/glovo/menu/bulk-update \
  -H "Content-Type: application/json" \
  -d '{
    "products": [
      {"id": "0d65ab45-529d-4707-97a8-8d959b6d509b", "price": 20.00, "available": true},
      {"id": "27fa7c8d-a040-49c6-b7b1-a0c249c7f74e", "price": 150.00}
    ],
    "waitForCompletion": true
  }'
```

---

## 📝 Important Notes

### ⚠️ Glovo Limits
- **Full menu upload**: Maximum 5 times per day
- **Bulk updates**: No daily limit (use this for daily operations)

### 💡 Best Practices

1. **Initial setup**: Use full menu upload (what we just did)
2. **Daily updates**: Use bulk updates for price/availability changes
3. **Major restructure**: Use full menu upload (but watch the 5/day limit)

### 🔍 Product IDs

Your products use UUID format (e.g., `0d65ab45-529d-4707-97a8-8d959b6d509b`).

These are from the `sku` column in your Excel file.

### 📊 Categories

Your 47 categories are automatically organized into Glovo collections:
- A tartiner
- Abats
- Agneau
- Agrumes
- Apéritifs salés
- Baies et petits fruits
- Boeuf et Veau
- Boissons Chaudes
- Boulangerie
- ... (and 38 more)

Each category becomes a section in the Glovo menu.

---

## 🛠️ Running the Converter Locally

If you get a new Excel file with updated products:

```bash
cd /path/to/natura-beldi

# Convert Excel to JSON
python scripts/convert-excel-to-glovo-menu.py \
  /path/to/your/products.xlsx \
  public/natura-beldi-menu.json

# Commit and deploy
git add public/natura-beldi-menu.json
git commit -m "Update product catalog"
git push

# On VPS: pull and upload to Glovo
```

---

## 📦 What the Converter Does

1. **Reads Excel** - Extracts sku, name, price, active, categories
2. **Creates products** - Converts each row to Glovo product format
3. **Organizes categories** - Creates collections from category columns
4. **Generates JSON** - Outputs valid Glovo menu JSON format
5. **Saves file** - Ready to upload to Glovo

---

## 🎯 Next Steps

1. **Deploy to VPS** (git pull)
2. **Upload your 492 products to Glovo**
3. **Verify on testglovo.com**
4. **For future updates**: Use bulk updates instead of full menu upload

---

## 🆘 Troubleshooting

### "FETCH_MENU_SERVER_ERROR: 404"
- The JSON file isn't accessible at the URL
- Make sure you deployed and restarted the app
- Verify: `curl https://natura.bixlor.com/natura-beldi-menu.json`

### "Too many menu updates" (429 error)
- You hit the 5 per day limit
- Wait until tomorrow
- Or use bulk updates instead

### Products not showing
- Check if `active` is true in Excel
- Only active products are available in Glovo
- Inactive products are uploaded but marked unavailable

---

## 📚 Related Documentation

- **GLOVO_PARTNERS_API.md** - Full API documentation
- **DEPLOYMENT_CHECKLIST.md** - Deployment guide
- **QUICK_START_GLOVO_TEST.md** - Quick testing guide

---

## ✨ Summary

You now have:
- ✅ 492 products converted to Glovo format
- ✅ 47 categories organized
- ✅ JSON file ready to upload
- ✅ Script to re-run when Excel updates
- ✅ API endpoints for daily product management

Deploy and upload! 🚀
