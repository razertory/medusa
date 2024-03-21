import { useAdminOrder } from "medusa-react"
import { useParams } from "react-router-dom"

import { CreateReturns } from "./components/create-returns"
import { RouteFocusModal } from "../../../components/route-modal"

export function ReturnsCreate() {
  const { id } = useParams()

  const { order, isLoading, isError, error } = useAdminOrder(id!, {
    expand:
      "items,items.variant,items.variant.product,returnable_items,claims,claims.additional_items,claims.return_order,swaps,swaps.additional_items",
  })

  if (isError) {
    throw error
  }

  if (isLoading || !order) {
    return null
  }

  return (
    <RouteFocusModal>
      <CreateReturns order={order} />
    </RouteFocusModal>
  )
}
