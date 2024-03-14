import { InventoryItemDTO, InventoryLevelDTO } from "@medusajs/types"

export const defaultAdminInventoryItemRelations = []
export const allowedAdminInventoryItemRelations = []

export const defaultAdminLocationLevelFields: (
  | keyof InventoryLevelDTO
  | "available_quantity"
)[] = [
  "id",
  "inventory_item_id",
  "location_id",
  "stocked_quantity",
  "reserved_quantity",
  "incoming_quantity",
  "available_quantity",
  "metadata",
  "created_at",
  "updated_at",
]

export const defaultAdminInventoryItemFields = [
  "id",
  "sku",
  "title",
  "description",
  "thumbnail",
  "origin_country",
  "hs_code",
  "requires_shipping",
  "mid_code",
  "material",
  "weight",
  "length",
  "height",
  "width",
  "metadata",
  "created_at",
  "updated_at",
  ...defaultAdminLocationLevelFields.map(
    (field) => `location_levels.${field.toString()}`
  ),
]

export const retrieveTransformQueryConfig = {
  defaultFields: defaultAdminInventoryItemFields,
  defaultRelations: defaultAdminInventoryItemRelations,
  allowedRelations: allowedAdminInventoryItemRelations,
  isList: false,
}

export const listTransformQueryConfig = {
  ...retrieveTransformQueryConfig,
  isList: true,
}