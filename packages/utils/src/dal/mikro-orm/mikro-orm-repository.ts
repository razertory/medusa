import {
  BaseFilterable,
  Context,
  DAL,
  FilterQuery,
  FilterQuery as InternalFilterQuery,
  RepositoryService,
  RepositoryTransformOptions,
  UpsertConfig,
} from "@medusajs/types"
import {
  EntityManager,
  EntitySchema,
  LoadStrategy,
  ReferenceType,
  RequiredEntityData,
} from "@mikro-orm/core"
import { FindOptions as MikroOptions } from "@mikro-orm/core/drivers/IDatabaseDriver"
import {
  EntityClass,
  EntityName,
  EntityProperty,
  FilterQuery as MikroFilterQuery,
} from "@mikro-orm/core/typings"
import { SqlEntityManager } from "@mikro-orm/postgresql"
import {
  arrayDifference,
  isString,
  lowerCaseFirst,
  promiseAll,
} from "../../common"
import { buildQuery } from "../../modules-sdk"
import {
  getSoftDeletedCascadedEntitiesIdsMappedBy,
  transactionWrapper,
} from "../utils"
import { mikroOrmSerializer, mikroOrmUpdateDeletedAtRecursively } from "./utils"

export class MikroOrmBase<T = any> {
  readonly manager_: any

  protected constructor({ manager }) {
    this.manager_ = manager
  }

  getFreshManager<TManager = unknown>(): TManager {
    return (this.manager_.fork
      ? this.manager_.fork()
      : this.manager_) as unknown as TManager
  }

  getActiveManager<TManager = unknown>({
    transactionManager,
    manager,
  }: Context = {}): TManager {
    return (transactionManager ?? manager ?? this.manager_) as TManager
  }

  async transaction<TManager = unknown>(
    task: (transactionManager: TManager) => Promise<any>,
    options: {
      isolationLevel?: string
      enableNestedTransactions?: boolean
      transaction?: TManager
    } = {}
  ): Promise<any> {
    // @ts-ignore
    return await transactionWrapper.bind(this)(task, options)
  }

  async serialize<TOutput extends object | object[]>(
    data: any,
    options?: any
  ): Promise<TOutput> {
    return await mikroOrmSerializer<TOutput>(data, options)
  }
}

/**
 * Privileged extends of the abstract classes unless most of the methods can't be implemented
 * in your repository. This base repository is also used to provide a base repository
 * injection if needed to be able to use the common methods without being related to an entity.
 * In this case, none of the method will be implemented except the manager and transaction
 * related ones.
 */

export class MikroOrmBaseRepository<T extends object = object>
  extends MikroOrmBase<T>
  implements RepositoryService<T>
{
  constructor(...args: any[]) {
    // @ts-ignore
    super(...arguments)
  }

  create(data: unknown[], context?: Context): Promise<T[]> {
    throw new Error("Method not implemented.")
  }

  update(data: { entity; update }[], context?: Context): Promise<T[]> {
    throw new Error("Method not implemented.")
  }

  delete(
    idsOrPKs: FilterQuery<T> & BaseFilterable<FilterQuery<T>>,
    context?: Context
  ): Promise<void> {
    throw new Error("Method not implemented.")
  }

  find(options?: DAL.FindOptions<T>, context?: Context): Promise<T[]> {
    throw new Error("Method not implemented.")
  }

  findAndCount(
    options?: DAL.FindOptions<T>,
    context?: Context
  ): Promise<[T[], number]> {
    throw new Error("Method not implemented.")
  }

  upsert(
    data: unknown[],
    upsertConfig: UpsertConfig<T> = {},
    context: Context = {}
  ): Promise<T[]> {
    throw new Error("Method not implemented.")
  }

  async softDelete(
    idsOrFilter: string[] | InternalFilterQuery,
    sharedContext: Context = {}
  ): Promise<[T[], Record<string, unknown[]>]> {
    const isArray = Array.isArray(idsOrFilter)
    // TODO handle composite keys
    const filter =
      isArray || isString(idsOrFilter)
        ? {
            id: {
              $in: isArray ? idsOrFilter : [idsOrFilter],
            },
          }
        : idsOrFilter

    const entities = await this.find({ where: filter as any }, sharedContext)
    const date = new Date()

    const manager = this.getActiveManager<SqlEntityManager>(sharedContext)
    await mikroOrmUpdateDeletedAtRecursively<T>(
      manager,
      entities as any[],
      date
    )

    const softDeletedEntitiesMap = getSoftDeletedCascadedEntitiesIdsMappedBy({
      entities,
    })

    return [entities, softDeletedEntitiesMap]
  }

  async restore(
    idsOrFilter: string[] | InternalFilterQuery,
    sharedContext: Context = {}
  ): Promise<[T[], Record<string, unknown[]>]> {
    // TODO handle composite keys
    const isArray = Array.isArray(idsOrFilter)
    const filter =
      isArray || isString(idsOrFilter)
        ? {
            id: {
              $in: isArray ? idsOrFilter : [idsOrFilter],
            },
          }
        : idsOrFilter

    const query = buildQuery(filter, {
      withDeleted: true,
    })

    const entities = await this.find(query, sharedContext)

    const manager = this.getActiveManager<SqlEntityManager>(sharedContext)
    await mikroOrmUpdateDeletedAtRecursively(manager, entities as any[], null)

    const softDeletedEntitiesMap = getSoftDeletedCascadedEntitiesIdsMappedBy({
      entities,
      restored: true,
    })

    return [entities, softDeletedEntitiesMap]
  }

  applyFreeTextSearchFilters<T>(
    findOptions: DAL.FindOptions<T & { q?: string }>,
    retrieveConstraintsToApply: (q: string) => any[]
  ): void {
    if (!("q" in findOptions.where) || !findOptions.where.q) {
      delete findOptions.where.q

      return
    }

    const q = findOptions.where.q as string
    delete findOptions.where.q

    findOptions.where = {
      $and: [findOptions.where, { $or: retrieveConstraintsToApply(q) }],
    } as unknown as DAL.FilterQuery<T & { q?: string }>
  }
}

export class MikroOrmBaseTreeRepository<
  T extends object = object
> extends MikroOrmBase<T> {
  constructor() {
    // @ts-ignore
    super(...arguments)
  }

  find(
    options?: DAL.FindOptions,
    transformOptions?: RepositoryTransformOptions,
    context?: Context
  ): Promise<T[]> {
    throw new Error("Method not implemented.")
  }

  findAndCount(
    options?: DAL.FindOptions,
    transformOptions?: RepositoryTransformOptions,
    context?: Context
  ): Promise<[T[], number]> {
    throw new Error("Method not implemented.")
  }

  create(data: unknown, context?: Context): Promise<T> {
    throw new Error("Method not implemented.")
  }

  delete(id: string, context?: Context): Promise<void> {
    throw new Error("Method not implemented.")
  }
}

export function mikroOrmBaseRepositoryFactory<T extends object = object>(
  entity: any
): {
  new ({ manager }: { manager: any }): MikroOrmBaseRepository<T>
} {
  class MikroOrmAbstractBaseRepository_ extends MikroOrmBaseRepository<T> {
    // @ts-ignore
    constructor(...args: any[]) {
      // @ts-ignore
      super(...arguments)
    }

    static buildUniqueCompositeKeyValue(keys: string[], data: object) {
      return keys.map((k) => data[k]).join("_")
    }

    static retrievePrimaryKeys(entity: EntityClass<T> | EntitySchema<T>) {
      return (
        (entity as EntitySchema<T>).meta?.primaryKeys ??
        (entity as EntityClass<T>).prototype.__meta.primaryKeys ?? ["id"]
      )
    }

    async create(data: any[], context?: Context): Promise<T[]> {
      const manager = this.getActiveManager<EntityManager>(context)

      const entities = data.map((data_) => {
        return manager.create(
          entity as EntityName<T>,
          data_ as RequiredEntityData<T>
        )
      })

      manager.persist(entities)

      return entities
    }

    async update(data: { entity; update }[], context?: Context): Promise<T[]> {
      const manager = this.getActiveManager<EntityManager>(context)
      const entities = data.map((data_) => {
        return manager.assign(data_.entity, data_.update)
      })

      manager.persist(entities)

      return entities
    }

    async delete(
      filters: FilterQuery<T> & BaseFilterable<FilterQuery<T>>,
      context?: Context
    ): Promise<void> {
      const manager = this.getActiveManager<EntityManager>(context)
      await manager.nativeDelete<T>(entity as EntityName<T>, filters as any)
    }

    async find(options?: DAL.FindOptions<T>, context?: Context): Promise<T[]> {
      const manager = this.getActiveManager<EntityManager>(context)

      const findOptions_ = { ...options }
      findOptions_.options ??= {}

      if (!("strategy" in findOptions_.options)) {
        if (findOptions_.options.limit != null || findOptions_.options.offset) {
          Object.assign(findOptions_.options, {
            strategy: LoadStrategy.SELECT_IN,
          })
        } else {
          Object.assign(findOptions_.options, {
            strategy: LoadStrategy.JOINED,
          })
        }
      }

      return await manager.find(
        entity as EntityName<T>,
        findOptions_.where as MikroFilterQuery<T>,
        findOptions_.options as MikroOptions<T>
      )
    }

    async findAndCount(
      findOptions: DAL.FindOptions<T> = { where: {} },
      context: Context = {}
    ): Promise<[T[], number]> {
      const manager = this.getActiveManager<EntityManager>(context)

      const findOptions_ = { ...findOptions }
      findOptions_.options ??= {}

      Object.assign(findOptions_.options, {
        strategy: LoadStrategy.SELECT_IN,
      })

      return await manager.findAndCount(
        entity as EntityName<T>,
        findOptions_.where as MikroFilterQuery<T>,
        findOptions_.options as MikroOptions<T>
      )
    }

    // Upsert does several things to simplify module implementation.
    // For each entry of your base entity, it will go through all relations, and it will do a diff between what is passed and what is in the database.
    // For each relation, it create new entries (without an ID), it will associate existing entries (with only an ID), and it will update existing entries (with an ID and other fields).
    // Finally, it will delete the relation entries that were omitted in the new data.
    async upsert(
      data: any[],
      upsertConfig: UpsertConfig<T> = {},
      context: Context = {}
    ): Promise<T[]> {
      if (!data.length) {
        return []
      }
      const manager = this.getActiveManager<EntityManager>(context)

      // Handle the relations
      const allRelations = manager
        .getDriver()
        .getMetadata()
        .get(entity.name).relations

      const nonexistentRelations = arrayDifference(
        (upsertConfig.relations as string[]) ?? [],
        allRelations.map((r) => r.name)
      )

      if (nonexistentRelations.length) {
        throw new Error(
          `Nonexistent relations were passed during upsert: ${nonexistentRelations}`
        )
      }

      const entryUpsertedMap = new Map<string, T>()

      // Create only the top-level entity without the relations
      const toUpsert = data.map((entry) => {
        const entryEntity = manager.create<T>(entity, entry)
        entryUpsertedMap.set(entryEntity.id, entry)

        allRelations?.forEach((relation) => {
          if (!upsertConfig.relations?.includes(relation.name as keyof T)) {
            delete entryEntity[relation.name]
          }
        })

        return entryEntity
      })

      const upsertedTopLevelEntities = await manager.upsertMany(
        entity,
        toUpsert
      )

      await promiseAll(
        upsertedTopLevelEntities.map(async (entityEntry) => {
          const entry = entryUpsertedMap.get(entityEntry.id)!

          await promiseAll(
            allRelations?.map(async (relation) => {
              const relationName = relation.name as keyof T
              if (!upsertConfig.relations?.includes(relationName)) {
                return
              } else {
                await this.assignRelation_(manager, entry, relation)
                return
              }
            })
          )

          return entry
        })
      )

      console.log(upsertedTopLevelEntities)

      return upsertedTopLevelEntities
    }

    protected async assignRelation_(
      manager: EntityManager,
      data: T,
      relation: EntityProperty
    ) {
      const unmanagedData = manager.create(entity, data, {
        managed: false,
      })
      const dataForRelation = unmanagedData[relation.name]

      // If the field is not set, we ignore it. Null and empty arrays are a valid input and are handled below
      if (dataForRelation === undefined) {
        return undefined
      }

      // TODO: To be handled later
      if (
        relation.reference === ReferenceType.MANY_TO_ONE ||
        relation.reference === ReferenceType.ONE_TO_ONE
      ) {
        return undefined
      }

      let normalizedData = []
      if (dataForRelation.isInitialized()) {
        normalizedData = dataForRelation.getItems()
      } else {
        await dataForRelation.init()
        normalizedData = dataForRelation.getItems()
      }

      if (relation.reference === ReferenceType.MANY_TO_MANY) {
        let upserted = []
        if (normalizedData.length) {
          upserted = await manager.upsertMany(normalizedData)
        }

        // TODO: Delete rows from pivot table

        return upserted
      }

      if (relation.reference === ReferenceType.ONE_TO_MANY) {
        let upserted = []
        if (normalizedData.length) {
          upserted = await manager.upsertMany(normalizedData)
        }

        const joinColumns =
          relation.targetMeta?.properties[lowerCaseFirst(entity.name)]
            ?.joinColumns
        const joinColumnsConstraints = {}
        joinColumns?.forEach((joinColumn, index) => {
          const referencedColumnName = relation.referencedColumnNames[index]
          joinColumnsConstraints[joinColumn] = data[referencedColumnName]
        })

        const resp = await manager.nativeDelete(relation.type, {
          ...joinColumnsConstraints,
          id: { $nin: upserted.map((d) => d.id) },
        })

        return upserted
      }

      return
    }
  }

  return MikroOrmAbstractBaseRepository_ as unknown as {
    new ({ manager }: { manager: any }): MikroOrmBaseRepository<T>
  }
}
