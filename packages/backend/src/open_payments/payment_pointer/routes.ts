import { AccessAction } from 'open-payments'
import { PaymentPointerSubresource } from './model'
import { PaymentPointerSubresourceService } from './service'
import { PaymentPointerContext, ListContext } from '../../app'
import {
  getPageInfo,
  parsePaginationQueryParameters
} from '../../shared/pagination'

interface ServiceDependencies {
  authServer: string
}

export interface PaymentPointerRoutes {
  get(ctx: PaymentPointerContext): Promise<void>
  getCredentialId(ctx: PaymentPointerContext): Promise<void>
}

export function createPaymentPointerRoutes(
  deps: ServiceDependencies
): PaymentPointerRoutes {
  return {
    get: (ctx: PaymentPointerContext) => getPaymentPointer(deps, ctx),
    getCredentialId: (ctx: PaymentPointerContext) => getCredentialId(deps, ctx)
  }
}

// Spec: https://docs.openpayments.guide/reference/get-public-account
export async function getPaymentPointer(
  deps: ServiceDependencies,
  ctx: PaymentPointerContext
): Promise<void> {
  if (!ctx.paymentPointer) {
    return ctx.throw(404)
  }

  ctx.body = ctx.paymentPointer.toOpenPaymentsType({
    authServer: deps.authServer
  })
}

export async function getCredentialId(
  deps: ServiceDependencies,
  ctx: PaymentPointerContext
): Promise<void> {
  if (!ctx.paymentPointer) {
    return ctx.throw(404)
  }

  if (!ctx.paymentPointer.credentialId) {
    return ctx.throw(404)
  }

  ctx.body = ctx.paymentPointer.credentialId
}

interface ListSubresourceOptions<M extends PaymentPointerSubresource> {
  ctx: ListContext
  getPaymentPointerPage: PaymentPointerSubresourceService<M>['getPaymentPointerPage']
  toBody: (model: M) => Record<string, unknown>
}

export const listSubresource = async <M extends PaymentPointerSubresource>({
  ctx,
  getPaymentPointerPage,
  toBody
}: ListSubresourceOptions<M>) => {
  const pagination = parsePaginationQueryParameters(ctx.request.query)
  const client = ctx.accessAction === AccessAction.List ? ctx.client : undefined
  const page = await getPaymentPointerPage({
    paymentPointerId: ctx.paymentPointer.id,
    pagination,
    client
  })
  const pageInfo = await getPageInfo(
    (pagination) =>
      getPaymentPointerPage({
        paymentPointerId: ctx.paymentPointer.id,
        pagination,
        client
      }),
    page
  )
  const result = {
    pagination: pageInfo,
    result: page.map((item: M) => {
      item.paymentPointer = ctx.paymentPointer
      return toBody(item)
    })
  }
  ctx.body = result
}
