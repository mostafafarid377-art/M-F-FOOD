export const SAMPLE_MENU_ITEMS = [
  {
    id: "1",
    name: "Classic Burger",
    description: "Juicy beef patty with lettuce, tomato, and special sauce",
    price: 1250, // 12.50 EGP in piastres
    image: "/placeholder-food.jpg",
    isAvailable: true,
    categoryId: "burgers",
    modifiers: [
      {
        id: "1",
        option_id: "1",
        option_name: "Add Cheese",
        price_delta: 50,
      },
      {
        id: "2",
        option_id: "2",
        option_name: "Extra Patty",
        price_delta: 200,
      },
    ],
  },
  {
    id: "2",
    name: "Margherita Pizza",
    description: "Fresh mozzarella, tomato sauce, and basil",
    price: 1800, // 18.00 EGP in piastres
    image: "/placeholder-food.jpg",
    isAvailable: true,
    categoryId: "pizzas",
    modifiers: [
      {
        id: "3",
        option_id: "3",
        option_name: "Extra Toppings",
        price_delta: 100,
      },
      {
        id: "4",
        option_id: "4",
        option_name: "Pepperoni",
        price_delta: 150,
      },
    ],
  },
  {
    id: "3",
    name: "Caesar Salad",
    description: "Romaine lettuce, parmesan, croutons, and Caesar dressing",
    price: 950, // 9.50 EGP in piastres
    image: "/placeholder-food.jpg",
    isAvailable: true,
    categoryId: "salads",
  },
  {
    id: "4",
    name: "Spaghetti Bolognese",
    description: "Pasta with slow-cooked meat sauce and parmesan",
    price: 1500, // 15.00 EGP in piastres
    image: "/placeholder-food.jpg",
    isAvailable: true,
    categoryId: "pastas",
    modifiers: [
      {
        id: "5",
        option_id: "5",
        option_name: "Add Parmesan",
        price_delta: 30,
      },
    ],
  },
  {
    id: "5",
    name: "Chicken Wrap",
    description: "Grilled chicken with lettuce and sauce in a warm wrap",
    price: 1100, // 11.00 EGP in piastres
    image: "/placeholder-food.jpg",
    isAvailable: true,
    categoryId: "wraps",
  },
  {
    id: "6",
    name: "Fruit Smoothie",
    description: "Fresh blended seasonal fruits",
    price: 750, // 7.50 EGP in piastres
    image: "/placeholder-food.jpg",
    isAvailable: true,
    categoryId: "drinks",
  },
];

export const SAMPLE_MENU_CATEGORIES = [
  { id: "burgers", name: "Burgers", isVisible: true },
  { id: "pizzas", name: "Pizzas", isVisible: true },
  { id: "salads", name: "Salads", isVisible: true },
  { id: "pastas", name: "Pastas", isVisible: true },
  { id: "wraps", name: "Wraps", isVisible: true },
  { id: "drinks", name: "Drinks", isVisible: true },
];