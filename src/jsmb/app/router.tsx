import { lazy, Suspense } from "react";
import { createHashRouter, Navigate } from "react-router-dom";
import Shell from "./Shell";
import { RouteError } from "./RouteError";
import { RouteFallback } from "./RouteFallback";
import { CommandCentre } from "../features/command";

/**
 * Hash routing is deliberate, not a shortcut: the prototype has to survive
 * being opened straight off disk at a prospect's office with no server and no
 * network, and every deep link has to keep working.
 *
 * The route table is fixed in CONTRACT.md §6 — feature slices mount into it,
 * they do not add to it.
 *
 * Splitting: the command centre is the landing route and stays in the main
 * bundle. Everything else is lazy, which keeps recharts — by far the heaviest
 * dependency, and used only by the admin modules — out of first paint. The
 * BRD asks for ≤3 s on 4G (NFR-03); shipping the whole admin portal to someone
 * opening the storefront would spend that budget on screens they never see.
 */
const lazyPage = <K extends string>(
  loader: () => Promise<Record<K, React.ComponentType>>,
  name: K,
) => lazy(async () => ({ default: (await loader())[name] }));

const storefront = () => import("../features/storefront");
const admin = () => import("../features/admin");
const agentops = () => import("../features/agentops");

const ShopHome = lazyPage(storefront, "ShopHome");
const Catalogue = lazyPage(storefront, "Catalogue");
const ProductDetail = lazyPage(storefront, "ProductDetail");
const Cart = lazyPage(storefront, "Cart");
const Checkout = lazyPage(storefront, "Checkout");
const Confirmation = lazyPage(storefront, "Confirmation");
const Account = lazyPage(storefront, "Account");
const Enquiry = lazyPage(storefront, "Enquiry");

const AdminDashboard = lazyPage(admin, "AdminDashboard");
const AdminCustomers = lazyPage(admin, "AdminCustomers");
const AdminSales = lazyPage(admin, "AdminSales");
const AdminEmployees = lazyPage(admin, "AdminEmployees");
const AdminPnl = lazyPage(admin, "AdminPnl");
const AdminEnquiries = lazyPage(admin, "AdminEnquiries");
const AdminSettings = lazyPage(admin, "AdminSettings");

const AgentOps = lazyPage(agentops, "AgentOps");
const AgentDetail = lazyPage(agentops, "AgentDetail");

/** Wraps a lazy route so a chunk fetch never flashes an empty screen. */
function page(element: React.ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

export const router = createHashRouter([
  {
    path: "/",
    element: <Shell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <CommandCentre /> },

      { path: "agents", element: page(<AgentOps />) },
      { path: "agents/:agentId", element: page(<AgentDetail />) },

      { path: "shop", element: page(<ShopHome />) },
      { path: "shop/catalogue", element: page(<Catalogue />) },
      { path: "shop/product/:code", element: page(<ProductDetail />) },
      { path: "shop/cart", element: page(<Cart />) },
      { path: "shop/checkout", element: page(<Checkout />) },
      { path: "shop/confirmation", element: page(<Confirmation />) },
      { path: "shop/account", element: page(<Account />) },
      { path: "shop/enquiry", element: page(<Enquiry />) },

      { path: "admin", element: page(<AdminDashboard />) },
      { path: "admin/customers", element: page(<AdminCustomers />) },
      { path: "admin/sales", element: page(<AdminSales />) },
      { path: "admin/employees", element: page(<AdminEmployees />) },
      { path: "admin/pnl", element: page(<AdminPnl />) },
      { path: "admin/enquiries", element: page(<AdminEnquiries />) },
      { path: "admin/settings", element: page(<AdminSettings />) },

      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
