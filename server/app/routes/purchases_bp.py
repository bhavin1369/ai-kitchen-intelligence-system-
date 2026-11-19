from datetime import datetime, date, timedelta, timezone
from flask import Blueprint, request, jsonify, Response
from app.extensions import db
from app.models import Purchase, PurchaseItem, Ingredient, InventoryBatch, StockMovement
from app.services.inventory_service import receive_batch
from app.services.purchase_service import (
    calculate_ingredient_requirements,
    generate_purchase_recommendations
)
from app.services.reports_service import export_purchases_csv
from app.utils.auth import roles_required
from app.utils.validators import safe_int, safe_float, safe_date

purchases_bp = Blueprint("purchases_bp", __name__)


@purchases_bp.route("/recommendations", methods=["GET"])
def get_recommendations_endpoint():
    """
    Computes intelligent purchase recommendations based on AI demand forecasts,
    BOM recipe explosion, and usable non-expired inventory stock:
    Purchase Qty = Max(0, Required Qty + Safety Stock - Usable Stock)
    """
    days = safe_int(request.args.get("days"), default=3, min_val=1, max_val=60)
    start_date_str = request.args.get("startDate") or request.args.get("start_date")
    start_d = safe_date(start_date_str)

    try:
        data = generate_purchase_recommendations(days_ahead=days, start_date=start_d)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Error calculating recommendations: {str(e)}"}), 500


@purchases_bp.route("/requirements", methods=["GET"])
def get_requirements_endpoint():
    """Calculates pure raw ingredient requirements across all forecasted dishes"""
    days = safe_int(request.args.get("days"), default=3, min_val=1, max_val=60)
    start_date_str = request.args.get("startDate") or request.args.get("start_date")
    start_d = safe_date(start_date_str)

    try:
        data = calculate_ingredient_requirements(days_ahead=days, start_date=start_d)
        return jsonify({"success": True, "data": data}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@purchases_bp.route("", methods=["GET"])
def get_purchases():
    """Retrieves purchase orders history with line items"""
    status = request.args.get("status")
    query = Purchase.query
    if status and status.lower() != "all":
        query = query.filter(Purchase.status.ilike(status))

    pos = query.order_by(Purchase.order_date.desc(), Purchase.id.desc()).all()
    return jsonify({
        "success": True,
        "total": len(pos),
        "data": [po.to_dict() for po in pos]
    }), 200


@purchases_bp.route("/<int:po_id>", methods=["GET"])
def get_purchase_detail(po_id):
    po = db.session.get(Purchase, po_id)
    if not po:
        return jsonify({"success": False, "message": "Purchase order not found."}), 404
    return jsonify({"success": True, "data": po.to_dict()}), 200


@purchases_bp.route("", methods=["POST"])
def create_purchase():
    """Creates a consolidated purchase order list (draft)"""
    data = request.get_json() or {}
    supplier = (data.get("supplierName") or data.get("supplier_name") or "Consolidated Suppliers").strip()
    items_data = data.get("items", [])
    lead_time = (data.get("leadTime") or data.get("lead_time") or "24 hours").strip()
    contact = (data.get("contact") or "").strip()
    notes = data.get("notes", "")

    if not items_data or not isinstance(items_data, list):
        return jsonify({"success": False, "message": "Purchase order must have at least one line item."}), 400

    # Ensure unique PO number
    user_po = data.get("poNumber")
    if user_po:
        po_number = str(user_po).strip()
        if Purchase.query.filter_by(po_number=po_number).first():
            return jsonify({"success": False, "message": f"PO number '{po_number}' already exists."}), 409
    else:
        max_id = db.session.query(db.func.max(Purchase.id)).scalar() or 0
        candidate_po = f"PO-{100 + max_id + 1}"
        while Purchase.query.filter_by(po_number=candidate_po).first():
            max_id += 1
            candidate_po = f"PO-{100 + max_id + 1}"
        po_number = candidate_po

    po = Purchase(
        po_number=po_number,
        supplier_name=supplier,
        contact=contact,
        lead_time=lead_time,
        order_date=date.today(),
        delivery_due_date=date.today() + timedelta(days=1),
        total_estimated_cost=0.0,
        status="draft",
        notes=notes
    )
    db.session.add(po)
    db.session.flush()

    total_cost = 0.0
    for it in items_data:
        ing_id = safe_int(it.get("ingredientId") or it.get("ingredient_id"))
        if not ing_id:
            db.session.rollback()
            return jsonify({"success": False, "message": "Valid ingredientId is required for each line item."}), 400

        ing = db.session.get(Ingredient, ing_id)
        if not ing:
            db.session.rollback()
            return jsonify({"success": False, "message": f"Ingredient with ID {ing_id} not found."}), 404

        rec_qty = safe_float(it.get("quantity") or it.get("recommendedPurchase") or it.get("recommended_quantity"), default=1.0, min_val=0.0)
        app_qty = safe_float(it.get("approvedQuantity") if "approvedQuantity" in it else it.get("quantity"), default=rec_qty, min_val=0.0)
        unit = (it.get("unit") or ing.unit or "kg").strip()
        unit_cost = safe_float(it.get("unitCost") or it.get("unit_cost"), default=ing.unit_cost, min_val=0.0)

        subtotal = round(app_qty * unit_cost, 2)
        total_cost += subtotal

        po_item = PurchaseItem(
            purchase_id=po.id,
            ingredient_id=ing.id,
            forecasted_demand=safe_float(it.get("requiredQuantity") or it.get("forecastedDemand"), default=0.0),
            current_stock=safe_float(it.get("usableStock") or it.get("currentStock"), default=ing.current_stock),
            recommended_quantity=rec_qty,
            approved_quantity=app_qty,
            unit=unit,
            unit_cost=unit_cost,
            subtotal=subtotal
        )
        db.session.add(po_item)

    po.total_estimated_cost = round(total_cost, 2)
    try:
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Purchase order {po.po_number} created with {len(items_data)} items.",
            "data": po.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to create purchase order: {str(e)}"}), 500


@purchases_bp.route("/<int:po_id>", methods=["PUT"])
@roles_required("admin", "manager")
def update_purchase(po_id):
    """Updates purchase status (draft, ordered, cancelled) or notes"""
    po = db.session.get(Purchase, po_id)
    if not po:
        return jsonify({"success": False, "message": "Purchase order not found."}), 404

    data = request.get_json() or {}
    if "status" in data:
        po.status = data["status"]
    if "notes" in data:
        po.notes = data["notes"]
    if "supplierName" in data or "supplier_name" in data:
        po.supplier_name = (data.get("supplierName") or data.get("supplier_name")).strip()

    try:
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Purchase order {po.po_number} updated.",
            "data": po.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to update purchase order: {str(e)}"}), 500


@purchases_bp.route("/<int:po_id>/receive", methods=["POST"])
@roles_required("admin", "manager")
def receive_purchase_order(po_id):
    """
    Receives all items from an approved/ordered PO directly into active FEFO inventory batches,
    updating current usable stock and logging stock movements atomically.
    """
    po = db.session.get(Purchase, po_id)
    if not po:
        return jsonify({"success": False, "message": "Purchase order not found."}), 404
    if po.status == "received":
        return jsonify({"success": False, "message": "This purchase order has already been received."}), 400

    received_batches = []
    today = date.today()

    try:
        for it in po.items:
            ing = it.ingredient
            if not ing:
                continue

            shelf_days = ing.shelf_life_days or 7
            exp_date = today + timedelta(days=shelf_days)
            batch_num = f"{ing.name[:3].upper()}-{today.strftime('%m%d')}-{it.id}"

            # If batch number exists, ensure uniqueness
            suffix = 1
            candidate_batch = batch_num
            while InventoryBatch.query.filter_by(ingredient_id=ing.id, batch_number=candidate_batch).first():
                candidate_batch = f"{batch_num}-{suffix}"
                suffix += 1

            batch = receive_batch(
                ingredient=ing,
                batch_number=candidate_batch,
                quantity=it.approved_quantity,
                unit=it.unit,
                unit_cost=it.unit_cost,
                received_date=today,
                expiry_date=exp_date,
                supplier_name=po.supplier_name,
                reference_id=po.po_number
            )
            received_batches.append(batch.batch_number)

        po.status = "received"
        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"PO {po.po_number} marked as received. Stock updated and {len(received_batches)} batches created.",
            "batchesReceived": received_batches,
            "data": po.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to receive PO: {str(e)}"}), 500


@purchases_bp.route("/<int:po_id>", methods=["DELETE"])
@roles_required("admin", "manager")
def delete_purchase(po_id):
    """Cancels/deletes a draft purchase order"""
    po = db.session.get(Purchase, po_id)
    if not po:
        return jsonify({"success": False, "message": "Purchase order not found."}), 404
    if po.status == "received":
        return jsonify({"success": False, "message": "Cannot delete an already received purchase order."}), 400

    po_num = po.po_number
    try:
        db.session.delete(po)
        db.session.commit()
        return jsonify({"success": True, "message": f"Purchase order {po_num} deleted."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to delete purchase order: {str(e)}"}), 500


@purchases_bp.route("/export/csv", methods=["GET"])
def export_purchases_csv_route():
    """Downloadable purchase orders CSV"""
    status = request.args.get("status")
    csv_data = export_purchases_csv(status=status)
    filename = f"purchases_orders_{date.today().strftime('%Y%m%d')}.csv"
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
