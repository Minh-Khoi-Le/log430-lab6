/**
 * Dashboard Page for Admin Users
 *
 * This page provides an overview dashboard for admin users
 * with system statistics and management tools.
 * Kong API Gateway Integration:
 * - GET /dashboard/stats -> catalog-service (requires authentication)
 */

import React, { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { authenticatedFetch, API_ENDPOINTS } from "../api";
import jsPDF from 'jspdf';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Store as StoreIcon,
  Inventory as InventoryIcon,
  AttachMoney as SalesIcon,
  Assessment as ReportsIcon,
  Assessment as AssessmentIcon,
  FileDownload as FileDownloadIcon,
} from "@mui/icons-material";

// Sample stats fallback data
const sampleStats = {
  totalStores: 3,
  totalProducts: 25,
  totalSales: 1,
  totalRevenue: 99.96,
  pendingRefunds: 0,
  totalRefunds: 1,
  totalRefundAmount: 99.96,
  averageOrderValue: 99.96,
  refundRate: 100,
  netRevenue: 0,
  topPerformingStore: { storeName: "Downtown Store", revenue: 99.96 },
  storePerformanceData: [
    {
      storeId: 1,
      storeName: "Downtown Store",
      totalSales: 1,
      revenue: 99.96,
      totalRefunds: 1,
      refundAmount: 99.96,
      netRevenue: 0,
      revenuePercentage: 100,
      refundRate: 100,
    },
  ],
  salesByStore: [
    {
      storeId: 1,
      storeName: "Downtown Store",
      totalSales: 1,
      revenue: 99.96,
      totalRefunds: 1,
      refundAmount: 99.96,
      netRevenue: 0,
    },
  ],
};

function Dashboard() {
  const { user } = useUser();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    if (user?.token) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user?.token) {
      setError("Authentication required to view dashboard data.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Try to fetch dashboard data from API, fallback to sample data
      try {
        console.log("Fetching dashboard data via Kong Gateway...");

        // Fetch actual data from multiple endpoints
        const [
          salesResponse,
          storesResponse,
          productsResponse,
          refundsResponse,
        ] = await Promise.all([
          authenticatedFetch(API_ENDPOINTS.SALES.BASE, user.token).catch(
            (err) => {
              console.warn("Sales API error:", err);
              return { data: [] };
            }
          ),
          authenticatedFetch(API_ENDPOINTS.STORES.BASE, user.token).catch(
            (err) => {
              console.warn("Stores API error:", err);
              return { data: [] };
            }
          ),
          authenticatedFetch(API_ENDPOINTS.PRODUCTS.BASE, user.token).catch(
            (err) => {
              console.warn("Products API error:", err);
              return { data: [] };
            }
          ),
          authenticatedFetch(API_ENDPOINTS.REFUNDS.BASE, user.token).catch(
            (err) => {
              console.warn("Refunds API error:", err);
              return { data: [] };
            }
          ),
        ]);

        // Extract data arrays with better error handling
        let salesData = [];
        if (Array.isArray(salesResponse?.data)) {
          salesData = salesResponse.data;
        } else if (Array.isArray(salesResponse)) {
          salesData = salesResponse;
        }

        let storesData = [];
        if (Array.isArray(storesResponse?.data)) {
          storesData = storesResponse.data;
        } else if (Array.isArray(storesResponse)) {
          storesData = storesResponse;
        }

        // Handle products
        let productsData = [];
        if (Array.isArray(productsResponse)) {
          productsData = productsResponse;
        } else if (Array.isArray(productsResponse?.data)) {
          productsData = productsResponse.data;
        } else if (Array.isArray(productsResponse?.data?.products)) {
          productsData = productsResponse.data.products;
        } else if (Array.isArray(productsResponse?.products)) {
          productsData = productsResponse.products;
        }

        // Calculate dashboard stats from real data
        const totalStores = storesData.length;
        // Handle productsData
        let totalProducts = 0;
        if (Array.isArray(productsData) && productsData.length > 0) {
          // Count unique products by id, filtering out any invalid entries
          const uniqueProductIds = new Set(
            productsData.filter((p) => p && p.id).map((p) => p.id)
          );
          totalProducts = uniqueProductIds.size;
        }

        const totalSales = salesData.length;
        const totalRevenue = salesData.reduce(
          (sum, sale) => sum + (sale.total || sale.totalAmount || 0),
          0
        );

        // Calculate refunds data from real data
        const refundsData = refundsResponse?.data || refundsResponse || [];
        const pendingRefunds = refundsData.filter(
          (refund) => refund.status === "pending"
        ).length;
        const totalRefunds = refundsData.length;
        const totalRefundAmount = refundsData.reduce(
          (sum, refund) => sum + (refund.total || refund.refundAmount || 0),
          0
        );

        // Create store map for aggregation
        const storeMap = {};
        storesData.forEach((store) => {
          storeMap[store.id] = store.name;
        });

        // Aggregate sales by store
        const storeStats = {};
        salesData.forEach((sale) => {
          const storeId = sale.storeId;
          if (!storeStats[storeId]) {
            storeStats[storeId] = {
              storeId,
              storeName: storeMap[storeId] || `Store ${storeId}`,
              totalSales: 0,
              revenue: 0,
              totalRefunds: 0,
              refundAmount: 0,
              netRevenue: 0,
            };
          }
          storeStats[storeId].totalSales += 1;
          storeStats[storeId].revenue += sale.total || sale.totalAmount || 0;
        });

        // Aggregate refunds by store
        refundsData.forEach((refund) => {
          const storeId =
            refund.storeId || (refund.sale && refund.sale.storeId);
          if (storeId && storeStats[storeId]) {
            storeStats[storeId].totalRefunds += 1;
            storeStats[storeId].refundAmount +=
              refund.total || refund.refundAmount || 0;
          }
        });

        // Calculate net revenue for each store
        Object.values(storeStats).forEach((store) => {
          store.netRevenue = store.revenue - store.refundAmount;
        });

        // Add stores with no sales
        storesData.forEach((store) => {
          if (!storeStats[store.id]) {
            storeStats[store.id] = {
              storeId: store.id,
              storeName: store.name,
              totalSales: 0,
              revenue: 0,
              totalRefunds: 0,
              refundAmount: 0,
              netRevenue: 0,
            };
          }
        });

        const salesByStore = Object.values(storeStats);

        const realDashboardData = {
          totalStores,
          totalProducts,
          totalSales,
          totalRevenue,
          pendingRefunds,
          totalRefunds,
          totalRefundAmount,
          salesByStore,
          // Add analytics data for charts
          averageOrderValue: totalSales > 0 ? totalRevenue / totalSales : 0,
          refundRate: totalSales > 0 ? (totalRefunds / totalSales) * 100 : 0,
          netRevenue: totalRevenue - totalRefundAmount,
          topPerformingStore: salesByStore.reduce(
            (top, store) => (store.revenue > (top?.revenue || 0) ? store : top),
            null
          ),
          storePerformanceData: salesByStore.map((store) => ({
            ...store,
            revenuePercentage:
              totalRevenue > 0 ? (store.revenue / totalRevenue) * 100 : 0,
            refundRate:
              store.totalSales > 0
                ? (store.totalRefunds / store.totalSales) * 100
                : 0,
          })),
        };

        console.log("Real dashboard data:", realDashboardData);
        setStats(realDashboardData);
      } catch (apiError) {
        console.error("Kong Gateway API Error, using sample data:", apiError);
        if (apiError.message.includes("401")) {
          setError("Authentication failed. Please log in again.");
          return;
        } else if (apiError.message.includes("403")) {
          setError(
            "Access denied. You need admin permissions to view dashboard."
          );
          return;
        }
        // Use sample data as fallback for other errors
        setStats({
          ...sampleStats,
          salesByStore: sampleStats.salesByStore,
        });
      }

      setLoading(false);
    } catch (error) {
      setError("Failed to load dashboard data.");
      console.error("Error fetching dashboard data:", error);
      setStats(sampleStats); // Fallback to sample data
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!stats) {
      alert("No data available to generate report");
      return;
    }

    try {
      // Create a new jsPDF instance
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      const margin = 20;
      let yPosition = margin;

      // Helper function to add a new page if needed
      const checkNewPage = (height) => {
        if (yPosition + height > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
      };

      // Header
      pdf.setFontSize(24);
      pdf.setTextColor(25, 118, 210); // Primary blue color
      pdf.text('Sales Performance Report', margin, yPosition);
      yPosition += 15;

      // Date
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      const reportDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      pdf.text(`Generated on ${reportDate}`, margin, yPosition);
      yPosition += 20;

      // Executive Summary
      checkNewPage(40);
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Executive Summary', margin, yPosition);
      yPosition += 10;

      const summaryData = [
        ['Total Stores', stats.totalStores.toString()],
        ['Total Products', stats.totalProducts.toString()],
        ['Total Sales', stats.totalSales.toString()],
        ['Gross Revenue', `$${(stats.totalRevenue || 0).toFixed(2)}`],
        ['Total Refunds', stats.totalRefunds.toString()],
        ['Net Revenue', `$${(stats.netRevenue || 0).toFixed(2)}`]
      ];

      pdf.setFontSize(12);
      summaryData.forEach(([label, value]) => {
        pdf.text(`${label}: ${value}`, margin, yPosition);
        yPosition += 7;
      });

      yPosition += 10;

      // Key Performance Indicators
      checkNewPage(30);
      pdf.setFontSize(16);
      pdf.text('Key Performance Indicators', margin, yPosition);
      yPosition += 10;

      const kpiData = [
        ['Average Order Value', `$${(stats.averageOrderValue || 0).toFixed(2)}`],
        ['Refund Rate', `${(stats.refundRate || 0).toFixed(1)}%`],
        ['Top Performing Store', stats.topPerformingStore?.storeName || 'N/A']
      ];

      pdf.setFontSize(12);
      kpiData.forEach(([label, value]) => {
        pdf.text(`${label}: ${value}`, margin, yPosition);
        yPosition += 7;
      });

      yPosition += 15;

      // Store Performance Table
      if (stats.storePerformanceData && stats.storePerformanceData.length > 0) {
        checkNewPage(60);
        pdf.setFontSize(16);
        pdf.text('Store Performance Analysis', margin, yPosition);
        yPosition += 10;

        // Table headers
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        const tableHeaders = ['Store', 'Sales', 'Revenue', 'Refunds', 'Rate%', 'Net Revenue'];
        const colWidths = [40, 25, 30, 25, 25, 35];
        let xPos = margin;

        // Draw header row
        tableHeaders.forEach((header, index) => {
          pdf.text(header, xPos, yPosition);
          xPos += colWidths[index];
        });
        yPosition += 8;

        // Draw a line under headers
        pdf.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
        yPosition += 3;

        // Table data
        const sortedStores = [...stats.storePerformanceData].sort((a, b) => b.revenue - a.revenue);
        sortedStores.forEach((store) => {
          checkNewPage(8);
          xPos = margin;
          const rowData = [
            store.storeName,
            store.totalSales.toString(),
            `$${store.revenue.toFixed(2)}`,
            store.totalRefunds.toString(),
            `${store.refundRate.toFixed(1)}%`,
            `$${store.netRevenue.toFixed(2)}`
          ];

          rowData.forEach((data, index) => {
            pdf.text(data, xPos, yPosition);
            xPos += colWidths[index];
          });
          yPosition += 6;
        });

        yPosition += 10;
      }

      // Financial Summary
      checkNewPage(40);
      pdf.setFontSize(16);
      pdf.text('Financial Summary', margin, yPosition);
      yPosition += 10;

      const financialData = [
        ['Gross Revenue', `$${(stats.totalRevenue || 0).toFixed(2)}`],
        ['Total Refunds', `-$${(stats.totalRefundAmount || 0).toFixed(2)}`],
        ['Net Revenue', `$${(stats.netRevenue || 0).toFixed(2)}`],
        ['Total Transactions', stats.totalSales.toString()],
        ['Successful Transactions', `${stats.totalSales - stats.totalRefunds} (${((1 - stats.refundRate / 100) * 100).toFixed(1)}%)`]
      ];

      pdf.setFontSize(12);
      financialData.forEach(([label, value]) => {
        pdf.text(`${label}: ${value}`, margin, yPosition);
        yPosition += 7;
      });

      // Footer
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - 30, pageHeight - 10);
        pdf.text('Generated by Retail System Dashboard', margin, pageHeight - 10);
      }

      // Save the PDF
      const fileName = `sales-performance-report-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 400,
          }}
        >
          <CircularProgress size={50} />
        </Box>
      </Container>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        overflowX: "hidden",
        background: "#f6f6f6",
        fontFamily: "sans-serif",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Paper
        elevation={1}
        sx={{ mx: 4, mt: 4, p: 2, width: "100%", maxWidth: 1200 }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <DashboardIcon sx={{ fontSize: 28, color: "primary.main" }} />
          <Box>
            <Typography variant="h6" fontWeight="600" color="text.primary">
              Admin Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Welcome back, {user?.name}. Here's your system overview.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={() => setReportModalOpen(true)}
            sx={{ ml: "auto" }}
          >
            Generate Report
          </Button>
        </Box>
      </Paper>
      {/* Main content */}
      <div
        style={{
          margin: "20px 28px 0 28px",
          padding: "20px 0",
          minHeight: "60vh",
          width: "100%",
          maxWidth: 1200,
          boxSizing: "border-box",
        }}
      >
        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Dashboard Statistics */}
        <Grid container spacing={3}>
          {/* Total Stores */}
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Stores
                    </Typography>
                    <Typography variant="h4" fontWeight="600">
                      {stats?.totalStores || 0}
                    </Typography>
                  </Box>
                  <StoreIcon sx={{ fontSize: 40, color: "primary.main" }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Total Products */}
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Products
                    </Typography>
                    <Typography variant="h4" fontWeight="600">
                      {stats?.totalProducts || 0}
                    </Typography>
                  </Box>
                  <InventoryIcon sx={{ fontSize: 40, color: "info.main" }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Total Sales */}
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Sales
                    </Typography>
                    <Typography variant="h4" fontWeight="600">
                      {stats?.totalSales || 0}
                    </Typography>
                  </Box>
                  <SalesIcon sx={{ fontSize: 40, color: "success.main" }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Total Revenue */}
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Revenue
                    </Typography>
                    <Typography variant="h4" fontWeight="600">
                      ${(stats?.totalRevenue || 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <ReportsIcon sx={{ fontSize: 40, color: "warning.main" }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Total Refunds */}
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Refunds
                    </Typography>
                    <Typography
                      variant="h4"
                      fontWeight="600"
                      color="error.main"
                    >
                      {stats?.totalRefunds || 0}
                    </Typography>
                  </Box>
                  <ReportsIcon sx={{ fontSize: 40, color: "error.main" }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Net Revenue */}
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Net Revenue
                    </Typography>
                    <Typography
                      variant="h4"
                      fontWeight="600"
                      color="success.main"
                    >
                      $
                      {(
                        (stats?.totalRevenue || 0) -
                        (stats?.totalRefundAmount || 0)
                      ).toFixed(2)}
                    </Typography>
                  </Box>
                  <SalesIcon sx={{ fontSize: 40, color: "success.main" }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Analytics Cards Row */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {/* Average Order Value */}
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Average Order Value
                    </Typography>
                    <Typography variant="h4" fontWeight="600">
                      ${(stats?.averageOrderValue || 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <AssessmentIcon sx={{ fontSize: 40, color: "info.main" }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Refund Rate */}
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Refund Rate
                    </Typography>
                    <Typography
                      variant="h4"
                      fontWeight="600"
                      color="warning.main"
                    >
                      {(stats?.refundRate || 0).toFixed(1)}%
                    </Typography>
                  </Box>
                  <ReportsIcon sx={{ fontSize: 40, color: "warning.main" }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Performing Store */}
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Top Performing Store
                    </Typography>
                    <Typography variant="h6" fontWeight="600">
                      {stats?.topPerformingStore?.storeName || "N/A"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ${(stats?.topPerformingStore?.revenue || 0).toFixed(2)}{" "}
                      revenue
                    </Typography>
                  </Box>
                  <StoreIcon sx={{ fontSize: 40, color: "success.main" }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Store Performance Chart */}
        {stats?.storePerformanceData &&
          Array.isArray(stats.storePerformanceData) &&
          stats.storePerformanceData.length > 0 && (
            <Paper elevation={1} sx={{ p: 3, mt: 4 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <AssessmentIcon /> Store Performance Analysis
              </Typography>
              <Grid container spacing={2}>
                {stats.storePerformanceData.map((store) => (
                  <Grid item xs={12} md={4} key={store.storeId}>
                    <Card variant="outlined" sx={{ height: "100%" }}>
                      <CardContent>
                        <Typography variant="h6" fontWeight="600" gutterBottom>
                          {store.storeName}
                        </Typography>

                        {/* Revenue Bar */}
                        <Box sx={{ mb: 2 }}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              mb: 1,
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              Revenue Share
                            </Typography>
                            <Typography variant="body2" fontWeight="600">
                              {store.revenuePercentage.toFixed(1)}%
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              width: "100%",
                              height: 8,
                              bgcolor: "grey.200",
                              borderRadius: 1,
                              overflow: "hidden",
                            }}
                          >
                            <Box
                              sx={{
                                width: `${store.revenuePercentage}%`,
                                height: "100%",
                                bgcolor: "primary.main",
                                borderRadius: 1,
                              }}
                            />
                          </Box>
                        </Box>

                        {/* Metrics */}
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Sales
                            </Typography>
                            <Typography variant="h6" fontWeight="600">
                              {store.totalSales}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Revenue
                            </Typography>
                            <Typography variant="h6" fontWeight="600">
                              ${store.revenue.toFixed(2)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Refunds
                            </Typography>
                            <Typography
                              variant="h6"
                              fontWeight="600"
                              color="error.main"
                            >
                              {store.totalRefunds}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Refund Rate
                            </Typography>
                            <Typography
                              variant="h6"
                              fontWeight="600"
                              color="warning.main"
                            >
                              {store.refundRate.toFixed(1)}%
                            </Typography>
                          </Grid>
                        </Grid>

                        {/* Net Revenue */}
                        <Box
                          sx={{
                            mt: 2,
                            pt: 2,
                            borderTop: "1px solid",
                            borderColor: "grey.200",
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Net Revenue
                          </Typography>
                          <Typography
                            variant="h5"
                            fontWeight="600"
                            color="success.main"
                          >
                            ${store.netRevenue.toFixed(2)}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

        {/* Revenue vs Refunds Comparison */}
        <Paper elevation={1} sx={{ p: 3, mt: 4 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <AssessmentIcon /> Revenue vs Refunds Overview
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" color="success.main" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h3" fontWeight="600">
                    ${(stats?.totalRevenue || 0).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    From {stats?.totalSales || 0} sales
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" color="error.main" gutterBottom>
                    Total Refunds
                  </Typography>
                  <Typography variant="h3" fontWeight="600">
                    ${(stats?.totalRefundAmount || 0).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    From {stats?.totalRefunds || 0} refunds (
                    {(stats?.refundRate || 0).toFixed(1)}% rate)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Net Revenue Summary */}
          <Box
            sx={{
              mt: 3,
              p: 2,
              bgcolor: "success.50",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "success.200",
            }}
          >
            <Typography variant="h6" color="success.main" gutterBottom>
              Net Revenue Summary
            </Typography>
            <Typography variant="h4" fontWeight="600" color="success.main">
              ${(stats?.netRevenue || 0).toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Revenue after refunds (
              {(
                ((stats?.netRevenue || 0) / (stats?.totalRevenue || 1)) *
                100
              ).toFixed(1)}
              % of gross revenue)
            </Typography>
          </Box>
        </Paper>
      </div>

      {/* Report Modal */}
      <Dialog
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: "80vh" },
        }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AssessmentIcon />
          Sales Performance Report
          <Box sx={{ ml: "auto", fontSize: "0.75rem", color: "text.secondary" }}>
            Generated on{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {stats && (
            <Box sx={{ p: 2 }}>
              {/* Executive Summary */}
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  mb: 4,
                  bgcolor: "primary.50",
                  border: "1px solid",
                  borderColor: "primary.200",
                }}
              >
                <Typography
                  variant="h5"
                  fontWeight="600"
                  color="primary.main"
                  gutterBottom
                >
                  Executive Summary
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography
                        variant="h3"
                        fontWeight="600"
                        color="primary.main"
                      >
                        {stats.totalStores}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Stores
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography
                        variant="h3"
                        fontWeight="600"
                        color="info.main"
                      >
                        {stats.totalProducts}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Products
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography
                        variant="h3"
                        fontWeight="600"
                        color="success.main"
                      >
                        {stats.totalSales}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Sales
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography
                        variant="h3"
                        fontWeight="600"
                        color="success.main"
                      >
                        ${(stats.totalRevenue || 0).toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Gross Revenue
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Key Performance Indicators */}
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="h5"
                  fontWeight="600"
                  gutterBottom
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <AssessmentIcon /> Key Performance Indicators
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography
                          variant="h6"
                          color="info.main"
                          gutterBottom
                        >
                          Average Order Value
                        </Typography>
                        <Typography variant="h4" fontWeight="600">
                          ${(stats.averageOrderValue || 0).toFixed(2)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Revenue per transaction
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography
                          variant="h6"
                          color="warning.main"
                          gutterBottom
                        >
                          Refund Rate
                        </Typography>
                        <Typography variant="h4" fontWeight="600">
                          {(stats.refundRate || 0).toFixed(1)}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {stats.totalRefunds} of {stats.totalSales} sales refunded
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography
                          variant="h6"
                          color="success.main"
                          gutterBottom
                        >
                          Net Revenue
                        </Typography>
                        <Typography variant="h4" fontWeight="600">
                          ${(stats.netRevenue || 0).toFixed(2)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          After ${(stats.totalRefundAmount || 0).toFixed(2)} in
                          refunds
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Store Performance Analysis */}
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="h5"
                  fontWeight="600"
                  gutterBottom
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <StoreIcon /> Store Performance Analysis
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "grey.50" }}>
                        <TableCell>
                          <strong>Store Name</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>Sales Count</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>Revenue</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>Revenue %</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>Refunds</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>Refund Rate</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>Net Revenue</strong>
                        </TableCell>
                        <TableCell align="center">
                          <strong>Performance</strong>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.storePerformanceData &&
                        stats.storePerformanceData
                          .sort((a, b) => b.revenue - a.revenue)
                          .map((store, index) => (
                            <TableRow
                              key={store.storeId}
                              sx={{
                                bgcolor:
                                  index === 0 ? "success.50" : "inherit",
                                "&:hover": { bgcolor: "grey.50" },
                              }}
                            >
                              <TableCell>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  {index === 0 && (
                                    <StoreIcon
                                      sx={{ color: "success.main", fontSize: 20 }}
                                    />
                                  )}
                                  <strong>{store.storeName}</strong>
                                  {index === 0 && (
                                    <Typography
                                      variant="caption"
                                      color="success.main"
                                    >
                                      (Top Performer)
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell align="right">{store.totalSales}</TableCell>
                              <TableCell align="right">
                                ${store.revenue.toFixed(2)}
                              </TableCell>
                              <TableCell align="right">
                                {store.revenuePercentage.toFixed(1)}%
                              </TableCell>
                              <TableCell align="right">
                                {store.totalRefunds}
                              </TableCell>
                              <TableCell align="right">
                                <Typography
                                  color={
                                    (() => {
                                      if (store.refundRate > 20) return "error.main";
                                      if (store.refundRate > 10) return "warning.main";
                                      return "success.main";
                                    })()
                                  }
                                >
                                  {store.refundRate.toFixed(1)}%
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <strong>${store.netRevenue.toFixed(2)}</strong>
                              </TableCell>
                              <TableCell align="center">
                                {(() => {
                                  if (store.refundRate < 5) return "🟢 Excellent";
                                  if (store.refundRate < 15) return "🟡 Good";
                                  return "� Needs Attention";
                                })()}
                              </TableCell>
                            </TableRow>
                          ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Financial Summary */}
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="h5"
                  fontWeight="600"
                  gutterBottom
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <SalesIcon /> Financial Summary
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
                      <Typography
                        variant="h6"
                        gutterBottom
                        color="success.main"
                      >
                        Revenue Breakdown
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Gross Revenue
                        </Typography>
                        <Typography variant="h4" fontWeight="600">
                          ${(stats.totalRevenue || 0).toFixed(2)}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Total Refunds
                        </Typography>
                        <Typography
                          variant="h5"
                          fontWeight="600"
                          color="error.main"
                        >
                          -${(stats.totalRefundAmount || 0).toFixed(2)}
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 2 }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Net Revenue
                        </Typography>
                        <Typography
                          variant="h3"
                          fontWeight="600"
                          color="success.main"
                        >
                          ${(stats.netRevenue || 0).toFixed(2)}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
                      <Typography
                        variant="h6"
                        gutterBottom
                        color="info.main"
                      >
                        Transaction Metrics
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Total Transactions
                        </Typography>
                        <Typography variant="h4" fontWeight="600">
                          {stats.totalSales}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Average Order Value
                        </Typography>
                        <Typography variant="h5" fontWeight="600">
                          ${(stats.averageOrderValue || 0).toFixed(2)}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Successful Transactions
                        </Typography>
                        <Typography
                          variant="h5"
                          fontWeight="600"
                          color="success.main"
                        >
                          {stats.totalSales - stats.totalRefunds} (
                          {((1 - stats.refundRate / 100) * 100).toFixed(1)}%)
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportModalOpen(false)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={generatePDF}
          >
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Dashboard;
