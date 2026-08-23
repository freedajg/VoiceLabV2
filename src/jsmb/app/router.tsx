import { createHashRouter, Navigate } from "react-router-dom";
import Shell from "./Shell";
import { RouteError } from "./RouteError";
import {
  ShopHome,
  Catalogue,
  ProductDetail,
  Cart,
  Checkout,
  Confirmation,
  Account,
  Enquiry,
} from "../features/storefront";
import {
  AdminDashboard,
  AdminCustomers,
  AdminSales,
  AdminEmployees,
  AdminPnl,
  AdminEnquiries,
  AdminSettings,
} from "../features/admin";
import { CommandCentre } from "../features/command";
import { AgentOps, AgentDetail } from "../features/agentops";

/**
 * Hash routing is deliberate, not a shortcut: the prototype has to survive
 * being opened straight off disk at a prospect's office with no server and no
 * network, and every deep link has to keep working.
 *
 * The route table is fixed in CONTRACT.md §6 — feature slices mount into it,
 * they do not add to it.
 */
export const router = createHashRouter([
  {
    path: "/",
    element: <Shell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <CommandCentre /> },

      { path: "agents", element: <AgentOps /> },
      { path: "agents/:agentId", element: <AgentDetail /> },

      { path: "shop", element: <ShopHome /> },
      { path: "shop/catalogue", element: <Catalogue /> },
      { path: "shop/product/:code", element: <ProductDetail /> },
      { path: "shop/cart", element: <Cart /> },
      { path: "shop/checkout", element: <Checkout /> },
      { path: "shop/confirmation", element: <Confirmation /> },
      { path: "shop/account", element: <Account /> },
      { path: "shop/enquiry", element: <Enquiry /> },

      { path: "admin", element: <AdminDashboard /> },
      { path: "admin/customers", element: <AdminCustomers /> },
      { path: "admin/sales", element: <AdminSales /> },
      { path: "admin/employees", element: <AdminEmployees /> },
      { path: "admin/pnl", element: <AdminPnl /> },
      { path: "admin/enquiries", element: <AdminEnquiries /> },
      { path: "admin/settings", element: <AdminSettings /> },

      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
