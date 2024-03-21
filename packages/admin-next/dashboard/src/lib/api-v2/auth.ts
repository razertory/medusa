import { useMutation } from "@tanstack/react-query"
import { adminAuthKeys, useAdminCustomQuery } from "medusa-react"
import { medusa } from "../medusa"

export const useV2Session = (options: any = {}) => {
  const { data, isLoading, isError, error } = useAdminCustomQuery(
    "/admin/users/me",
    adminAuthKeys.details(),
    {},
    options
  )

  const user = data?.user

  return { user, isLoading, isError, error }
}

export const useV2LoginWithSession = () => {
  return useMutation(
    (payload: { email: string; password: string }) =>
      medusa.client.request("POST", "/auth/admin/emailpass", {
        email: payload.email,
        password: payload.password,
      }),
    {
      onSuccess: async (args: { token: string }) => {
        const { token } = args

        // Convert the JWT to a session cookie
        //  TODO: Consider if the JWT is a good choice for session token
        await medusa.client.request(
          "POST",
          "/auth/session",
          {},
          {},
          {
            Authorization: `Bearer ${token}`,
          }
        )
      },
    }
  )
}

export const useAdminCreateAuthUser = (provider = "emailpass") => {
  return useMutation((args: Record<string, any>) =>
    medusa.client.request("POST", `/auth/admin/${provider}`, args)
  )
}

export const useAdminAcceptInviteV2 = () => {
  return useMutation(
    (args: {
      first_name: string
      last_name: string
      token: string
      authToken: string
    }) =>
      medusa.client.request(
        "POST",
        `/admin/invites/accept?token=${args.token}`,
        {
          first_name: args.first_name,
          last_name: args.last_name,
        },
        {},
        {
          Authorization: `Bearer ${args.authToken}`,
        }
      )
  )
}
