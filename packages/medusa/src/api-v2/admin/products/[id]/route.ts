import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "../../../../types/routing"
import {
  deleteProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/core-flows"

import { UpdateProductDTO } from "@medusajs/types"
import { remoteQueryObjectFromString } from "@medusajs/utils"
import { refetchProduct, remapKeysForProduct, remapProduct } from "../helpers"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const remoteQuery = req.scope.resolve("remoteQuery")

  const variables = { id: req.params.id }

  const selectFields = remapKeysForProduct(req.remoteQueryConfig.fields ?? [])
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "product",
    variables,
    fields: selectFields,
  })

  const [product] = await remoteQuery(queryObject)

  res.status(200).json({ product: remapProduct(product) })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<UpdateProductDTO>,
  res: MedusaResponse
) => {
  const { result, errors } = await updateProductsWorkflow(req.scope).run({
    input: {
      selector: { id: req.params.id },
      update: req.validatedBody,
    },
    throwOnError: false,
  })

  if (Array.isArray(errors) && errors[0]) {
    throw errors[0].error
  }

  const product = await refetchProduct(
    result[0].id,
    req.scope,
    req.remoteQueryConfig.fields
  )
  res.status(200).json({ product: remapProduct(product) })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const id = req.params.id

  const { errors } = await deleteProductsWorkflow(req.scope).run({
    input: { ids: [id] },
    throwOnError: false,
  })

  if (Array.isArray(errors) && errors[0]) {
    throw errors[0].error
  }

  res.status(200).json({
    id,
    object: "product",
    deleted: true,
  })
}
