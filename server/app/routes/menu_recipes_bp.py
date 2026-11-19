from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import MenuItem, Recipe, Ingredient
from app.utils.auth import roles_required
from app.utils.validators import safe_int, safe_float

menu_recipes_bp = Blueprint("menu_recipes_bp", __name__)

# ==================== MENU ITEM ROUTES ====================

@menu_recipes_bp.route("/menu", methods=["GET"])
def get_menu_items():
    category = request.args.get("category")
    diet = request.args.get("diet") # veg, nonveg
    status = request.args.get("status") # active, inactive
    search = request.args.get("search", "").strip()

    query = MenuItem.query

    if category and category.lower() != "all":
        query = query.filter(MenuItem.category.ilike(category))
    if diet and diet.lower() != "all":
        if diet.lower() == "veg":
            query = query.filter(MenuItem.is_veg == True)
        elif diet.lower() == "nonveg":
            query = query.filter(MenuItem.is_veg == False)
    if status and status.lower() != "all":
        if status.lower() == "active":
            query = query.filter(MenuItem.is_available == True)
        elif status.lower() == "inactive":
            query = query.filter(MenuItem.is_available == False)
    if search:
        query = query.filter(
            (MenuItem.name.ilike(f"%{search}%")) |
            (MenuItem.category.ilike(f"%{search}%"))
        )

    items = query.order_by(MenuItem.id.asc()).all()
    # Recalculate margins for response accuracy
    for it in items:
        it.calculate_cost_and_margin()

    return jsonify({
        "success": True,
        "total": len(items),
        "data": [item.to_dict(include_bom=False) for item in items]
    }), 200


@menu_recipes_bp.route("/menu/<int:item_id>", methods=["GET"])
def get_menu_item(item_id):
    item = db.session.get(MenuItem, item_id)
    if not item:
        return jsonify({"success": False, "message": "Menu item not found."}), 404
    item.calculate_cost_and_margin()
    return jsonify({"success": True, "data": item.to_dict(include_bom=True)}), 200


@menu_recipes_bp.route("/menu", methods=["POST"])
@roles_required("admin", "manager", "chef")
def create_menu_item():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    category = (data.get("category") or "Mains").strip()
    price = safe_float(data.get("price"))
    cost_price = safe_float(data.get("costPrice") or data.get("cost_price"), default=0.0)
    is_veg = bool(data.get("isVeg") if "isVeg" in data else data.get("is_veg", True))
    prep_time = safe_int(data.get("prepTimeMinutes") or data.get("prep_time_minutes"), default=15, min_val=1)
    description = data.get("description", "")
    is_available = bool(data.get("isAvailable") if "isAvailable" in data else True)

    if not name:
        return jsonify({"success": False, "message": "Dish name is required."}), 400
    if price is None or price <= 0:
        return jsonify({"success": False, "message": "Selling price must be strictly positive."}), 400
    if cost_price is None or cost_price < 0:
        return jsonify({"success": False, "message": "Cost price cannot be negative."}), 400

    item = MenuItem(
        name=name,
        category=category,
        price=price,
        cost_price=cost_price,
        is_veg=is_veg,
        is_available=is_available,
        prep_time_minutes=prep_time,
        description=description
    )
    if price > 0 and cost_price > 0:
        item.margin_percent = round(((price - cost_price) / price) * 100, 1)

    try:
        db.session.add(item)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Menu item '{name}' created successfully.",
            "data": item.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to create menu item: {str(e)}"}), 500


@menu_recipes_bp.route("/menu/<int:item_id>", methods=["PUT"])
@roles_required("admin", "manager", "chef")
def update_menu_item(item_id):
    item = db.session.get(MenuItem, item_id)
    if not item:
        return jsonify({"success": False, "message": "Menu item not found."}), 404

    data = request.get_json() or {}
    if "name" in data:
        name_val = str(data["name"]).strip()
        if not name_val:
            return jsonify({"success": False, "message": "Dish name cannot be empty."}), 400
        item.name = name_val
    if "category" in data:
        item.category = str(data["category"]).strip()
    if "price" in data:
        p_val = safe_float(data["price"])
        if p_val is None or p_val <= 0:
            return jsonify({"success": False, "message": "Selling price must be positive."}), 400
        item.price = p_val
    if "isAvailable" in data or "is_available" in data:
        item.is_available = bool(data.get("isAvailable") if "isAvailable" in data else data.get("is_available"))
    if "status" in data:
        item.is_available = (data["status"] == "active")
    if "isVeg" in data or "is_veg" in data:
        item.is_veg = bool(data.get("isVeg") if "isVeg" in data else data.get("is_veg"))
    if "prepTimeMinutes" in data or "prep_time_minutes" in data:
        pt_val = safe_int(data.get("prepTimeMinutes") or data.get("prep_time_minutes"), min_val=1)
        if pt_val:
            item.prep_time_minutes = pt_val
    if "description" in data:
        item.description = data["description"]

    item.calculate_cost_and_margin()
    try:
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Menu item '{item.name}' updated successfully.",
            "data": item.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to update menu item: {str(e)}"}), 500


@menu_recipes_bp.route("/menu/<int:item_id>", methods=["DELETE"])
@roles_required("admin", "manager")
def delete_menu_item(item_id):
    item = db.session.get(MenuItem, item_id)
    if not item:
        return jsonify({"success": False, "message": "Menu item not found."}), 404

    # Remove BOM recipes cascade
    Recipe.query.filter_by(menu_item_id=item.id).delete()
    dish_name = item.name
    try:
        db.session.delete(item)
        db.session.commit()
        return jsonify({"success": True, "message": f"Menu item '{dish_name}' deleted successfully."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to delete menu item: {str(e)}"}), 500


# ==================== RECIPE (BOM) ROUTES ====================

@menu_recipes_bp.route("/recipes", methods=["GET"])
def get_recipes():
    menu_item_id_raw = request.args.get("menuItemId") or request.args.get("menu_item_id")
    query = Recipe.query
    if menu_item_id_raw:
        m_id = safe_int(menu_item_id_raw)
        if m_id:
            query = query.filter_by(menu_item_id=m_id)

    recipes = query.all()
    return jsonify({
        "success": True,
        "total": len(recipes),
        "data": [r.to_dict() for r in recipes]
    }), 200


@menu_recipes_bp.route("/recipes/<int:menu_item_id>", methods=["GET"])
def get_recipe_by_dish(menu_item_id):
    menu_item = db.session.get(MenuItem, menu_item_id)
    if not menu_item:
        return jsonify({"success": False, "message": "Menu dish not found."}), 404

    recipes = Recipe.query.filter_by(menu_item_id=menu_item_id).all()
    menu_item.calculate_cost_and_margin()
    db.session.commit()

    return jsonify({
        "success": True,
        "dish": menu_item.to_dict(),
        "ingredients": [r.to_dict() for r in recipes]
    }), 200


@menu_recipes_bp.route("/recipes", methods=["POST"])
@roles_required("admin", "manager", "chef")
def add_ingredient_to_recipe():
    data = request.get_json() or {}
    menu_item_id = safe_int(data.get("menuItemId") or data.get("menu_item_id"))
    ingredient_id = safe_int(data.get("ingredientId") or data.get("ingredient_id"))
    qty = safe_float(data.get("quantity"))
    unit = (data.get("unit") or "kg").strip()
    prep_loss = safe_float(data.get("prepLossPercentage") or data.get("prep_loss_percentage"), default=0.0)

    if not menu_item_id or not ingredient_id:
        return jsonify({"success": False, "message": "Both menuItemId and ingredientId are required."}), 400
    if qty is None or qty <= 0:
        return jsonify({"success": False, "message": "Ingredient portion quantity must be positive."}), 400
    if prep_loss is None or prep_loss < 0:
        return jsonify({"success": False, "message": "Prep loss percentage cannot be negative."}), 400

    menu_item = db.session.get(MenuItem, menu_item_id)
    ingredient = db.session.get(Ingredient, ingredient_id)
    if not menu_item:
        return jsonify({"success": False, "message": "Menu item not found."}), 404
    if not ingredient:
        return jsonify({"success": False, "message": "Ingredient not found."}), 404

    # Check if relation already exists
    existing = Recipe.query.filter_by(menu_item_id=menu_item.id, ingredient_id=ingredient.id).first()
    if existing:
        existing.quantity = qty
        existing.unit = unit
        existing.prep_loss_percentage = prep_loss
        recipe = existing
    else:
        recipe = Recipe(
            menu_item_id=menu_item.id,
            ingredient_id=ingredient.id,
            quantity=qty,
            unit=unit,
            prep_loss_percentage=prep_loss
        )
        db.session.add(recipe)

    try:
        db.session.flush()
        menu_item.calculate_cost_and_margin()
        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Added '{ingredient.name}' to recipe formula for '{menu_item.name}'.",
            "data": recipe.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to save recipe: {str(e)}"}), 500


@menu_recipes_bp.route("/recipes/<int:recipe_id>", methods=["PUT"])
@roles_required("admin", "manager", "chef")
def update_recipe_ingredient(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return jsonify({"success": False, "message": "Recipe entry not found."}), 404

    data = request.get_json() or {}
    if "quantity" in data:
        q_val = safe_float(data["quantity"])
        if q_val is None or q_val <= 0:
            return jsonify({"success": False, "message": "Quantity must be positive."}), 400
        recipe.quantity = q_val
    if "unit" in data:
        recipe.unit = str(data["unit"]).strip()
    if "prepLossPercentage" in data or "prep_loss_percentage" in data:
        loss_val = safe_float(data.get("prepLossPercentage") or data.get("prep_loss_percentage"), min_val=0.0)
        if loss_val is not None:
            recipe.prep_loss_percentage = loss_val

    menu_item = recipe.menu_item
    try:
        db.session.flush()
        if menu_item:
            menu_item.calculate_cost_and_margin()
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Recipe ingredient updated successfully.",
            "data": recipe.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to update recipe: {str(e)}"}), 500


@menu_recipes_bp.route("/recipes/batch", methods=["POST"])
@roles_required("admin", "manager", "chef")
def set_dish_recipes_batch():
    """Allows setting or updating multiple ingredients for a dish BOM at once"""
    data = request.get_json() or {}
    menu_item_id = safe_int(data.get("menuItemId") or data.get("menu_item_id"))
    ingredients_list = data.get("ingredients", [])

    if not menu_item_id:
        return jsonify({"success": False, "message": "menuItemId is required."}), 400

    menu_item = db.session.get(MenuItem, menu_item_id)
    if not menu_item:
        return jsonify({"success": False, "message": "Menu item not found."}), 404

    # Validate all ingredients before clearing
    valid_recipes = []
    for it in ingredients_list:
        ing_id = safe_int(it.get("ingredientId") or it.get("ingredient_id"))
        q = safe_float(it.get("quantity"))
        u = (it.get("unit") or "kg").strip()
        loss = safe_float(it.get("prepLossPercentage") or it.get("prep_loss_percentage"), default=0.0)

        if not ing_id or q is None or q <= 0:
            continue

        ing = db.session.get(Ingredient, ing_id)
        if ing:
            valid_recipes.append((ing_id, q, u, loss))

    # Clear existing recipe ingredients
    Recipe.query.filter_by(menu_item_id=menu_item.id).delete()

    created_recipes = []
    for item_tuple in valid_recipes:
        rec = Recipe(
            menu_item_id=menu_item.id,
            ingredient_id=item_tuple[0],
            quantity=item_tuple[1],
            unit=item_tuple[2],
            prep_loss_percentage=item_tuple[3]
        )
        db.session.add(rec)
        created_recipes.append(rec)

    try:
        db.session.flush()
        menu_item.calculate_cost_and_margin()
        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Recipe formula for '{menu_item.name}' updated with {len(created_recipes)} ingredients.",
            "dish": menu_item.to_dict(),
            "ingredients": [r.to_dict() for r in created_recipes]
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to batch update recipes: {str(e)}"}), 500


@menu_recipes_bp.route("/recipes/<int:recipe_id>", methods=["DELETE"])
@roles_required("admin", "manager", "chef")
def delete_recipe(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return jsonify({"success": False, "message": "Recipe entry not found."}), 404

    menu_item = recipe.menu_item
    try:
        db.session.delete(recipe)
        db.session.flush()
        if menu_item:
            menu_item.calculate_cost_and_margin()
        db.session.commit()

        return jsonify({"success": True, "message": "Ingredient removed from recipe."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Failed to remove ingredient from recipe: {str(e)}"}), 500
