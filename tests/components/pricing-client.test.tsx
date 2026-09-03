import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  PricingClient,
  type Tier,
} from "@/app/[locale]/(public)/pricing/pricing-client";

const { initialize, open, preview } = vi.hoisted(() => ({
  initialize: vi.fn(),
  open: vi.fn(),
  preview: vi.fn(),
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@paddle/paddle-js", () => ({
  initializePaddle: initialize,
}));

const tier: Tier = {
  name: "Premium",
  description: "description",
  features: ["one"],
  priceId: { month: "pri_month", year: "pri_year" },
};
describe("PricingClient", () => {
  it("can retry after Paddle initialization fails", async () => {
    initialize
      .mockRejectedValueOnce(new Error("SDK unavailable"))
      .mockResolvedValue({ Checkout: { open }, PricePreview: preview });
    preview.mockResolvedValue({
      data: {
        details: {
          lineItems: [
            {
              price: { id: "pri_month" },
              formattedTotals: { total: "$9.00" },
            },
            {
              price: { id: "pri_year" },
              formattedTotals: { total: "$90.00" },
            },
          ],
        },
      },
    });
    const user = userEvent.setup();
    render(
      <PricingClient
        tier={tier}
        locale="es"
        clientToken="test_token"
        paddleEnvironment="sandbox"
        appUrl="https://medevo-clone.vercel.app"
      />,
    );

    await user.click(await screen.findByRole("button", { name: "retry" }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
        "$90.00",
      ),
    );
    expect(initialize).toHaveBeenCalledTimes(2);
  });

  it("shows Paddle totals untouched and opens the exact selected checkout without an absent country", async () => {
    preview.mockResolvedValue({
      data: {
        details: {
          lineItems: [
            {
              price: { id: "pri_month" },
              formattedTotals: { total: "R$ 49,90" },
            },
            {
              price: { id: "pri_year" },
              formattedTotals: { total: "R$ 499,00" },
            },
          ],
        },
      },
    });
    const user = userEvent.setup();
    render(
      <PricingClient
        tier={tier}
        locale="pt-BR"
        clientToken="test_token"
        paddleEnvironment="sandbox"
        appUrl="https://medevo-clone.vercel.app"
        user={{ id: "user-1", email: "student@example.test" }}
        checkoutCustomData={{
          app_user_id: "user-1",
          app_user_signature: "signed-user-1",
        }}
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
        "R$ 499,00",
      ),
    );
    expect(preview).toHaveBeenCalledWith({
      items: [
        { priceId: "pri_month", quantity: 1 },
        { priceId: "pri_year", quantity: 1 },
      ],
    });
    await user.click(screen.getByRole("radio", { name: "month" }));
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
      "R$ 49,90",
    );
    await user.click(screen.getByRole("button", { name: "subscribe" }));
    await waitFor(() =>
      expect(open).toHaveBeenCalledWith({
        items: [{ priceId: "pri_month", quantity: 1 }],
        customer: { email: "student@example.test" },
        customData: {
          app_user_id: "user-1",
          app_user_signature: "signed-user-1",
        },
        settings: {
          displayMode: "overlay",
          variant: "one-page",
          successUrl: "https://medevo-clone.vercel.app/welcome",
          locale: "pt",
        },
      }),
    );
  });
});
