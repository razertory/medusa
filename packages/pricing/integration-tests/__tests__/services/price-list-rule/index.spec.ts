import { SqlEntityManager } from "@mikro-orm/postgresql"

import { PriceListRuleRepository } from "@repositories"
import { PriceListRuleService } from "@services"

import { MikroOrmWrapper } from "../../../utils"
import { createPriceLists } from "../../../__fixtures__/price-list"
import { createRuleTypes } from "../../../__fixtures__/rule-type"
import { createPriceListRules } from "../../../__fixtures__/price-list-rules"

jest.setTimeout(30000)

describe("PriceListRule Service", () => {
  let service: PriceListRuleService
  let testManager: SqlEntityManager
  let repositoryManager: SqlEntityManager

  beforeEach(async () => {
    await MikroOrmWrapper.setupDatabase()
    repositoryManager = await MikroOrmWrapper.forkManager()

    const priceListRuleRepository = new PriceListRuleRepository({
      manager: repositoryManager,
    })

    service = new PriceListRuleService({
      priceListRuleRepository,
    })

    testManager = await MikroOrmWrapper.forkManager()
    await createRuleTypes(testManager)
    await createPriceLists(testManager)
    await createPriceListRules(testManager)
  })

  afterEach(async () => {
    await MikroOrmWrapper.clearDatabase()
  })

  describe("list", () => {
    it("list priceListRules", async () => {
      const priceListRuleResult = await service.list()

      expect(priceListRuleResult).toEqual([
        expect.objectContaining({
          id: "price-list-rule-1",
        }),
        expect.objectContaining({
          id: "price-list-rule-2",
        }),
      ])
    })

    it("list priceListRules by pricelist id", async () => {
      const priceListRuleResult = await service.list({
        id: ["price-list-rule-1"],
      })

      expect(priceListRuleResult).toEqual([
        expect.objectContaining({
          id: "price-list-rule-1",
        }),
      ])
    })
  })

  describe("listAndCount", () => {
    it("should return pricelistrules and count", async () => {
      const [priceListRuleResult, count] = await service.listAndCount()

      expect(count).toEqual(2)
      expect(priceListRuleResult).toEqual([
        expect.objectContaining({
          id: "price-list-rule-1",
        }),
        expect.objectContaining({
          id: "price-list-rule-2",
        }),
      ])
    })

    it("should return pricelistrules and count when filtered", async () => {
      const [priceListRuleResult, count] = await service.listAndCount({
        id: ["price-list-rule-1"],
      })

      expect(count).toEqual(1)
      expect(priceListRuleResult).toEqual([
        expect.objectContaining({
          id: "price-list-rule-1",
        }),
      ])
    })

    it("should return pricelistrules and count when using skip and take", async () => {
      const [priceListRuleResult, count] = await service.listAndCount(
        {},
        { skip: 1, take: 1 }
      )

      expect(count).toEqual(2)
      expect(priceListRuleResult).toEqual([
        expect.objectContaining({
          id: "price-list-rule-2",
        }),
      ])
    })

    it("should return requested fields", async () => {
      const [priceListRuleResult, count] = await service.listAndCount(
        {},
        {
          take: 1,
          select: ["id"],
        }
      )

      const serialized = JSON.parse(JSON.stringify(priceListRuleResult))

      expect(count).toEqual(2)
      expect(serialized).toEqual([
        {
          id: "price-list-rule-1",
        },
      ])
    })
  })

  describe("retrieve", () => {
    const id = "price-list-rule-1"

    it("should return priceList for the given id", async () => {
      const priceListRuleResult = await service.retrieve(id)

      expect(priceListRuleResult).toEqual(
        expect.objectContaining({
          id,
        })
      )
    })

    it("should throw an error when priceListRule with id does not exist", async () => {
      let error

      try {
        await service.retrieve("does-not-exist")
      } catch (e) {
        error = e
      }

      expect(error.message).toEqual(
        "PriceListRule with id: does-not-exist was not found"
      )
    })

    it("should throw an error when a id is not provided", async () => {
      let error

      try {
        await service.retrieve(undefined as unknown as string)
      } catch (e) {
        error = e
      }

      expect(error.message).toEqual('"priceListRuleId" must be defined')
    })
  })

  describe("delete", () => {
    const id = "price-list-rule-1"

    it("should delete the pricelists given an id successfully", async () => {
      await service.delete([id])

      const priceListResult = await service.list({
        id: [id],
      })

      expect(priceListResult).toHaveLength(0)
    })
  })

  describe("update", () => {
    const id = "price-list-rule-2"

    it("should update the value of the priceListRule successfully", async () => {
      await service.update([
        {
          id,
          value: 'test'
        },
      ])

      const priceList = await service.retrieve(id)

      expect(priceList.value).toEqual("test")
    })

    it("should throw an error when a id does not exist", async () => {
      let error

      try {
        await service.update([
          {
            id: "does-not-exist",
            value: 'test'
          },
        ])
      } catch (e) {
        error = e
      }

      expect(error.message).toEqual(
        'PriceListRule with id "does-not-exist" not found'
      )
    })
  })

  describe("create", () => {
    it("should create a priceList successfully", async () => {
      await service.create([
        {
          id: "price-list-rule-3",
          value: 'USD',
          price_list: "price-list-1",
          rule_type: "rule-type-1",
        },
      ])

      const [priceList] = await service.list({
        id: ["price-list-rule-3"],
      })

      expect(priceList.value).toEqual("USD")
      expect(priceList.id).toEqual("price-list-rule-3")
    })
  })
})