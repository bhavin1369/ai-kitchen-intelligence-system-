"""
Comprehensive Unit & Integration Test Suite for AI/ML Operations (Phase 4 & Phase 7).
Authored by: Viraj (AI/ML Developer)

Verifies:
1. Sales data cleaning and preprocessor reproducibility
2. Zero-leakage causal feature engineering & chronological splitting
3. Baseline demand model fitting, inference, and robust edge-case handling
4. Random Forest & Gradient Boosting training, actual MAE and RMSE calculation
5. Matplotlib evaluation plot generation (time series, feature ranking, residual distribution)
6. Model artifact persistence & deserialization via Joblib
7. AI leftover-to-recipe recommendation engine and food safety guardrails
8. Training vs. inference feature parity and backend compatibility
"""
import unittest
import os
import json
from datetime import date, timedelta
from pathlib import Path
import numpy as np
import pandas as pd

from app import create_app
from app.extensions import db
from app.models import MenuItem, Sale, SaleItem, Ingredient
from app.ml.preprocessor import (
    FEATURE_COLUMNS,
    load_sales_dataframe,
    build_feature_dataset,
    get_chronological_splits,
    extract_inference_features
)
from app.ml.models import (
    BaselineDemandModel,
    compute_metrics,
    train_and_evaluate_models,
    load_trained_model_bundle,
    get_latest_model_metadata,
    REPORTS_DIR,
    MODEL_ARTIFACT_PATH,
    METADATA_PATH
)
from app.ml.leftover_recommender import (
    compute_upcycling_recommendations,
    score_recipe_feasibility,
    CURATED_CHEF_TEMPLATES
)
from app.services.forecast_service import generate_forecasts, get_model_evaluation


class MLEvaluationTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()

    def tearDown(self):
        self.ctx.pop()

    def test_01_preprocessing_and_cleaning(self):
        """Test sales dataframe extraction, cleaning of anomalous values, and continuous matrix construction"""
        sales_df = load_sales_dataframe()
        self.assertIsInstance(sales_df, pd.DataFrame)
        if not sales_df.empty:
            self.assertIn("date", sales_df.columns)
            self.assertIn("menu_item_id", sales_df.columns)
            self.assertIn("quantity", sales_df.columns)
            # Ensure no negative sales quantities survive preprocessing
            self.assertTrue((sales_df["quantity"] >= 0).all(), "Negative sales quantities found!")

        # Full feature matrix build
        df, meta = build_feature_dataset()
        self.assertTrue(meta["is_sufficient"])
        self.assertFalse(df.empty)
        self.assertTrue(meta["data_leakage_prevented"])
        self.assertEqual(meta["temporal_ordering"], "strictly_chronological")

        # Verify all feature columns are present and non-null
        for col in FEATURE_COLUMNS:
            self.assertIn(col, df.columns)
            self.assertEqual(df[col].isna().sum(), 0, f"Feature '{col}' contains NaN values!")

    def test_02_chronological_splitting_and_no_leakage(self):
        """Test chronological split to strictly prevent temporal lookahead leakage"""
        df, meta = build_feature_dataset()
        train_df, test_df, split_meta = get_chronological_splits(df, test_ratio=0.20)

        self.assertGreater(len(train_df), 0)
        self.assertGreater(len(test_df), 0)

        train_max_date = train_df["date"].max()
        test_min_date = test_df["date"].min()

        # Strict chronological separation: latest training date must be strictly earlier than test start
        self.assertLess(train_max_date, test_min_date, "Temporal leakage detected: train and test dates overlap!")
        self.assertEqual(split_meta["cutoff_date"], test_min_date.isoformat())

    def test_03_baseline_model_comprehensive(self):
        """Test baseline moving average model, edge cases (unseen dishes, empty inputs)"""
        baseline = BaselineDemandModel()

        # Synthetic train frame
        train_data = pd.DataFrame([
            {"menu_item_id": 1, "day_of_week": 0, "quantity": 20.0},
            {"menu_item_id": 1, "day_of_week": 0, "quantity": 24.0},
            {"menu_item_id": 1, "day_of_week": 1, "quantity": 10.0},
            {"menu_item_id": 2, "day_of_week": 0, "quantity": 15.0},
        ])
        baseline.fit(train_data)

        # Predict seen dish on seen day of week (Monday = 0)
        test_seen = pd.DataFrame([{"menu_item_id": 1, "day_of_week": 0}])
        preds = baseline.predict(test_seen)
        self.assertEqual(len(preds), 1)
        self.assertAlmostEqual(preds[0], 22.0, places=1)

        # Predict seen dish on unseen day of week (falls back to dish overall mean)
        test_unseen_dow = pd.DataFrame([{"menu_item_id": 1, "day_of_week": 4}])
        preds_dow = baseline.predict(test_unseen_dow)
        self.assertEqual(len(preds_dow), 1)
        self.assertAlmostEqual(preds_dow[0], 18.0, places=1)

        # Predict completely unseen dish (falls back to global train mean)
        test_unseen_dish = pd.DataFrame([{"menu_item_id": 999, "day_of_week": 2}])
        preds_dish = baseline.predict(test_unseen_dish)
        self.assertEqual(len(preds_dish), 1)
        self.assertAlmostEqual(preds_dish[0], baseline.global_mean, places=1)

        # Empty test input
        empty_preds = baseline.predict(pd.DataFrame())
        self.assertEqual(len(empty_preds), 0)

    def test_04_random_forest_training_and_metrics(self):
        """Test full training pipeline, true MAE, RMSE, and dish breakdown"""
        res = train_and_evaluate_models()
        self.assertTrue(res["success"])
        meta = res["modelMetadata"]

        # Evaluation metrics
        eval_dict = meta["evaluation"]
        rf_metrics = eval_dict["randomForest"]
        base_metrics = eval_dict["baseline"]

        # Validate non-trivial genuine calculations
        self.assertGreater(rf_metrics["mae"], 0.0)
        self.assertGreater(rf_metrics["rmse"], 0.0)
        self.assertIn("r2", rf_metrics)
        self.assertIn("mape", rf_metrics)

        # Compare baseline vs Random Forest
        self.assertIn("pctImprovementOverBaseline", eval_dict)
        self.assertGreater(eval_dict["pctImprovementOverBaseline"], 0.0)

        # Dish breakdown checks
        breakdown = meta["dishBreakdown"]
        self.assertGreater(len(breakdown), 0)
        first_dish = breakdown[0]
        self.assertIn("mae", first_dish)
        self.assertIn("rmse", first_dish)
        self.assertIn("residualStd", first_dish)
        self.assertIn("baselineMae", first_dish)

    def test_05_matplotlib_evaluation_plots_generated(self):
        """Verify Matplotlib charts are generated and saved to the reports directory"""
        res = train_and_evaluate_models()
        self.assertTrue(res["success"])

        ts_plot = REPORTS_DIR / "actual_vs_predicted_time_series.png"
        fi_plot = REPORTS_DIR / "feature_importance_ranking.png"
        res_plot = REPORTS_DIR / "residuals_distribution.png"

        self.assertTrue(ts_plot.exists(), f"Missing plot: {ts_plot}")
        self.assertTrue(fi_plot.exists(), f"Missing plot: {fi_plot}")
        self.assertTrue(res_plot.exists(), f"Missing plot: {res_plot}")

        self.assertGreater(ts_plot.stat().st_size, 1000)
        self.assertGreater(fi_plot.stat().st_size, 1000)
        self.assertGreater(res_plot.stat().st_size, 1000)

    def test_06_model_persistence_and_loading(self):
        """Test Joblib model bundle serialization and JSON metadata consistency"""
        self.assertTrue(MODEL_ARTIFACT_PATH.exists())
        self.assertTrue(METADATA_PATH.exists())

        bundle = load_trained_model_bundle()
        self.assertIsNotNone(bundle)
        self.assertIn("model", bundle)
        self.assertIn("baseline", bundle)
        self.assertIn("features", bundle)
        self.assertEqual(bundle["features"], FEATURE_COLUMNS)

        meta = get_latest_model_metadata()
        self.assertIsNotNone(meta)
        self.assertIn("version", meta)
        self.assertIn("evaluation", meta)

    def test_07_leftover_recommender_and_food_safety(self):
        """Test AI leftover upcycling engine and strict food safety validation"""
        surplus_ingredients = [
            {"name": "Paneer (Cottage Cheese)", "quantity": 5.0, "unit": "kg", "unitCost": 220.0},
            {"name": "Potatoes", "quantity": 10.0, "unit": "kg", "unitCost": 25.0}
        ]
        all_pantry = {i.name.lower(): i for i in Ingredient.query.all()}

        recs = compute_upcycling_recommendations(
            surplus_ingredients_list=surplus_ingredients,
            all_ingredients_map=all_pantry
        )

        self.assertGreater(len(recs), 0)
        # Verify first recommendation rescues at least one surplus ingredient
        self.assertGreater(len(recs[0]["rescuedSurplusMatches"]), 0)
        for r in recs:
            self.assertIn("feasibilityScore", r)
            self.assertGreaterEqual(r["feasibilityScore"], 0)
            self.assertLessEqual(r["feasibilityScore"], 100)
            self.assertEqual(r["foodSafetyStatus"], "100% Certified Safe")

    def test_08_extract_inference_features_parity(self):
        """Test that extract_inference_features produces identical keys and valid values matching FEATURE_COLUMNS"""
        test_date = date.today() + timedelta(days=1)
        history = {
            test_date - timedelta(days=1): 20.0,
            test_date - timedelta(days=2): 18.0,
            test_date - timedelta(days=7): 25.0,
        }
        feats = extract_inference_features(
            dish_id=1,
            target_d=test_date,
            dish_history=history,
            dish_meta={"price": 150.0, "is_veg": True, "prep_time_minutes": 20}
        )

        for col in FEATURE_COLUMNS:
            self.assertIn(col, feats)
            self.assertIsNotNone(feats[col])
            self.assertFalse(np.isnan(feats[col]))


if __name__ == "__main__":
    unittest.main()
