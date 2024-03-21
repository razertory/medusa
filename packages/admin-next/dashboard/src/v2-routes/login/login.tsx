import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Heading, Input, Text } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom"
import * as z from "zod"

import { Form } from "../../components/common/form"
import { LogoBox } from "../../components/common/logo-box"
import {
  useConvertTokenToSession,
  useV2LoginWithSession,
} from "../../lib/api-v2"
import { isAxiosError } from "../../lib/is-axios-error"
import { useEffect } from "react"
import { decodeToken } from "react-jwt"
import { medusa } from "../../lib/medusa"

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export const Login = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const { mutateAsync: getSession } = useConvertTokenToSession()

  const authToken = searchParams.get("auth_token")
  const newUser: any = authToken ? decodeToken(authToken) : null

  const from = location.state?.from?.pathname || "/settings"

  useEffect(() => {
    medusa.client
      .request(
        "POST",
        "/auth/session",
        {},
        {},
        {
          Authorization: `Bearer ${authToken}`,
        }
      )
      .then(() => {
        navigate(from, { replace: true })
      })
  }, [authToken])

  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  //  TODO: Update when more than emailpass is supported
  const { mutateAsync, isLoading } = useV2LoginWithSession()

  const handleSubmit = form.handleSubmit(async ({ email, password }) => {
    await mutateAsync(
      {
        email,
        password,
      },
      {
        onSuccess: () => {
          navigate(from, { replace: true })
        },
        onError: (error) => {
          if (isAxiosError(error)) {
            if (error.response?.status === 401) {
              form.setError("email", {
                type: "manual",
              })

              form.setError("password", {
                type: "manual",
                message: t("errors.invalidCredentials"),
              })

              return
            }
          }

          form.setError("root.serverError", {
            type: "manual",
            message: t("errors.serverError"),
          })
        },
      }
    )
  })

  return (
    <div className="bg-ui-bg-base flex min-h-dvh w-dvw items-center justify-center">
      <div className="m-4 flex w-full max-w-[300px] flex-col items-center">
        <LogoBox className="mb-4" />
        <div className="mb-4 flex flex-col items-center">
          <Heading>{t("login.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle text-center">
            {t("login.hint")}
          </Text>
        </div>
        <a type="button" href="http://localhost:9000/auth/admin/google">
          Login with google
        </a>
        <Form {...form}>
          <form
            onSubmit={handleSubmit}
            className="flex w-full flex-col gap-y-6"
          >
            <div className="flex flex-col gap-y-4">
              <Form.Field
                control={form.control}
                name="email"
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <Form.Label>{t("fields.email")}</Form.Label>
                      <Form.Control>
                        <Input autoComplete="email" {...field} />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />
              <Form.Field
                control={form.control}
                name="password"
                render={({ field }) => {
                  return (
                    <Form.Item>
                      <Form.Label>{t("fields.password")}</Form.Label>
                      <Form.Control>
                        <Input
                          type="password"
                          autoComplete="current-password"
                          {...field}
                        />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )
                }}
              />
            </div>
            <Button className="w-full" type="submit" isLoading={isLoading}>
              {t("actions.continue")}
            </Button>
          </form>
        </Form>
        <div className="my-6 h-px w-full border-b border-dotted" />
        <span className="text-ui-fg-subtle txt-small">
          <Trans
            i18nKey="login.forgotPassword"
            components={[
              <Link
                key="reset-password-link"
                to="/reset-password"
                className="text-ui-fg-interactive transition-fg hover:text-ui-fg-interactive-hover focus-visible:text-ui-fg-interactive-hover outline-none"
              />,
            ]}
          />
        </span>
      </div>
    </div>
  )
}
