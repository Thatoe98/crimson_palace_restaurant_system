const IMAGE_MAP: Record<string, string> = {
  "Anchovies (Italian Anchovie, Capers, Black Olive)": "Anchovies (Italian Anchovie, Capers, Black Olive).jpg",
  "Baby Face (White Sauce, Minced Beef, Black Olives, Rocket Salad)": "Baby Face (White Sauce, Minced Beef, Black Olives, Rocket Salad).webp",
  "Beef Tenderloin & Gravy": "Beef Tenderloin & Gravy.jpg",
  "Beirut (Hummus, Chicken Kofta, Pita & Condiments)": "Beirut (Hummus, Chicken Kofta, Pita & Condiments).jpg",
  "Boneless Fried Chicken": "Boneless Fried Chicken.jpg",
  "Brownie & Vanilla Ice Cream": "Brownie & Vanilla Ice Cream.jpg",
  "Buffalo Bill (Beef Tenderloin, Bell Pepper, Onion, Garlic, Rocket Salad)": "Buffalo Bill (Beef Tenderloin, Bell Pepper, Onion, Garlic, Rocket Salad).jpg",
  "Catena Cabernet Sauvignon (Bottle)": "Catena Cabernet Sauvignon (Bottle).jpg",
  "Chicken Schnitzel II (Creamy Spinach, Fries, Pink Tartar Sauce)": "Chicken Schnitzel II (Creamy Spinach, Fries, Pink Tartar Sauce).jpg",
  "Chicken Wings": "Chicken Wings.jpg",
  "Chocolate Mousse": "Chocolate Mousse.jpg",
  "Chum-Churum Original Soju (0.36L)": "Chum-Churum Original Soju (0.36L).webp",
  "Coca-Cola": "Coca-Cola.jpg",
  "Cucumber & Sesame Oil": "Cucumber & Sesame Oil.jpg",
  "Dried Beef Jerky (Myanmar Style)": "Dried Beef Jerky (Myanmar Style).jpg",
  "Fish and Chips (Fried Seabass, Fries, Pink Tartar Sauce)": "Fish and Chips (Fried Seabass, Fries, Pink Tartar Sauce).jpg",
  "French Stew & Steamed Potato (Slow Cooked Beef Tongue, Red Wine Sauce)": "French Stew & Steamed Potato (Slow Cooked Beef Tongue, Red Wine Sauce).jpg",
  "Fry'kin Platter (Wings, Samosa, Spring Rolls, Bayarkyaw, Corn Tempura)": "Fry_kin Platter (Wings, Samosa, Spring Rolls, Bayarkyaw, Corn Tempura).jpg",
  "Gin & Tonic": "Gin & Tonic.jpg",
  "Glenfiddich 12 (Glass)": "Glenfiddich 12 (Glass).jpg",
  "Glenfiddich 15 (Glass)": "Glenfiddich 15 (Glass).webp",
  "Gluten-Free-Vege-Pizza": "Gluten-Free-Vege-Pizza.jpg",
  "Greek Bruschetta (Ricotta, Tomato, Onion, Black Olive & Pesto)": "Greek Bruschetta (Ricotta, Tomato, Onion, Black Olive & Pesto).jpg",
  "Havana (Chicken, Corn, Coriander & Mixed Chillies)": "Havana (Chicken, Corn, Coriander & Mixed Chillies).jpg",
  "Heineken (Bottle)": "Heineken (Bottle).png",
  "Heineken (Draught 50cl)": "Heineken (Draught 50cl).jpg",
  "Hoegaarden (Bottle)": "Hoegaarden (Bottle).jpg",
  "Hokkaido (Salmon, Prawn, Onion, Garlic, Pesto)": "Hokkaido (Salmon, Prawn, Onion, Garlic, Pesto).webp",
  "House Red Wine (Glass)": "House Red Wine (Glass).jpg",
  "Jack Daniel's (Glass)": "Jack Daniel_s (Glass).jpeg",
  "Jägermeister (Shot)": "Jägermeister (Shot).jpg",
  "Long Island Iced Tea": "Long Island Iced Tea.jpg",
  "Margherita (Tomato Sauce, Cheese & Basil)": "Margherita (Tomato Sauce, Cheese & Basil).jpg",
  "Mauritius (Mixed Seafood, Pesto, Garlic & Black Olive)": "Mauritius (Mixed Seafood, Pesto, Garlic & Black Olive).jpg",
  "Mini Veggie (Mixed Veggie, Black Olive & Pesto)": "Mini Veggie (Mixed Veggie, Black Olive & Pesto).jpg",
  "Mixed Veggie (Bell Pepper, Spinach, Onion, Tomato, Corn, Black Olive, Pesto)": "Mixed Veggie (Bell Pepper, Spinach, Onion, Tomato, Corn, Black Olive, Pesto).jpg",
  "Mojito": "Mojito.webp",
  "Mont Blanc (Pork Ham, Bacon, Parmesan, Rocket Salad)": "Mont Blanc (Pork Ham, Bacon, Parmesan, Rocket Salad).jpeg",
  "Olivia (Onion, Garlic & Black Olive)": "Olivia (Onion, Garlic & Black Olive).jpg",
  "Plain Milk": "Plain Milk.jpg",
  "Potato Fries": "Potato Fries.jpg",
  "Rio (Beef, Onion, Garlic, Black Pepper & Mixed Chillies)": "Rio (Beef, Onion, Garlic, Black Pepper & Mixed Chillies).jpg",
  "Salmon Salt & Pepper": "Salmon Salt & Pepper.jpg",
  "Seafood (Mixed Seafood, Pesto, Garlic, Black Olive)": "Seafood (Mixed Seafood, Pesto, Garlic, Black Olive).jpg",
  "Smoked Pork Belly": "Smoked Pork Belly.jpg",
  "Tiger (Draught 50cl)": "Tiger (Draught 50cl).jpg",
  "Tiger Crystal (Bottle)": "Tiger Crystal (Bottle).jpg",
  "Whisky Sour": "Whisky Sour.jpg",
  "White Mushroom (White Sauce, Mixed Mushroom, Rocket Salad)": "White Mushroom (White Sauce, Mixed Mushroom, Rocket Salad).jpg",
  "Yangon Eggplant Bruschetta (Eggplant, Tomato, Onion, Garlic, Coriander & Sesame Oil)": "Yangon Eggplant Bruschetta (Eggplant, Tomato, Onion, Garlic, Coriander & Sesame Oil).jpg",
  "Yan'kin House (Chicken, Pesto, Black Olive, Rocket Salad)": "Yan_kin House (Chicken, Pesto, Black Olive, Rocket Salad).jpg",
}

export function getMenuImageUrl(name: string): string | null {
  const direct = IMAGE_MAP[name]
  if (direct) return `/menu-images/${encodeURIComponent(direct)}`

  const normalized = name.replace(/_/g, "'")
  const fuzzy = IMAGE_MAP[normalized]
  if (fuzzy) return `/menu-images/${encodeURIComponent(fuzzy)}`

  return null
}