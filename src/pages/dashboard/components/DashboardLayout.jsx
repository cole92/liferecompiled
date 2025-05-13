import { Outlet } from "react-router-dom";
import DashboardBreadcrumb from "./DashboardBreadcrumb";
import WelcomeBanner from "./WelcomeBanner";
import DashboardTabs from "./DashboardTabs";

const DashboardLayout = () => {
  const showBanner = true; // kasnije cemo ovo vezati za localStorage, context, itd.

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <DashboardBreadcrumb />

        {showBanner && (
          <div className="mb-6">
            <WelcomeBanner />
          </div>
        )}

        <div className="mb-6">
          <DashboardTabs />
        </div>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
