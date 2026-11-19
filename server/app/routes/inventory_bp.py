from datetime import datetime, date, timezone
from flask import Blueprint, request, jsonify, g, Response
from app.extensions import db
from app.models import Ingredient, InventoryBatch, StockMovement
from app.services.inventory_service import receive_batch, consume_ingredient_fefo, convert_quantity, normalize_unit
from app.services.reports_service import export_inventory_csv
from app.utils.auth import roles_required
from app.utils.validators import safe_int, safe_float, safe_date

inventory_bp = Blueprint("inventory_bp", __name__)

# ==================== INGREDIENTS ====================

@inventory_bp.route("/ingredients", methods=["GET"])
def get_ingredients():
    category = request.args.get("category")
    low_stock_only = request.args.get("low_stock", "").lower() in ("true", "1")
    search = request.args.get("search", "").strip()

    query = Ingredient.query
    if category and category.lower() != "all":
        query = query.filter(Ingredient.category.ilike(category))
    if search:
        query = query.filter(
            (Ingredient.name.ilike(f"%{search}%")) |
            (Ingredient.sku.ilike(f"%{search}%")) |
            (Ingredient.preferred_supplier.ilike(f"%{search}%"))
        )

    ingredients = query.order_by(Ingredient.name.asc()).all()
    if low_stock_only:
        ingredients = [i for i in ingredients if i.current_stock <= i.reorder_point]

    return jsonify({
        "success": True,
        "total": len(ingredients),
        "data": [i.to_dict(include_batches=False) for i in ingredients]
    }), 200


@inventory_bp.route("/ingredients/<int:ing_id>", methods=["GET"])
def get_ingredient_detail(ing_id):
    ingredient = db.session.get(Ingredient, ing_id)
    if not ingredient:
        return jsonify({"success": False, "message": "Ingredient not found."}), 404
    return jsonify({"success": True, "data": ingredient.to_dict(include_batches=True)}), 200


@inventory_bp.route("/ingredients", methods=["POST"])
def create_ingredient():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    category = (data.get("category") or "Produce").strip()
    raw_unit = (data.get("unit") or "kg").strip().lower()
    unit = normalize_unit(raw_unit)

    par_level = safe_float(data.get("parLevel") or data.get("par_level"), default=10.0, min_val=0.0)
    reorder_point = safe_float(data.get("reorderPoint") or data.get("reorder_point"), default=5.0, min_val=0.0)
    unit_cost = safe_float(data.get("unitCost") or data.get("unit_cost"), default=50.0, min_val=0.0)
    shelf_life = safe_int(data.get("shelfLifeDays") or data.get("shelf_life_days"), default=7, min_val=1)
    supplier = data.get("preferredSupplier") or data.get("preferred_supplier") or "General Market"

    if not name:
        return jsonify({"success": False, "message": "Ingredient name is required."}), 400
    if unit not in ("kg", "g", "l", "ml", "pcs", "dozen"):
        return jsonify({"success": False, "message": f"Unsupported unit '{raw_unit}'."}), 400

    # Ensure unique SKU
    user_sku = data.get("sku")
    if user_sku:
        sku = str(user_sku).strip()
        if Ingredient.query.filter_by(sku=sku).first():
            return jsonify({"success": False, "message": f"Ingredient SKU '{sku}' already exists."}), 409
    else:
        max_id = db.session.query(db.func.max(Ingredient.id)).scalar() or 0
        prefix = name[:3].upper() if len(name) >= 3 else (name.upper() + "X")[:3]
        candidate_sku = f"ING-{prefix}-{max_id + 1:02d}"
        while Ingredient.query.filter_by(sku=candidate_sku).first():
            max_id += 1
            candidate_sku = f"ING-{prefix}-{max_id + 1:02d}"
        sku = candidate_sku

    ingredient = Ingredient(
        sku=sku,
        name=name,
        category=category,
        unit=unit,
        current_stock=0.0,
        par_level=par_level,
        reorder_point=reorder_point,
        unit_cost=unit_cost,
        shelf_life_days=shelf_life,
        preferred_supplier=supplier
    )
    try:
        db.session.add(ingredient)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Ingredient '{name}' created successfully.",
            "data": ingredient.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to create ingredient: {str(e)}"}), 500


@inventory_bp.route("/ingredients/<int:ing_id>", methods=["PUT"])
def update_ingredient(ing_id):
    ingredient = db.session.get(Ingredient, ing_id)
    if not ingredient:
        return jsonify({"success": False, "message": "Ingredient not found."}), 404

    data = request.get_json() or {}
    if "name" in data:
        n_val = str(data["name"]).strip()
        if not n_val:
            return jsonify({"success": False, "message": "Ingredient name cannot be empty."}), 400
        ingredient.name = n_val
    if "category" in data:
        ingredient.category = str(data["category"]).strip()
    if "parLevel" in data or "par_level" in data:
        p_val = safe_float(data.get("parLevel") or data.get("par_level"), min_val=0.0)
        if p_val is not None:
            ingredient.par_level = p_val
    if "reorderPoint" in data or "reorder_point" in data:
        r_val = safe_float(data.get("reorderPoint") or data.get("reorder_point"), min_val=0.0)
        if r_val is not None:
            ingredient.reorder_point = r_val
    if "unitCost" in data or "unit_cost" in data:
        c_val = safe_float(data.get("unitCost") or data.get("unit_cost"), min_val=0.0)
        if c_val is not None:
            ingredient.unit_cost = c_val
    if "shelfLifeDays" in data or "shelf_life_days" in data:
        s_val = safe_int(data.get("shelfLifeDays") or data.get("shelf_life_days"), min_val=1)
        if s_val is not None:
            ingredient.shelf_life_days = s_val
    if "preferredSupplier" in data or "preferred_supplier" in data:
        ingredient.preferred_supplier = str(data.get("preferredSupplier") or data.get("preferred_supplier")).strip()

    try:
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Ingredient '{ingredient.name}' updated.",
            "data": ingredient.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to update ingredient: {str(e)}"}), 500


# ==================== BATCHES (FEFO TRACKING) ====================

@inventory_bp.route("/batches", methods=["GET"])
def get_batches():
    status = request.args.get("status") # active, depleted, expired
    urgency = request.args.get("urgency") # critical, warning, fresh
    ingredient_id_raw = request.args.get("ingredientId") or request.args.get("ingredient_id")

    query = InventoryBatch.query
    if status and status.lower() != "all":
        query = query.filter_by(status=status)
    if ingredient_id_raw:
        i_id = safe_int(ingredient_id_raw)
        if i_id:
            query = query.filter_by(ingredient_id=i_id)

    # Strict FEFO ordering by expiration date
    batches = query.order_by(InventoryBatch.expiry_date.asc(), InventoryBatch.id.asc()).all()

    if urgency:
        batches = [b for b in batches if b.shelf_life_status == urgency]

    return jsonify({
        "success": True,
        "total": len(batches),
        "data": [b.to_dict() for b in batches]
    }), 200


@inventory_bp.route("/batches", methods=["POST"])
def receive_new_batch():
    """Receive delivery batch into stock and create FEFO tracking record"""
    data = request.get_json() or {}
    ing_name_or_id = data.get("ingredientId") or data.get("ingredient_id") or data.get("ingredientName")
    batch_num = data.get("batchNumber") or data.get("batch_number")
    qty = safe_float(data.get("quantity") or data.get("initialQuantity"))
    unit = (data.get("unit") or "kg").strip()
    cost = safe_float(data.get("unitCost") or data.get("unit_cost"), default=0.0)
    expiry_str = data.get("expiryDate") or data.get("expiry_date")
    supplier = data.get("supplierName") or data.get("supplier_name")

    if not ing_name_or_id:
        return jsonify({"success": False, "message": "Ingredient identifier is required."}), 400
    if not batch_num or not str(batch_num).strip():
        return jsonify({"success": False, "message": "Batch number is required."}), 400
    if qty is None or qty <= 0:
        return jsonify({"success": False, "message": "Quantity must be positive."}), 400
    if cost is None or cost < 0:
        return jsonify({"success": False, "message": "Unit cost cannot be negative."}), 400
    if not expiry_str:
        return jsonify({"success": False, "message": "Expiry date is required."}), 400

    # Resolve ingredient
    if isinstance(ing_name_or_id, int) or (isinstance(ing_name_or_id, str) and str(ing_name_or_id).isdigit()):
        ingredient = db.session.get(Ingredient, int(ing_name_or_id))
    else:
        ingredient = Ingredient.query.filter(Ingredient.name.ilike(str(ing_name_or_id).strip())).first()

    if not ingredient:
        return jsonify({"success": False, "message": f"Ingredient '{ing_name_or_id}' not found."}), 404

    exp_date = safe_date(expiry_str)
    if not exp_date:
        return jsonify({"success": False, "message": "Invalid date format for expiryDate (use YYYY-MM-DD)."}), 400

    rec_date = date.today()
    if exp_date <= rec_date:
        return jsonify({"success": False, "message": "Expiry date must be in the future relative to received date."}), 400

    try:
        batch = receive_batch(
            ingredient=ingredient,
            batch_number=str(batch_num).strip(),
            quantity=qty,
            unit=unit,
            unit_cost=cost if cost > 0 else ingredient.unit_cost,
            received_date=rec_date,
            expiry_date=exp_date,
            supplier_name=supplier or ingredient.preferred_supplier
        )
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Batch {batch_num} received successfully. Stock updated.",
            "data": batch.to_dict()
        }), 201
    except ValueError as ve:
        db.session.rollback()
        return jsonify({"success": False, "message": str(ve)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to receive batch: {str(e)}"}), 500


# ==================== STOCK MOVEMENTS & ADJUSTMENTS ====================

@inventory_bp.route("/adjust", methods=["POST"])
def adjust_stock():
    """Manual inventory stock adjustment with audit trail"""
    data = request.get_json() or {}
    ing_id = safe_int(data.get("ingredientId") or data.get("ingredient_id"))
    new_stock = safe_float(data.get("newStock") if "newStock" in data else data.get("currentStock"))
    notes = data.get("notes", "Physical stock take adjustment")

    if not ing_id:
        return jsonify({"success": False, "message": "Ingredient ID is required."}), 400
    if new_stock is None or new_stock < 0:
        return jsonify({"success": False, "message": "Inventory cannot be negative."}), 400

    ingredient = db.session.get(Ingredient, ing_id)
    if not ingredient:
        return jsonify({"success": False, "message": "Ingredient not found."}), 404

    diff = round(new_stock - ingredient.current_stock, 4)
    ingredient.current_stock = new_stock

    movement = StockMovement(
        ingredient_id=ingredient.id,
        movement_type="manual_adjustment",
        quantity=diff,
        unit=ingredient.unit,
        unit_cost=ingredient.unit_cost,
        reference_type="audit",
        notes=notes,
        created_at=datetime.now(timezone.utc)
    )
    try:
        db.session.add(movement)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Stock for '{ingredient.name}' adjusted to {new_stock} {ingredient.unit}.",
            "data": ingredient.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to adjust stock: {str(e)}"}), 500


@inventory_bp.route("/consume", methods=["POST"])
def consume_stock_endpoint():
    """Consumes stock via FEFO prioritizing earlier expiry dates"""
    data = request.get_json() or {}
    ing_id = safe_int(data.get("ingredientId") or data.get("ingredient_id"))
    qty = safe_float(data.get("quantity"))
    reason = data.get("reason", "kitchen_prep")

    if not ing_id:
        return jsonify({"success": False, "message": "Ingredient ID is required."}), 400
    if qty is None or qty <= 0:
        return jsonify({"success": False, "message": "Quantity must be positive."}), 400

    from app.services.purchase_service import record_stock_consumption
    try:
        res = record_stock_consumption(
            ingredient_id=ing_id,
            quantity=qty,
            reason=reason
        )
        return jsonify(res), 200
    except ValueError as ve:
        return jsonify({"success": False, "message": str(ve)}), 400
    except Exception as e:
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500


@inventory_bp.route("/dashboard", methods=["GET"])
def get_inventory_dashboard():
    """Returns consolidated inventory health, valuation, and alerts"""
    today = date.today()
    ingredients = Ingredient.query.all()
    batches = InventoryBatch.query.filter_by(status="active").all()

    total_value = sum(i.current_stock * i.unit_cost for i in ingredients)
    low_stock = [i for i in ingredients if i.current_stock <= i.reorder_point]
    out_of_stock = [i for i in ingredients if i.current_stock <= 0.001]
    near_expiry_batches = [b for b in batches if b.expiry_date and 0 <= (b.expiry_date - today).days <= 2]
    expired_batches = [b for b in batches if b.expiry_date and b.expiry_date < today]

    return jsonify({
        "success": True,
        "totalIngredients": len(ingredients),
        "totalInventoryValue": round(total_value, 2),
        "lowStockCount": len(low_stock),
        "outOfStockCount": len(out_of_stock),
        "nearExpiryBatchesCount": len(near_expiry_batches),
        "expiredBatchesCount": len(expired_batches),
        "urgentAlerts": [
            {
                "id": i.id,
                "name": i.name,
                "type": "Out of Stock" if i.current_stock <= 0 else "Low Stock",
                "stock": i.current_stock,
                "unit": i.unit,
                "reorderPoint": i.reorder_point
            }
            for i in low_stock[:5]
        ]
    }), 200


@inventory_bp.route("/movements", methods=["GET"])
def get_movements():
    """Returns audit trail of inward/outward inventory movements"""
    limit = safe_int(request.args.get("limit"), default=50, min_val=1, max_val=500)
    ing_id_raw = request.args.get("ingredientId") or request.args.get("ingredient_id")
    movement_type = request.args.get("type") or request.args.get("movement_type")

    query = StockMovement.query
    if ing_id_raw:
        i_id = safe_int(ing_id_raw)
        if i_id:
            query = query.filter_by(ingredient_id=i_id)
    if movement_type and movement_type.lower() != "all":
        query = query.filter(StockMovement.movement_type.ilike(movement_type))

    movements = query.order_by(StockMovement.created_at.desc()).limit(limit).all()
    return jsonify({
        "success": True,
        "total": len(movements),
        "data": [m.to_dict() for m in movements]
    }), 200


@inventory_bp.route("/export/csv", methods=["GET"])
def export_inventory_csv_route():
    """Downloadable inventory stock levels CSV"""
    category = request.args.get("category")
    csv_data = export_inventory_csv(category=category)
    filename = f"inventory_levels_{date.today().strftime('%Y%m%d')}.csv"
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
