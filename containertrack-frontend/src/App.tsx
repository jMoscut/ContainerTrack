import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./store/AuthContext";
import { RequireAuth } from "./components/layout/RequireAuth";
import { AppLayout } from "./components/layout/AppLayout";
import { PageLoader } from "./components/ui/PageLoader";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";

const LoginPage = lazy(() => import("./features/auth/LoginPage").then((m) => ({ default: m.LoginPage })));
const ChangePasswordPage = lazy(() =>
  import("./features/auth/ChangePasswordPage").then((m) => ({ default: m.ChangePasswordPage })),
);
const DashboardPage = lazy(() =>
  import("./features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const ContainerListPage = lazy(() =>
  import("./features/containers/ContainerListPage").then((m) => ({ default: m.ContainerListPage })),
);
const ContainerDetailPage = lazy(() =>
  import("./features/containers/ContainerDetailPage").then((m) => ({ default: m.ContainerDetailPage })),
);
const CalendarPage = lazy(() => import("./features/calendar/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const UsersPage = lazy(() => import("./features/users/UsersPage").then((m) => ({ default: m.UsersPage })));
const ReportsPage = lazy(() => import("./features/reports/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const ShippingCompaniesPage = lazy(() =>
  import("./features/shippingCompanies/ShippingCompaniesPage").then((m) => ({ default: m.ShippingCompaniesPage })),
);
const PortsPage = lazy(() => import("./features/ports/PortsPage").then((m) => ({ default: m.PortsPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/change-password"
                element={
                  <RequireAuth>
                    <ChangePasswordPage />
                  </RequireAuth>
                }
              />
              <Route
                element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                }
              >
                <Route path="/" element={<DashboardPage />} />
                <Route path="/containers" element={<ContainerListPage />} />
                <Route path="/containers/:id" element={<ContainerDetailPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route
                  path="/users"
                  element={
                    <RequireAuth roles={["ADMIN"]}>
                      <UsersPage />
                    </RequireAuth>
                  }
                />
                <Route path="/reports" element={<ReportsPage />} />
                <Route
                  path="/navieras"
                  element={
                    <RequireAuth roles={["ADMIN"]}>
                      <ShippingCompaniesPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/puertos"
                  element={
                    <RequireAuth roles={["ADMIN"]}>
                      <PortsPage />
                    </RequireAuth>
                  }
                />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#FDFDD0",
              color: "#2E2417",
              border: "1px solid #C8D5C0",
            },
            success: { iconTheme: { primary: "#004F2E", secondary: "#FDFDD0" } },
            error: { iconTheme: { primary: "#C0392B", secondary: "#FDFDD0" } },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
