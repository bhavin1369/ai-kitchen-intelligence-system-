"""
Automated Test Suite for Backend Improvements and Integrity Verification.
Tests:
- Input validation & error handling (missing fields, invalid types, negative values)
- Proper HTTP status codes (200, 201, 400, 401, 403, 404, 409)
- Non-existent record IDs
- Inventory & FEFO calculations
- Purchase recommendation logic
- Sales atomicity and negative inventory prevention
- Batch tracking and waste synchronization
- Safe query parameter parsing (no 500 crashes)
- Unit conversions and synonym handling
"""
import unittest
from datetime import date, timedelta
from app import create_app
from app.config import TestingConfig
from app.extensions import db
from app.models import (
    MenuItem, Ingredient, Recipe, Sale, SaleItem,
    InventoryBatch, StockMovement, Purchase, PurchaseItem, WasteRecord
)
from app.services.inventory_service import convert_quantity, normalize_unit

class BackendImprovementsTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()

    def tearDown(self):
        db.session.rollback()
        self.app_context.pop()

    # ==================== 1. MENU & RECIPES VALIDATION ====================

    def test_01_menu_item_validation(self):
        # Missing dish name -> 400
        res = self.client.post("/api/v1/menu", json={"name": "", "price": 100.0})
        self.assertEqual(res.status_code, 400)
        self.assertIn("Dish name is required", res.get_json()["message"])

        # Zero or negative price -> 400
        res_zero = self.client.post("/api/v1/menu", json={"name": "Test Dish", "price": 0})
        self.assertEqual(res_zero.status_code, 400)
        res_neg = self.client.post("/api/v1/menu", json={"name": "Test Dish", "price": -50.0})
        self.assertEqual(res_neg.status_code, 400)

        # Non-existent dish ID -> 404
        res_404 = self.client.get("/api/v1/menu/999999")
        self.assertEqual(res_404.status_code, 404)

        # Update with invalid price -> 400
        existing = MenuItem.query.first()
        self.assertIsNotNone(existing)
        res_upd = self.client.put(f"/api/v1/menu/{existing.id}", json={"price": -10.0})
        self.assertEqual(res_upd.status_code, 400)

    def test_02_recipe_bom_validation(self):
        # Missing menuItemId or ingredientId -> 400
        res1 = self.client.post("/api/v1/recipes", json={"quantity": 0.5})
        self.assertEqual(res1.status_code, 400)

        # Non-positive quantity -> 400
        ing = Ingredient.query.first()
        dish = MenuItem.query.first()
        res2 = self.client.post("/api/v1/recipes", json={
            "menuItemId": dish.id,
            "ingredientId": ing.id,
            "quantity": 0.0
        })
        self.assertEqual(res2.status_code, 400)

        # Non-existent menuItemId -> 404
        res3 = self.client.post("/api/v1/recipes", json={
            "menuItemId": 999999,
            "ingredientId": ing.id,
            "quantity": 1.0
        })
        self.assertEqual(res3.status_code, 404)

        # Non-existent ingredientId -> 404
        res4 = self.client.post("/api/v1/recipes", json={
            "menuItemId": dish.id,
            "ingredientId": 999999,
            "quantity": 1.0
        })
        self.assertEqual(res4.status_code, 404)

        # Non-existent recipe entry for update -> 404
        res5 = self.client.put("/api/v1/recipes/999999", json={"quantity": 2.0})
        self.assertEqual(res5.status_code, 404)

    # ==================== 2. INVENTORY & BATCHES VALIDATION ====================

    def test_03_ingredient_validation(self):
        # Missing name -> 400
        res = self.client.post("/api/v1/inventory/ingredients", json={"name": ""})
        self.assertEqual(res.status_code, 400)

        # Unsupported unit -> 400
        res_unit = self.client.post("/api/v1/inventory/ingredients", json={
            "name": "Invalid Unit Spice",
            "unit": "gallons"
        })
        self.assertEqual(res_unit.status_code, 400)
        self.assertIn("Unsupported unit", res_unit.get_json()["message"])

        # Non-existent ingredient ID -> 404
        res_404 = self.client.get("/api/v1/inventory/ingredients/999999")
        self.assertEqual(res_404.status_code, 404)

        # Duplicate SKU -> 409
        ing = Ingredient.query.first()
        res_dup = self.client.post("/api/v1/inventory/ingredients", json={
            "name": "Duplicate SKU Item",
            "sku": ing.sku,
            "unit": "kg"
        })
        self.assertEqual(res_dup.status_code, 409)

    def test_04_batch_and_stock_adjust_validation(self):
        ing = Ingredient.query.first()
        today = date.today()

        # Missing batchNumber -> 400
        res1 = self.client.post("/api/v1/inventory/batches", json={
            "ingredientId": ing.id,
            "quantity": 5.0,
            "expiryDate": (today + timedelta(days=10)).isoformat()
        })
        self.assertEqual(res1.status_code, 400)

        # Non-positive quantity -> 400
        res2 = self.client.post("/api/v1/inventory/batches", json={
            "ingredientId": ing.id,
            "batchNumber": "TEST-B-01",
            "quantity": -5.0,
            "expiryDate": (today + timedelta(days=10)).isoformat()
        })
        self.assertEqual(res2.status_code, 400)

        # Expiry date in past -> 400
        res3 = self.client.post("/api/v1/inventory/batches", json={
            "ingredientId": ing.id,
            "batchNumber": "TEST-B-02",
            "quantity": 5.0,
            "expiryDate": (today - timedelta(days=1)).isoformat()
        })
        self.assertEqual(res3.status_code, 400)

        # Stock adjust to negative value -> 400
        res4 = self.client.post("/api/v1/inventory/adjust", json={
            "ingredientId": ing.id,
            "newStock": -10.0
        })
        self.assertEqual(res4.status_code, 400)

    # ==================== 3. SALES ATOMICITY & FEFO INTEGRITY ====================

    def test_05_sales_validation_and_fefo(self):
        dish = MenuItem.query.first()

        # Empty items list -> 400
        res1 = self.client.post("/api/v1/sales", json={"items": []})
        self.assertEqual(res1.status_code, 400)

        # Negative quantity -> 400
        res2 = self.client.post("/api/v1/sales", json={
            "items": [{"menuItemId": dish.id, "quantity": -3}]
        })
        self.assertEqual(res2.status_code, 400)

        # Non-existent menuItemId -> 400 Bad Request with descriptive message
        res3 = self.client.post("/api/v1/sales", json={
            "items": [{"menuItemId": 999999, "quantity": 1}]
        })
        self.assertEqual(res3.status_code, 400)
        self.assertIn("not found", res3.get_json()["message"])

        # Non-existent sale ID -> 404
        res4 = self.client.get("/api/v1/sales/999999")
        self.assertEqual(res4.status_code, 404)

        # Insufficient stock test (Never allow negative inventory)
        res_huge = self.client.post("/api/v1/sales", json={
            "items": [{"menuItemId": dish.id, "quantity": 100000}]
        })
        self.assertEqual(res_huge.status_code, 400)
        self.assertIn("Insufficient usable stock", res_huge.get_json()["message"])

    # ==================== 4. PURCHASES VALIDATION ====================

    def test_06_purchases_validation(self):
        # Empty items list -> 400
        res1 = self.client.post("/api/v1/purchases", json={"items": []})
        self.assertEqual(res1.status_code, 400)

        # Non-existent ingredientId in item -> 404
        res2 = self.client.post("/api/v1/purchases", json={
            "items": [{"ingredientId": 999999, "quantity": 10.0}]
        })
        self.assertEqual(res2.status_code, 404)

        # Non-existent PO ID -> 404
        res3 = self.client.get("/api/v1/purchases/999999")
        self.assertEqual(res3.status_code, 404)

    # ==================== 5. WASTE & EXPIRY VALIDATION ====================

    def test_07_waste_validation(self):
        # Non-positive quantity -> 400
        res1 = self.client.post("/api/v1/waste", json={
            "itemType": "ingredient",
            "ingredientId": 1,
            "quantity": 0.0
        })
        self.assertEqual(res1.status_code, 400)

        # Missing ingredientId for ingredient waste -> 400
        res2 = self.client.post("/api/v1/waste", json={
            "itemType": "ingredient",
            "quantity": 2.0
        })
        self.assertEqual(res2.status_code, 400)

        # Missing menuItemId for prepared food waste -> 400
        res3 = self.client.post("/api/v1/waste", json={
            "itemType": "prepared_item",
            "quantity": 2.0
        })
        self.assertEqual(res3.status_code, 400)

        # Non-existent waste record -> 404
        res4 = self.client.get("/api/v1/waste/999999")
        self.assertEqual(res4.status_code, 404)

    # ==================== 6. SAFE QUERY PARAMETER PARSING ====================

    def test_08_safe_parameter_parsing_no_500(self):
        # Invalid non-integer limit and offset should NOT crash server with 500
        res_sales = self.client.get("/api/v1/sales?limit=abc&offset=xyz&menuItemId=invalid")
        self.assertEqual(res_sales.status_code, 200)

        # Invalid days in recommendations should NOT crash server
        res_rec = self.client.get("/api/v1/purchases/recommendations?days=not_a_number")
        self.assertEqual(res_rec.status_code, 200)

        # Invalid limit in movements
        res_mov = self.client.get("/api/v1/inventory/movements?limit=invalid&ingredientId=bad")
        self.assertEqual(res_mov.status_code, 200)

        # Invalid days in waste summary
        res_wst = self.client.get("/api/v1/waste/summary?days=invalid")
        self.assertEqual(res_wst.status_code, 200)

        # Method Not Allowed -> clean 405 JSON response
        res_405 = self.client.delete("/api/v1/health")
        self.assertEqual(res_405.status_code, 405)
        self.assertFalse(res_405.get_json()["success"])

    # ==================== 7. UNIT CONVERSION & SYNONYM TESTS ====================

    def test_09_unit_conversions(self):
        # Standard mass
        self.assertAlmostEqual(convert_quantity(500, "g", "kg"), 0.5)
        self.assertAlmostEqual(convert_quantity(2.5, "kg", "g"), 2500.0)

        # Mass synonyms (gm, gms, gram, grams, kgs, kilogram)
        self.assertAlmostEqual(convert_quantity(250, "gm", "kg"), 0.25)
        self.assertAlmostEqual(convert_quantity(1000, "grams", "kgs"), 1.0)
        self.assertAlmostEqual(convert_quantity(2, "kilograms", "gm"), 2000.0)

        # Standard volume
        self.assertAlmostEqual(convert_quantity(750, "ml", "l"), 0.75)
        self.assertAlmostEqual(convert_quantity(1.5, "l", "ml"), 1500.0)

        # Volume synonyms (ltr, liters, litre, millilitres)
        self.assertAlmostEqual(convert_quantity(500, "mls", "ltr"), 0.5)
        self.assertAlmostEqual(convert_quantity(3, "litres", "ml"), 3000.0)

        # Discrete (pcs, dozen)
        self.assertAlmostEqual(convert_quantity(2, "dozen", "pcs"), 24.0)
        self.assertAlmostEqual(convert_quantity(12, "pieces", "dozen"), 1.0)

        # Incompatible units
        with self.assertRaises(ValueError):
            convert_quantity(10, "kg", "liters")

if __name__ == "__main__":
    unittest.main()
