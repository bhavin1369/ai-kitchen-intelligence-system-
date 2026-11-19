from datetime import datetime, date
from flask import Blueprint, request, jsonify, Response
from app.extensions import db
from app.models import WasteRecord, Ingredient, MenuItem, InventoryBatch
from app.utils.auth import roles_required
from app.utils.validators import safe_int, safe_float, safe_date
from app.services.waste_service import (
    record_waste_entry,
    get_waste_analytics,
    get_expiry_alerts,
    get_waste_risk_analysis,
    get_leftover_recipe_suggestions,
    export_waste_records_csv
)

waste_bp = Blueprint("waste_bp", __name__)


@waste_bp.route("", methods=["POST"])
def record_waste():
    """
    Records a food waste event for either raw ingredients or prepared dishes.
    Deducts stock via FEFO for raw ingredients and calculates financial loss.
    """
    data = request.get_json() or {}
    item_type_raw = data.get("itemType") or data.get("item_type", "ingredient")
    if str(item_type_raw).lower() in ("dish", "prepared", "prepared_item", "prepared_food"):
        item_type = "prepared_item"
    else:
        item_type = "ingredient"

    ing_id = safe_int(data.get("ingredientId") or data.get("ingredient_id") or (data.get("itemId") if item_type == "ingredient" else None))
    menu_id = safe_int(data.get("menuItemId") or data.get("menu_item_id") or (data.get("itemId") if item_type == "prepared_item" else None))
    item_name = data.get("itemName") or data.get("item_name")
    qty = safe_float(data.get("quantity") if "quantity" in data else data.get("quantityLost"))
    unit = (data.get("unit") or "kg").strip()
    reason = (data.get("reason") or "Spoilage").strip()
    batch_id = safe_int(data.get("batchId") or data.get("batch_id"))
    logged_by = (data.get("loggedBy") or data.get("logged_by") or "Head Chef").strip()
    notes = data.get("notes", "")

    if qty is None or qty <= 0:
        return jsonify({"success": False, "message": "Waste quantity must be strictly greater than zero."}), 400

    if item_type == "ingredient" and not ing_id:
        return jsonify({"success": False, "message": "Ingredient ID is required for raw ingredient waste."}), 400
    if item_type == "prepared_item" and not menu_id:
        return jsonify({"success": False, "message": "Menu item ID is required for prepared food waste."}), 400

    date_str = data.get("date") or data.get("loggedAt") or data.get("logged_at")
    log_d = safe_date(date_str)

    try:
        res = record_waste_entry(
            item_type=item_type,
            ingredient_id=ing_id,
            menu_item_id=menu_id,
            item_name=item_name,
            quantity=qty,
            unit=unit,
            reason=reason,
            batch_id=batch_id,
            log_date=log_d,
            logged_by=logged_by,
            notes=notes
        )
        return jsonify(res), 201
    except ValueError as ve:
        db.session.rollback()
        return jsonify({"success": False, "message": str(ve)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to record waste: {str(e)}"}), 500


@waste_bp.route("", methods=["GET"])
def get_waste_records():
    """Retrieves waste records with filters"""
    reason = request.args.get("reason")
    item_type = request.args.get("itemType") or request.args.get("item_type")
    search = request.args.get("search", "").strip()
    limit = safe_int(request.args.get("limit"), default=100, min_val=1, max_val=1000)

    query = WasteRecord.query
    if reason and reason.lower() != "all":
        query = query.filter(WasteRecord.reason.ilike(reason))
    if item_type and item_type.lower() != "all":
        query = query.filter(WasteRecord.item_type.ilike(item_type))
    if search:
        query = query.filter(
            (WasteRecord.item_name.ilike(f"%{search}%")) |
            (WasteRecord.log_number.ilike(f"%{search}%")) |
            (WasteRecord.logged_by.ilike(f"%{search}%")) |
            (WasteRecord.notes.ilike(f"%{search}%"))
        )

    records = query.order_by(WasteRecord.logged_at.desc()).limit(limit).all()
    return jsonify({
        "success": True,
        "total": len(records),
        "data": [r.to_dict() for r in records]
    }), 200


@waste_bp.route("/<int:waste_id>", methods=["GET"])
def get_waste_detail(waste_id):
    record = db.session.get(WasteRecord, waste_id)
    if not record:
        return jsonify({"success": False, "message": "Waste record not found."}), 404
    return jsonify({"success": True, "data": record.to_dict()}), 200


@waste_bp.route("/<int:waste_id>", methods=["PUT"])
def update_waste_record(waste_id):
    record = db.session.get(WasteRecord, waste_id)
    if not record:
        return jsonify({"success": False, "message": "Waste record not found."}), 404

    data = request.get_json() or {}
    if "reason" in data:
        record.reason = str(data["reason"]).strip()
    if "notes" in data:
        record.notes = data["notes"]
    if "loggedBy" in data or "logged_by" in data:
        record.logged_by = str(data.get("loggedBy") or data.get("logged_by")).strip()

    try:
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Waste record {record.log_number} updated.",
            "data": record.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to update waste record: {str(e)}"}), 500


@waste_bp.route("/<int:waste_id>", methods=["DELETE"])
@roles_required("admin", "manager")
def delete_waste_record(waste_id):
    record = db.session.get(WasteRecord, waste_id)
    if not record:
        return jsonify({"success": False, "message": "Waste record not found."}), 404

    log_num = record.log_number
    try:
        db.session.delete(record)
        db.session.commit()
        return jsonify({"success": True, "message": f"Waste record {log_num} deleted."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to delete waste record: {str(e)}"}), 500


@waste_bp.route("/summary", methods=["GET"])
def get_waste_summary_endpoint():
    """Returns aggregated loss by reason category and total physical volume"""
    days = safe_int(request.args.get("days"), default=30, min_val=1, max_val=365)
    try:
        data = get_waste_analytics(days=days)
        return jsonify({
            "success": True,
            "data": {
                "totalFinancialLoss": data["totalFinancialLoss"],
                "totalQuantityLost": data["totalQuantityLost"],
                "wasteToSalesRatio": data["wasteToSalesRatio"],
                "reasonBreakdown": data["reasonBreakdown"]
            }
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Failed to compute waste summary: {str(e)}"}), 500


@waste_bp.route("/analytics", methods=["GET"])
def get_waste_analytics_endpoint():
    """Returns in-depth waste analytics: daily trends, monthly history, top wasted SKUs"""
    days = safe_int(request.args.get("days"), default=30, min_val=1, max_val=365)
    try:
        data = get_waste_analytics(days=days)
        return jsonify({"success": True, "data": data}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Failed to compute waste analytics: {str(e)}"}), 500


@waste_bp.route("/expiry-alerts", methods=["GET"])
def get_expiry_alerts_endpoint():
    """Returns list of active inventory batches expired or expiring within 3 days"""
    try:
        data = get_expiry_alerts()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Failed to fetch expiry alerts: {str(e)}"}), 500


@waste_bp.route("/risk-analysis", methods=["GET"])
def get_risk_analysis_endpoint():
    """Cross-references inventory shelf-life against ML demand forecast to flag high-risk surplus"""
    horizon = safe_int(request.args.get("horizon") or request.args.get("days"), default=5, min_val=1, max_val=30)
    try:
        data = get_waste_risk_analysis(horizon_days=horizon)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Failed to calculate risk analysis: {str(e)}"}), 500


@waste_bp.route("/leftovers/suggestions", methods=["GET"])
def get_leftover_suggestions_endpoint():
    """Returns AI-driven culinary suggestions to upcycle expiring or surplus ingredients"""
    try:
        data = get_leftover_recipe_suggestions()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Failed to generate leftover suggestions: {str(e)}"}), 500


@waste_bp.route("/export/csv", methods=["GET"])
def export_waste_csv_route():
    """Downloadable waste logs CSV"""
    reason = request.args.get("reason")
    item_type = request.args.get("itemType") or request.args.get("item_type")
    search = request.args.get("search")
    csv_data = export_waste_records_csv(reason=reason, item_type=item_type, search=search)
    filename = f"food_waste_report_{date.today().strftime('%Y%m%d')}.csv"
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
