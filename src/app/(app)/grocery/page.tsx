"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ShoppingCart, Copy, ExternalLink, Package } from "lucide-react";
import { toast } from "sonner";

interface GroceryItem {
  id: string;
  name: string;
  quantity: string;
  price: number;
  checked: boolean;
}

interface GroceryCategory {
  id: string;
  name: string;
  emoji: string;
  items: GroceryItem[];
}

const MOCK_DATA: GroceryCategory[] = [
  {
    id: "produce",
    name: "Produce",
    emoji: "\ud83e\udd66",
    items: [
      { id: "p1", name: "Mixed Berries", quantity: "2 cups", price: 6.99, checked: false },
      { id: "p2", name: "Apples", quantity: "4", price: 3.99, checked: false },
      { id: "p3", name: "Bananas", quantity: "6", price: 1.99, checked: false },
      { id: "p4", name: "Broccoli", quantity: "2 heads", price: 3.49, checked: false },
      { id: "p5", name: "Sweet Potatoes", quantity: "4", price: 4.99, checked: false },
      { id: "p6", name: "Spinach", quantity: "1 bag", price: 3.49, checked: false },
      { id: "p7", name: "Mixed Salad Greens", quantity: "2 bags", price: 5.98, checked: false },
      { id: "p8", name: "Cherry Tomatoes", quantity: "1 pint", price: 3.99, checked: false },
      { id: "p9", name: "Cucumber", quantity: "2", price: 1.99, checked: false },
      { id: "p10", name: "Bell Peppers", quantity: "3", price: 3.99, checked: false },
      { id: "p11", name: "Avocados", quantity: "3", price: 4.49, checked: false },
      { id: "p12", name: "Lemons", quantity: "4", price: 2.99, checked: false },
    ],
  },
  {
    id: "protein",
    name: "Protein",
    emoji: "\ud83c\udf57",
    items: [
      { id: "pr1", name: "Salmon Fillets", quantity: "4 x 170g", price: 18.99, checked: false },
      { id: "pr2", name: "Chicken Breast", quantity: "1 kg", price: 9.99, checked: false },
      { id: "pr3", name: "Eggs", quantity: "1 dozen", price: 4.99, checked: false },
      { id: "pr4", name: "Chickpeas", quantity: "2 cans", price: 2.99, checked: false },
      { id: "pr5", name: "Greek Yogurt", quantity: "large", price: 6.49, checked: false },
    ],
  },
  {
    id: "pantry",
    name: "Pantry",
    emoji: "\ud83e\udee7",
    items: [
      { id: "pa1", name: "Quinoa", quantity: "1 bag", price: 5.99, checked: false },
      { id: "pa2", name: "Brown Rice", quantity: "1 bag", price: 3.99, checked: false },
      { id: "pa3", name: "Olive Oil", quantity: "bottle", price: 7.99, checked: false },
      { id: "pa4", name: "Almond Butter", quantity: "jar", price: 8.99, checked: false },
      { id: "pa5", name: "Honey", quantity: "bottle", price: 6.99, checked: false },
      { id: "pa6", name: "Tahini", quantity: "jar", price: 5.99, checked: false },
      { id: "pa7", name: "Granola", quantity: "bag", price: 4.99, checked: false },
    ],
  },
  {
    id: "dairy",
    name: "Dairy & Alternatives",
    emoji: "\ud83e\udd5b",
    items: [
      { id: "d1", name: "Feta Cheese", quantity: "block", price: 4.99, checked: false },
      { id: "d2", name: "Hummus", quantity: "tub", price: 3.99, checked: false },
      { id: "d3", name: "Oat Milk", quantity: "carton", price: 4.49, checked: false },
    ],
  },
  {
    id: "snacks",
    name: "Snacks",
    emoji: "\ud83c\udf30",
    items: [
      { id: "s1", name: "Mixed Nuts", quantity: "bag", price: 7.99, checked: false },
      { id: "s2", name: "Dark Chocolate", quantity: "85%", price: 3.49, checked: false },
    ],
  },
];

export default function GroceryPage() {
  const [categories, setCategories] = useState<GroceryCategory[]>(MOCK_DATA);

  const toggleItem = (categoryId: string, itemId: string) => {
    setCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              items: category.items.map((item) =>
                item.id === itemId ? { ...item, checked: !item.checked } : item
              ),
            }
          : category
      )
    );
  };

  const uncheckedItems = categories.flatMap((cat) =>
    cat.items.filter((item) => !item.checked).map((item) => ({ ...item, category: cat.name }))
  );

  const totalCost = uncheckedItems.reduce((sum, item) => sum + item.price, 0);
  const totalItems = uncheckedItems.length;

  const copyList = () => {
    const listText = categories
      .map((category) => {
        const unchecked = category.items.filter((item) => !item.checked);
        if (unchecked.length === 0) return "";
        return `${category.emoji} ${category.name}:\n${unchecked
          .map((item) => `- ${item.name} (${item.quantity}) - $${item.price.toFixed(2)}`)
          .join("\n")}`;
      })
      .filter(Boolean)
      .join("\n\n");

    const fullText = `Grocery List - Week of Jan 13 - Jan 19\n\n${listText}\n\nTotal: $${totalCost.toFixed(2)} (${totalItems} items)`;

    navigator.clipboard.writeText(fullText);
    toast.success("Grocery list copied to clipboard!");
  };

  const orderOnInstacart = () => {
    if (uncheckedItems.length === 0) {
      toast.error("No items to order!");
      return;
    }

    const firstItem = uncheckedItems[0];
    const searchTerm = encodeURIComponent(firstItem.name);
    const instacartUrl = `https://www.instacart.com/store/partner/products/search?search_term=${searchTerm}`;

    window.open(instacartUrl, "_blank");

    toast.success(`Opening Instacart for "${firstItem.name}"`, {
      description: `${totalItems} items ready to order`,
    });
  };

  return (
    <div className="page-enter min-h-screen bg-[#faf8f4] pb-32">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a3a2a]/5">
                  <ShoppingCart className="h-5 w-5 text-[#1a3a2a]" />
                </div>
                <h1 className="font-display text-4xl text-[#1a3a2a]">Grocery Cart</h1>
              </div>
              <p className="text-[#1a3a2a]/40">The feature ZOE never built</p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge variant="outline" className="border-[#1a3a2a]/15 bg-[#1a3a2a]/5 text-[#1a3a2a]">
                Week of Jan 13 - Jan 19
              </Badge>
              <Badge variant="outline" className="border-[#d4520a]/20 bg-[#d4520a]/5 text-[#d4520a] font-display text-lg px-3 py-1">
                ${totalCost.toFixed(2)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-5 mb-8">
          {categories.map((category) => {
            const categoryUnchecked = category.items.filter((item) => !item.checked).length;

            return (
              <Card key={category.id} className="rounded-2xl p-6 border-0 bg-white shadow-md ring-1 ring-black/[0.04] hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-xl text-[#1a3a2a] flex items-center gap-2">
                    <span className="text-2xl">{category.emoji}</span>
                    {category.name}
                  </h2>
                  {categoryUnchecked > 0 && (
                    <Badge variant="secondary" className="bg-[#faf8f4] text-[#1a3a2a]/60 ring-1 ring-black/[0.04]">
                      {categoryUnchecked} items
                    </Badge>
                  )}
                </div>

                <div className="space-y-1">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                        item.checked
                          ? "bg-[#faf8f4]/50 opacity-50"
                          : "hover:bg-[#faf8f4]/50"
                      }`}
                    >
                      <Checkbox
                        id={item.id}
                        checked={item.checked}
                        onCheckedChange={() => toggleItem(category.id, item.id)}
                        className="h-5 w-5"
                      />
                      <label
                        htmlFor={item.id}
                        className="flex-1 flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium text-sm ${
                              item.checked ? "line-through text-[#1a3a2a]/30" : "text-[#1a3a2a]"
                            }`}
                          >
                            {item.name}
                          </span>
                          <span
                            className={`text-xs ${
                              item.checked ? "text-[#1a3a2a]/20" : "text-[#1a3a2a]/35"
                            }`}
                          >
                            ({item.quantity})
                          </span>
                        </div>
                        <span
                          className={`font-semibold text-sm ${
                            item.checked ? "line-through text-[#1a3a2a]/20" : "text-[#1a3a2a]"
                          }`}
                        >
                          ${item.price.toFixed(2)}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Copy List Button */}
        <div className="flex justify-center mb-8">
          <Button
            variant="outline"
            size="lg"
            onClick={copyList}
            className="gap-2 rounded-xl border-[#1a3a2a]/15 hover:bg-[#1a3a2a]/5"
          >
            <Copy className="h-5 w-5" />
            Copy List
          </Button>
        </div>
      </div>

      {/* Sticky Bottom Summary Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#e7e2da] shadow-[0_-8px_32px_-4px_rgba(0,0,0,0.08)]">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-[#1a3a2a]/50" />
                <span className="font-medium text-[#1a3a2a]">
                  {totalItems} {totalItems === 1 ? "item" : "items"} remaining
                </span>
              </div>
              <div className="font-display text-2xl text-[#1a3a2a]">
                ${totalCost.toFixed(2)}
              </div>
            </div>

            <Button
              size="lg"
              onClick={orderOnInstacart}
              disabled={totalItems === 0}
              className="rounded-xl bg-[#1a3a2a] hover:bg-[#1a3a2a]/90 text-white gap-2 px-8 shadow-lg shadow-[#1a3a2a]/20 transition-all disabled:opacity-50"
            >
              <ExternalLink className="h-5 w-5" />
              Order on Instacart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
