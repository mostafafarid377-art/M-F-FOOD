import type { Category, MenuItem } from "./types";

/**
 * Bundled sample data — used in demo mode (no Supabase env vars) and as a
 * resilient fallback. IDs intentionally match supabase/seed.sql so carts
 * built from sample data remain valid when a database is connected.
 *
 * Prices are integer piastres (100 piastres = 1 EGP).
 */

export const SAMPLE_CATEGORIES: Category[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Burgers",
    description: "Flame-grilled beef & chicken burgers",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Pizzas",
    description: "Wood-fired, hand-stretched dough",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    name: "Salads",
    description: "Fresh greens & house dressings",
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    name: "Pastas",
    description: "Classic Italian comfort",
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    name: "Wraps",
    description: "Grilled & rolled to go",
  },
  {
    id: "00000000-0000-4000-8000-000000000006",
    name: "Drinks",
    description: "Fresh juices & soft drinks",
  },
];

export const SAMPLE_MENU_ITEMS: MenuItem[] = [
  {
    id: "00000000-0000-4000-8000-100000000001",
    name: "Classic Beef Burger",
    description:
      "Juicy flame-grilled beef patty, cheddar, lettuce, tomato and our house sauce in a toasted brioche bun.",
    price: 12500, // £125.00
    image: "/images/burger.jpg",
    isAvailable: true,
    categoryId: "00000000-0000-4000-8000-000000000001",
  },
  {
    id: "00000000-0000-4000-8000-100000000002",
    name: "Margherita Pizza",
    description:
      "Wood-fired pizza with San Marzano tomato sauce, fresh mozzarella and basil.",
    price: 18000, // £180.00
    image: "/images/pizza.jpg",
    isAvailable: true,
    categoryId: "00000000-0000-4000-8000-000000000002",
  },
  {
    id: "00000000-0000-4000-8000-100000000003",
    name: "Caesar Salad",
    description:
      "Crisp romaine, grilled chicken strips, parmesan shavings, croutons and creamy Caesar dressing.",
    price: 9500, // £95.00
    image: "/images/salad.jpg",
    isAvailable: true,
    categoryId: "00000000-0000-4000-8000-000000000003",
  },
  {
    id: "00000000-0000-4000-8000-100000000004",
    name: "Chicken Alfredo Pasta",
    description:
      "Fettuccine tossed in a rich parmesan cream sauce with grilled chicken and cracked black pepper.",
    price: 14500, // £145.00
    image: "/images/pasta.jpg",
    isAvailable: true,
    categoryId: "00000000-0000-4000-8000-000000000004",
  },
  {
    id: "00000000-0000-4000-8000-100000000005",
    name: "Grilled Chicken Wrap",
    description:
      "Marinated grilled chicken, garlic sauce, pickles and fries rolled in toasted saj bread.",
    price: 8500, // £85.00
    image: "/images/wrap.jpg",
    isAvailable: true,
    categoryId: "00000000-0000-4000-8000-000000000005",
  },
  {
    id: "00000000-0000-4000-8000-100000000006",
    name: "Fresh Orange Juice",
    description: "Freshly squeezed Egyptian oranges — no added sugar, served chilled.",
    price: 4500, // £45.00
    image: "/images/juice.jpg",
    isAvailable: true,
    categoryId: "00000000-0000-4000-8000-000000000006",
  },
];
