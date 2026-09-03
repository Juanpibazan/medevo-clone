# Create the Revised Premium Paddle Sandbox Catalog

## Summary

Create—or reconcile—one active Paddle sandbox product named **Premium** with monthly and annual prices. The only country-specific overrides will be Brazil and Bolivia; no overrides for `GB`, `IE`, or `AU` will remain.

Paddle does not support `BOB`, so the Bolivia-specific override will target country code `BO` in USD, as selected. See [Paddle supported currencies](https://developer.paddle.com/concepts/sell/supported-currencies/).

## Catalog Specification

| Market | Monthly | Paddle amount | Annual | Paddle amount |
| --- | ---: | ---: | ---: | ---: |
| Base | USD 20.00 | `"2000"` | USD 200.00 | `"20000"` |
| Brazil (`BR`) | BRL 49.90 | `"4990"` | BRL 499.00 | `"49900"` |
| Bolivia (`BO`) | USD 9.00 | `"900"` | USD 90.00 | `"9000"` |

The regional prices are purchasing-power-oriented starting points. Each annual price equals ten monthly payments, preserving the base plan’s 16.7% annual discount.

### Product

- Name: `Premium`
- Description: `Full access to MedCiclo Premium exam-preparation features.`
- Type: `standard`
- Tax category: `saas`
- Status: `active`

### Monthly price

- Name: `Premium Monthly`
- Billing cycle: `{ interval: "month", frequency: 1 }`
- Base price: USD `"2000"`
- Overrides: BR/BRL `"4990"` and BO/USD `"900"`

### Annual price

- Name: `Premium Annual`
- Billing cycle: `{ interval: "year", frequency: 1 }`
- Base price: USD `"20000"`
- Overrides: BR/BRL `"49900"` and BO/USD `"9000"`

### Shared price settings

- No trial
- Quantity minimum and maximum: `1`
- Tax mode: `account_setting`
- Status: `active`

## Execution

1. Use only the authenticated `paddle-sandbox` connector.
2. Consult the current documentation through the `paddle-docs` MCP server before suggesting or performing Paddle operations.
3. Inspect the existing sandbox catalog before mutation.
4. If the Premium product does not exist, create it and attach the two prices with only the BR and BO overrides.
5. If the prices already exist, update each using the complete `unit_price_overrides` array above. Paddle treats that array as authoritative, so omitting `GB`, `IE`, and `AU` removes those overrides. See [Paddle localized pricing](https://developer.paddle.com/build/products/offer-localized-pricing/).
6. Do not archive products or prices, alter base prices, or change Paddle account-level currency and tax settings.
7. Avoid duplicates by reusing matching entities. Stop and report any conflicting duplicate products or billing-cycle prices.
8. Before updating existing prices or performing any other destructive catalog action, request the owner's explicit confirmation.

## Verification and Output

Retrieve the final product and both prices, then confirm:

- One active `Premium` product with a `pro_…` ID.
- Two active attached prices with `pri_…` IDs.
- Correct monthly and annual billing cycles.
- Base USD amounts remain unchanged.
- BR and BO overrides contain the specified currencies and amounts.
- No `GB`, `IE`, or `AU` overrides remain.

Run pricing previews for `US`, `BR`, `BO`, `GB`, `IE`, and `AU`. Verify that BR and BO resolve to their overrides while the removed markets fall back to automatic conversion or the USD base price.

Return the product ID and both price IDs, including their base prices and final override mappings.

## Assumptions

- The requested removal authorizes replacing existing price-override arrays in the sandbox after the required explicit confirmation.
- Bolivia is charged in USD because Paddle does not accept BOB.
- Taxes continue to follow the Paddle account setting.
- No repository files other than this plan and no production Paddle data are changed.
- Execution requires authenticated `paddle-sandbox` and `paddle-docs` connectors.

## Execution Result

Completed in Paddle sandbox on 2026-09-02. The catalog was empty before creation, so no destructive reconciliation or owner confirmation was required.

- Product: `pro_01m1j830d61x75e9z04s1nkaaf`
- Monthly price: `pri_01m1j830hbvzxn5ge2drgcwkpf`
- Annual price: `pri_01m1j830yftjjx1vtx45twwx01`
- Active `Premium` products: `1`; archived `Premium` products: `0`
- Active attached prices: `2`; archived attached prices: `0`
- Both prices contain exactly the BR and BO overrides specified above.
- Pricing previews resolved to USD 20.00/200.00 for US, USD 9.00/90.00 for BO, BRL 49.90/499.00 for BR, and the USD base totals for GB, IE, and AU.

Paddle accepted `tax_mode: "account_setting"` on creation and persisted the account's resolved default, `location`. This is the documented behavior since the 2025-10-29 automatic-tax update: `account_setting` is resolved to the concrete account default when the price is created. Independent read-only QA passed with no blocking defects. Country-only previews verify override selection and tax-mode behavior; they are not final tax quotations, for which postal codes may be required.
