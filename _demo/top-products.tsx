import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const topProducts = [
  { name: "Amul Milk 1L", sales: 450, revenue: "₹22,500", trend: "up" },
  { name: "Maggi Noodles", sales: 380, revenue: "₹7,600", trend: "up" },
  { name: "Britannia Bread", sales: 320, revenue: "₹8,960", trend: "down" },
  { name: "Tata Salt 1kg", sales: 290, revenue: "₹6,380", trend: "up" },
  { name: "Parle-G Biscuits", sales: 275, revenue: "₹2,750", trend: "up" },
]

export function TopProducts() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performing Products</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topProducts.map((product, index) => (
            <div key={product.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">{product.sales} units sold</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">{product.revenue}</p>
                <Badge variant={product.trend === "up" ? "default" : "destructive"}>
                  {product.trend === "up" ? "↗" : "↘"} {product.trend === "up" ? "+12%" : "-5%"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
