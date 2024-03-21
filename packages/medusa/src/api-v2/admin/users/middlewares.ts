import * as QueryConfig from "./query-config"

import { transformBody, transformQuery } from "../../../api/middlewares"
import {
  AdminCreateUserRequest,
  AdminGetUsersParams,
  AdminGetUsersUserParams,
  AdminUpdateUserRequest,
} from "./validators"

import { MiddlewareRoute } from "../../../types/middlewares"
import { authenticate } from "../../../utils/authenticate-middleware"

export const adminUserRoutesMiddlewares: MiddlewareRoute[] = [
  // {
  //   method: ["ALL"],
  //   matcher: "/admin/users*",
  //   middlewares: [authenticate("admin", ["bearer", "session"])],
  // },
  {
    method: ["GET"],
    matcher: "/admin/users",
    middlewares: [
      transformQuery(AdminGetUsersParams, QueryConfig.listTransformQueryConfig),
      authenticate("admin", ["bearer", "session"]),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/users",
    middlewares: [
      transformBody(AdminCreateUserRequest),
      authenticate("admin", ["bearer", "session"], { allowUnregistered: true }),
    ],
  },
  {
    method: ["GET"],
    matcher: "/admin/users/:id",
    middlewares: [
      transformQuery(
        AdminGetUsersUserParams,
        QueryConfig.retrieveTransformQueryConfig
      ),
      authenticate("admin", ["bearer", "session"]),
    ],
  },
  {
    method: ["GET"],
    matcher: "/admin/users/me",
    middlewares: [
      transformQuery(
        AdminGetUsersUserParams,
        QueryConfig.retrieveTransformQueryConfig
      ),
      authenticate("admin", ["bearer", "session"]),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/users/:id",
    middlewares: [
      transformBody(AdminUpdateUserRequest),
      authenticate("admin", ["bearer", "session"]),
    ],
  },
]
