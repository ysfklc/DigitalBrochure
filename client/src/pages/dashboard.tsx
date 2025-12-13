import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { BarChart3, Package, FileText, Megaphone, Plus, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const campaignData = [
  { month: "Jan", campaigns: 4 },
  { month: "Feb", campaigns: 6 },
  { month: "Mar", campaigns: 8 },
  { month: "Apr", campaigns: 12 },
  { month: "May", campaigns: 15 },
  { month: "Jun", campaigns: 18 },
];

const productUsageData = [
  { name: "Electronics", value: 35 },
  { name: "Clothing", value: 28 },
  { name: "Food", value: 20 },
  { name: "Home", value: 17 },
];

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

export default function DashboardPage() {
  const { t } = useTranslation();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const statsCards = [
    {
      title: t("dashboard.totalCampaigns"),
      value: stats?.totalCampaigns ?? 24,
      change: "+12%",
      trend: "up",
      icon: Megaphone,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      title: t("dashboard.activeCampaigns"),
      value: stats?.activeCampaigns ?? 8,
      change: "+5%",
      trend: "up",
      icon: BarChart3,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      title: t("dashboard.totalProducts"),
      value: stats?.totalProducts ?? 156,
      change: "+23",
      trend: "up",
      icon: Package,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
    {
      title: t("dashboard.totalTemplates"),
      value: stats?.totalTemplates ?? 42,
      change: "-2%",
      trend: "down",
      icon: FileText,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
  ];

  const recentActivity = [
    { id: 1, action: "Created campaign", item: "Summer Sale 2024", time: "2 hours ago", type: "campaign" },
    { id: 2, action: "Added product", item: "Premium Headphones", time: "5 hours ago", type: "product" },
    { id: 3, action: "Updated template", item: "Modern Catalog", time: "1 day ago", type: "template" },
    { id: 4, action: "Published campaign", item: "Holiday Special", time: "2 days ago", type: "campaign" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground">{t("dashboard.welcome")}</p>
        </div>
        <div className="flex gap-3">
          <Button asChild data-testid="button-create-campaign">
            <Link href="/campaigns/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("dashboard.createCampaign")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-md ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{stat.value}</span>
                  <span
                    className={`text-sm flex items-center ${
                      stat.trend === "up" ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {stat.trend === "up" ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {stat.change}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.campaignStats")}</CardTitle>
            <CardDescription>Campaigns created over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={campaignData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="campaigns"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.productUsage")}</CardTitle>
            <CardDescription>Product categories used in campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productUsageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {productUsageData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {productUsageData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>{t("dashboard.recentActivity")}</CardTitle>
              <CardDescription>Latest actions in your workspace</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/campaigns">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-md bg-muted">
                      {activity.type === "campaign" && <Megaphone className="h-4 w-4" />}
                      {activity.type === "product" && <Package className="h-4 w-4" />}
                      {activity.type === "template" && <FileText className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">{activity.item}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.quickActions")}</CardTitle>
            <CardDescription>Get started quickly</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/campaigns/new">
                <Megaphone className="mr-3 h-4 w-4" />
                {t("dashboard.createCampaign")}
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/products/new">
                <Package className="mr-3 h-4 w-4" />
                {t("dashboard.addProduct")}
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/templates">
                <FileText className="mr-3 h-4 w-4" />
                {t("dashboard.viewTemplates")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
