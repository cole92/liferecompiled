import { Outlet } from "react-router-dom";
import DashboardBreadcrumb from "./DashboardBreadcrumb";
import WelcomeBanner from "./WelcomeBanner";
import DashboardTabs from "./DashboardTabs";

const DashboardLayout = () => {
  const showBanner = true; // Kasnije cemo ovo vezati za localStorage

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="sticky top-0 z-20 bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <DashboardBreadcrumb />
          {showBanner && (
            <div className="mt-4">
              <WelcomeBanner />
            </div>
          )}
          <div className="mt-4">
            <DashboardTabs />
          </div>
        </div>
      </div>

      {/* Skrolabilni sadrzaj */}
      <div className="flex-grow overflow-y-auto">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
