import { DAL } from "@medusajs/types"
import {
  DALUtils,
  createPsqlIndexStatementHelper,
  generateEntityId,
} from "@medusajs/utils"
import {
  BeforeCreate,
  Entity,
  Filter,
  ManyToOne,
  OnInit,
  OptionalProps,
  PrimaryKey,
  Property,
} from "@mikro-orm/core"
import PriceSet from "./price-set"
import PriceSetMoneyAmount from "./price-set-money-amount"
import RuleType from "./rule-type"

type OptionalFields = DAL.SoftDeletableEntityDateColumns

const tableName = "price_rule"
const PriceRuleDeletedAtIndex = createPsqlIndexStatementHelper({
  tableName: tableName,
  columns: "deleted_at",
  where: "deleted_at IS NOT NULL",
})

const PriceRulePriceSetIdIndex = createPsqlIndexStatementHelper({
  tableName: tableName,
  columns: "price_set_id",
  where: "deleted_at IS NULL",
})

const PriceRuleRuleTypeIdIndex = createPsqlIndexStatementHelper({
  tableName: tableName,
  columns: "rule_type_id",
  where: "deleted_at IS NULL",
})

const PriceRulePriceSetMoneyAmountIdIndex = createPsqlIndexStatementHelper({
  tableName: tableName,
  columns: "price_set_money_amount_id",
  where: "deleted_at IS NULL",
  unique: true,
})

@Entity({ tableName })
@Filter(DALUtils.mikroOrmSoftDeletableFilterOptions)
export default class PriceRule {
  [OptionalProps]?: OptionalFields

  @PrimaryKey({ columnType: "text" })
  id!: string

  @PriceRulePriceSetIdIndex.MikroORMIndex()
  @ManyToOne({
    entity: () => PriceSet,
    fieldName: "price_set_id",
    onDelete: "cascade",
  })
  price_set: PriceSet

  @PriceRuleRuleTypeIdIndex.MikroORMIndex()
  @ManyToOne({ entity: () => RuleType })
  rule_type: RuleType

  @Property({ columnType: "text" })
  value: string

  @Property({ columnType: "integer", default: 0 })
  priority: number = 0

  @PriceRulePriceSetMoneyAmountIdIndex.MikroORMIndex()
  @ManyToOne({
    onDelete: "cascade",
    entity: () => PriceSetMoneyAmount,
  })
  price_set_money_amount: PriceSetMoneyAmount

  @Property({
    onCreate: () => new Date(),
    columnType: "timestamptz",
    defaultRaw: "now()",
  })
  created_at: Date

  @Property({
    onCreate: () => new Date(),
    onUpdate: () => new Date(),
    columnType: "timestamptz",
    defaultRaw: "now()",
  })
  updated_at: Date

  @PriceRuleDeletedAtIndex.MikroORMIndex()
  @Property({ columnType: "timestamptz", nullable: true })
  deleted_at: Date | null = null

  @BeforeCreate()
  beforeCreate() {
    this.id = generateEntityId(this.id, "prule")
  }

  @OnInit()
  onInit() {
    this.id = generateEntityId(this.id, "prule")
  }
}
