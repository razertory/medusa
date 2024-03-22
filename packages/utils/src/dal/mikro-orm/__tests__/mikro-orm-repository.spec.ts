import {
  BeforeCreate,
  Collection,
  Entity,
  EntityManager,
  ManyToMany,
  ManyToOne,
  MikroORM,
  OneToMany,
  OnInit,
  PrimaryKey,
  Property,
} from "@mikro-orm/core"
import { mikroOrmBaseRepositoryFactory } from "../mikro-orm-repository"
import { dropDatabase } from "pg-god"

@Entity()
class Entity1 {
  @PrimaryKey()
  id: string

  @Property()
  title: string

  @Property({ nullable: true })
  deleted_at: Date | null

  @OneToMany(() => Entity2, (entity2) => entity2.entity1, {})
  entity2 = new Collection<Entity2>(this)

  @ManyToMany(() => Entity3, "entity1", {
    owner: true,
    pivotTable: "entity_1_3",
  })
  entity3 = new Collection<Entity3>(this)

  @OnInit()
  onInit() {
    if (!this.id) {
      this.id = Math.random().toString(36).substring(7)
    }
  }

  @BeforeCreate()
  beforeCreate() {
    if (!this.id) {
      this.id = Math.random().toString(36).substring(7)
    }
  }
}

@Entity()
class Entity2 {
  @PrimaryKey()
  id: string

  @Property()
  title: string

  @Property({ nullable: true })
  deleted_at: Date | null

  @ManyToOne(() => Entity1, { nullable: true })
  entity1: Entity1 | null

  @OnInit()
  onInit() {
    if (!this.id) {
      this.id = Math.random().toString(36).substring(7)
    }
  }

  @BeforeCreate()
  beforeCreate() {
    if (!this.id) {
      this.id = Math.random().toString(36).substring(7)
    }
  }
}

@Entity()
class Entity3 {
  @PrimaryKey()
  id: string

  @Property()
  title: string

  @Property({ nullable: true })
  deleted_at: Date | null

  @ManyToMany(() => Entity1, (entity1) => entity1.entity3)
  entity1 = new Collection<Entity1>(this)

  @OnInit()
  onInit() {
    if (!this.id) {
      this.id = Math.random().toString(36).substring(7)
    }
  }

  @BeforeCreate()
  beforeCreate() {
    if (!this.id) {
      this.id = Math.random().toString(36).substring(7)
    }
  }
}

const Entity1Repository = mikroOrmBaseRepositoryFactory<Entity1>(Entity1)
const Entity2Repository = mikroOrmBaseRepositoryFactory<Entity2>(Entity2)
const Entity3Repository = mikroOrmBaseRepositoryFactory<Entity3>(Entity3)

describe("mikroOrmRepository", () => {
  describe("upsert", () => {
    let orm!: MikroORM
    let manager!: EntityManager
    const manager1 = () => {
      return new Entity1Repository({ manager: manager.fork() })
    }
    const manager2 = () => {
      return new Entity2Repository({ manager: manager.fork() })
    }
    const manager3 = () => {
      return new Entity3Repository({ manager: manager.fork() })
    }

    beforeEach(async () => {
      await dropDatabase(
        { databaseName: "dogfood", errorIfNonExist: false },
        { user: "postgres" }
      )

      orm = await MikroORM.init({
        entities: [Entity1, Entity2],
        dbName: "dogfood",
        type: "postgresql",
      })

      const generator = orm.getSchemaGenerator()
      await generator.ensureDatabase()
      await generator.createSchema()

      manager = orm.em.fork()
    })

    afterEach(async () => {
      const generator = orm.getSchemaGenerator()
      await generator.dropSchema()
      await orm.close(true)
    })

    it("should successfully create a flat entity", async () => {
      const entity1 = { id: "1", title: "en1" }

      const resp = await manager1().upsert([entity1])
      const listedEntities = await manager1().find()

      expect(listedEntities).toHaveLength(1)
      expect(listedEntities[0]).toEqual(
        expect.objectContaining({
          id: "1",
          title: "en1",
        })
      )
    })

    it("should successfully update a flat entity", async () => {
      const entity1 = { id: "1", title: "en1" }

      await manager1().upsert([entity1])
      entity1.title = "newen1"
      await manager1().upsert([entity1])
      const listedEntities = await manager1().find()

      expect(listedEntities).toHaveLength(1)
      expect(listedEntities[0]).toEqual(
        expect.objectContaining({
          id: "1",
          title: "newen1",
        })
      )
    })

    // TODO: Should we support this
    it.skip("should successfully create an entity with a sub-entity many-to-one relation", async () => {
      const entity2 = {
        id: "2",
        title: "en2",
        entity1: { title: "en1" },
      }

      await manager2().upsert([entity2], { relations: ["entity1"] })
      const listedEntities = await manager2().find({
        where: { id: "2" },
        options: { populate: ["entity1"] },
      })

      expect(listedEntities).toHaveLength(1)
      expect(listedEntities[0]).toEqual(
        expect.objectContaining({
          id: "2",
          title: "en2",
          entity1: expect.objectContaining({
            id: expect.any(String),
            title: "en1",
          }),
        })
      )
    })

    it.skip("should only create the parent entity of a many-to-one if relation is not included", async () => {
      const entity2 = {
        id: "2",
        title: "en2",
        entity1: { title: "en1" },
      }

      await manager2().upsert([entity2], { relations: [] })
      const listedEntities = await manager2().find({
        where: { id: "2" },
        options: { populate: ["entity1"] },
      })

      expect(listedEntities).toHaveLength(1)
      expect(listedEntities[0]).toEqual(
        expect.objectContaining({
          id: "2",
          title: "en2",
          entity1: null,
        })
      )
    })

    it.skip("should only update the parent entity of a many-to-one if relation is not included", async () => {
      const entity2 = {
        id: "2",
        title: "en2",
        entity1: { title: "en1" },
      }

      await manager2().upsert([entity2], { relations: ["entity1"] })

      entity2.title = "newen2"
      entity2.entity1.title = "newen1"
      await manager2().upsert([entity2], { relations: [] })
      const listedEntities = await manager2().find({
        where: { id: "2" },
        options: { populate: ["entity1"] },
      })

      expect(listedEntities).toHaveLength(1)
      expect(listedEntities[0]).toEqual(
        expect.objectContaining({
          id: "2",
          title: "newen2",
          entity1: expect.objectContaining({
            title: "en1",
          }),
        })
      )
    })

    it.skip("should successfully update an entity with a sub-entity many-to-one relation", async () => {
      const entity2 = {
        id: "2",
        title: "en2",
        entity1: { title: "en1" },
      }

      await manager2().upsert([entity2], { relations: ["entity1"] })
      entity2.title = "newen2"
      entity2.entity1!.title = "newen1"
      await manager2().upsert([entity2], { relations: ["entity1"] })
      const listedEntities = await manager2().find({
        where: { id: "2" },
        options: { populate: ["entity1"] },
      })

      expect(listedEntities).toHaveLength(1)
      expect(listedEntities[0]).toEqual(
        expect.objectContaining({
          id: "2",
          title: "newen2",
          entity1: expect.objectContaining({
            id: expect.any(String),
            title: "newen1",
          }),
        })
      )
    })

    it("should only create the parent entity of a one-to-many if relation is not included", async () => {
      const entity1 = {
        id: "1",
        title: "en1",
        entity2: [{ title: "en2-1" }, { title: "en2-2" }],
      }

      await manager1().upsert([entity1], { relations: [] })
      const listedEntities = await manager1().find({
        where: { id: "1" },
        options: { populate: ["entity2"] },
      })

      expect(listedEntities).toHaveLength(1)
      expect(listedEntities[0]).toEqual(
        expect.objectContaining({
          id: "1",
          title: "en1",
        })
      )
      expect(listedEntities[0].entity2.getItems()).toHaveLength(0)
    })

    it("should successfully create an entity with a sub-entity one-to-many relation", async () => {
      const entity1 = {
        id: "1",
        title: "en1",
        entity2: [{ title: "en2-1" }, { title: "en2-2" }],
      }

      await manager1().upsert([entity1], { relations: ["entity2"] })
      const listedEntities = await manager1().find({
        where: { id: "1" },
        options: { populate: ["entity2"] },
      })

      expect(listedEntities).toHaveLength(1)
      expect(listedEntities[0]).toEqual(
        expect.objectContaining({
          id: "1",
          title: "en1",
        })
      )
      expect(listedEntities[0].entity2.getItems()).toHaveLength(2)
      expect(listedEntities[0].entity2.getItems()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: "en2-1",
          }),
          expect.objectContaining({
            title: "en2-2",
          }),
        ])
      )
    })

    it("should only update the parent entity of a one-to-many if relation is not included", async () => {
      const entity1 = {
        id: "1",
        title: "en1",
        entity2: [{ title: "en2-1" }, { title: "en2-2" }],
      }

      await manager1().upsert([entity1], { relations: ["entity2"] })
      entity1.entity2.push({ title: "en2-3" })
      await manager1().upsert([entity1], { relations: [] })

      const listedEntities = await manager1().find({
        where: { id: "1" },
        options: { populate: ["entity2"] },
      })

      expect(listedEntities).toHaveLength(1)
      expect(listedEntities[0]).toEqual(
        expect.objectContaining({
          id: "1",
          title: "en1",
        })
      )
      expect(listedEntities[0].entity2.getItems()).toHaveLength(2)
      expect(listedEntities[0].entity2.getItems()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: "en2-1",
          }),
          expect.objectContaining({
            title: "en2-2",
          }),
        ])
      )
    })

    it("should successfully update, create, and delete subentities an entity with a one-to-many relation", async () => {
      const entity1Manager = new Entity1Repository({ manager: manager.fork() })
      const entity1 = {
        id: "1",
        title: "en1",
        entity2: [
          { id: "2", title: "en2-1" },
          { id: "3", title: "en2-2" },
        ] as any[],
      }

      await manager1().upsert([entity1], { relations: ["entity2"] })

      entity1.entity2 = [{ id: "2", title: "newen2-1" }, { title: "en2-3" }]

      await manager1().upsert([entity1], { relations: ["entity2"] })
      const listedEntities = await manager1().find({
        where: { id: "1" },
        options: { populate: ["entity2"] },
      })

      expect(listedEntities).toHaveLength(1)
      expect(listedEntities[0]).toEqual(
        expect.objectContaining({
          id: "1",
          title: "en1",
        })
      )
      expect(listedEntities[0].entity2.getItems()).toHaveLength(2)
      expect(listedEntities[0].entity2.getItems()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: "newen2-1",
          }),
          expect.objectContaining({
            title: "en2-3",
          }),
        ])
      )
    })

    it("should only create the parent entity of a many-to-many if relation is not included", async () => {
      const entity1 = {
        id: "1",
        title: "en1",
        entity3: [{ title: "en3-1" }, { title: "en3-2" }],
      }

      await manager1().upsert([entity1], { relations: [] })
      const listedEntities = await manager1().find({
        where: { id: "1" },
        options: { populate: ["entity3"] },
      })

      expect(listedEntities).toHaveLength(1)
      expect(listedEntities[0]).toEqual(
        expect.objectContaining({
          id: "1",
          title: "en1",
        })
      )
      expect(listedEntities[0].entity3.getItems()).toHaveLength(0)
    })

    it.only("should successfully create an entity with a sub-entity many-to-many relation", async () => {
      const entity1 = {
        id: "1",
        title: "en1",
        entity3: [{ title: "en3-1" }, { title: "en3-2" }],
      }

      await manager1().upsert([entity1], { relations: ["entity3"] })
      const listedEntity1 = await manager1().find({
        where: { id: "1" },
        options: { populate: ["entity3"] },
      })

      const listedEntity3 = await manager3().find({
        where: { title: "en3-1" },
        options: { populate: ["entity1"] },
      })

      expect(listedEntity1).toHaveLength(1)
      expect(listedEntity1[0]).toEqual(
        expect.objectContaining({
          id: "1",
          title: "en1",
        })
      )
      expect(listedEntity1[0].entity3.getItems()).toHaveLength(2)
      expect(listedEntity1[0].entity3.getItems()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: "en3-1",
          }),
          expect.objectContaining({
            title: "en3-2",
          }),
        ])
      )

      expect(listedEntity3).toHaveLength(1)
      expect(listedEntity3[0]).toEqual(
        expect.objectContaining({
          title: "en3-1",
        })
      )
      expect(listedEntity3[0].entity1.getItems()).toHaveLength(1)
      expect(listedEntity3[0].entity1.getItems()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: "en1",
          }),
        ])
      )
    })

    it("should only update the parent entity of a many-to-many if relation is not included", async () => {
      const entity1 = {
        id: "1",
        title: "en1",
        entity3: [{ title: "en3-1" }, { title: "en3-2" }],
      }

      await manager1().upsert([entity1], { relations: ["entity3"] })
      entity1.title = "newen1"
      entity1.entity3.push({ title: "en3-3" })
      await manager1().upsert([entity1], { relations: [] })

      const listedEntities = await manager1().find({
        where: { id: "1" },
        options: { populate: ["entity3"] },
      })

      console.log(listedEntities)

      expect(listedEntities).toHaveLength(1)
      expect(listedEntities[0]).toEqual(
        expect.objectContaining({
          id: "1",
          title: "en1",
        })
      )
      expect(listedEntities[0].entity3.getItems()).toHaveLength(2)
      expect(listedEntities[0].entity3.getItems()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: "en3-1",
          }),
          expect.objectContaining({
            title: "en3-2",
          }),
        ])
      )
    })

    it("should successfully update, create, and delete subentities an entity with a many-to-many relation", async () => {
      const entity1 = {
        id: "1",
        title: "en1",
        entity3: [
          { id: "4", title: "en3-1" },
          { id: "5", title: "en3-2" },
        ] as any,
      }

      await manager1().upsert([entity1], { relations: ["entity3"] })
      entity1.title = "newen1"
      entity1.entity3 = [{ id: "4", title: "newen3-1" }, { title: "en3-4" }]
      await manager1().upsert([entity1], { relations: ["entity3"] })

      const listedEntities = await manager1().find({
        where: { id: "1" },
        options: { populate: ["entity3"] },
      })

      expect(listedEntities).toHaveLength(1)
      expect(listedEntities[0]).toEqual(
        expect.objectContaining({
          id: "1",
          title: "en1",
        })
      )
      expect(listedEntities[0].entity3.getItems()).toHaveLength(2)
      expect(listedEntities[0].entity3.getItems()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: "newen3-1",
          }),
          expect.objectContaining({
            title: "en3-4",
          }),
        ])
      )
    })
  })
})
