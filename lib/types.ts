// Shared domain types — ported from purewaterbot/models.py

export type Category =
  | "Fast Food"
  | "Sauce"
  | "Lassi"
  | "Burger"
  | "Soup"
  | "Dessert";

/** A product as stored in Supabase `menu`. price is in RUPEES (e.g. 240). */
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
  description: string;
  tags: string[];
}

/** A line in the user's cart (lives on the session, mirrored to Supabase). */
export interface CartItem {
  menu_item_id: string;
  quantity: number;
  notes: string;
}

/** A priced-out cart line returned by get_cart_details. */
export interface CartDetailLine {
  id: string;
  name: string;
  quantity: number;
  notes: string;
  unit_price_cents: number;
  line_total_cents: number;
}

export interface CartDetails {
  success: boolean;
  currency: string;
  address: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  items: CartDetailLine[];
  total_cents: number;
  total_formatted: string;
}

export type OrderStatus =
  | "pending_payment"
  | "new"
  | "preparing"
  | "dispatched"
  | "cancelled";

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  notes: string;
  unit_price_cents: number;
  line_total_cents: number;
}

export interface Order {
  id: string;
  user_id: string;
  created_at: string;
  currency: string;
  address: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  archived?: boolean;
  items: OrderItem[];
  total_cents: number;
  total_formatted: string;
  status: OrderStatus;
  payment_screenshot: string | null;
  paid_at?: string | null;
  receipt_url?: string | null;
}

/** Standard return shape of every agent tool (mirrors actions.py dicts). */
export interface ToolResult {
  success: boolean;
  message?: string;
  status?: string;
  order_id?: string;
  [key: string]: unknown;
}
