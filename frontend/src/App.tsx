import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Browse } from "./pages/Browse";
import { PaperDetails } from "./pages/PaperDetails";
import { Preview } from "./pages/Preview";
import { Contact } from "./pages/Contact";
import { FAQ } from "./pages/FAQ";
import { Login, SetupAdmin, NotFound, Unauthorized } from "./pages/Auth";
import { Settings } from "./pages/Settings";
import {
  PrivacyPolicy,
  TermsOfService,
  CopyrightPolicy,
} from "./pages/Policies";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { Dashboard } from "./pages/admin/Dashboard";
import { PapersAdmin } from "./pages/admin/PapersAdmin";
import { UploadPaper } from "./pages/admin/UploadPaper";
import { EditPaper } from "./pages/admin/EditPaper";
import { InstitutionsAdmin } from "./pages/admin/InstitutionsAdmin";
import { AcademicAdmin } from "./pages/admin/AcademicAdmin";
import { AdminsAdmin } from "./pages/admin/AdminsAdmin";
import { ActivityLogs } from "./pages/admin/ActivityLogs";

function PageTitle({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.title = title;
  }, [title]);
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<PageTitle title="BTech Buddy — Previous Year Question Papers"><Home /></PageTitle>} />
        <Route path="browse" element={<PageTitle title="Browse Papers — BTech Buddy"><Browse /></PageTitle>} />
        <Route path="papers/:id" element={<PageTitle title="Paper Details — BTech Buddy"><PaperDetails /></PageTitle>} />
        <Route path="papers/:id/preview" element={<PageTitle title="PDF Preview — BTech Buddy"><Preview /></PageTitle>} />
        <Route path="contact" element={<PageTitle title="Contact — BTech Buddy"><Contact /></PageTitle>} />
        <Route path="faq" element={<PageTitle title="FAQ — BTech Buddy"><FAQ /></PageTitle>} />
        <Route path="settings" element={<PageTitle title="Appearance — BTech Buddy"><Settings /></PageTitle>} />
        <Route path="privacy" element={<PageTitle title="Privacy Policy — BTech Buddy"><PrivacyPolicy /></PageTitle>} />
        <Route path="terms" element={<PageTitle title="Terms of Service — BTech Buddy"><TermsOfService /></PageTitle>} />
        <Route path="copyright" element={<PageTitle title="Copyright & DMCA — BTech Buddy"><CopyrightPolicy /></PageTitle>} />
        <Route path="login" element={<PageTitle title="Admin sign in — BTech Buddy"><Login /></PageTitle>} />
        <Route path="setup" element={<PageTitle title="Initial setup — BTech Buddy"><SetupAdmin /></PageTitle>} />
        <Route path="unauthorized" element={<PageTitle title="Access restricted — BTech Buddy"><Unauthorized /></PageTitle>} />
        <Route path="*" element={<PageTitle title="Page not found — BTech Buddy"><NotFound /></PageTitle>} />
      </Route>

      <Route element={<AdminLayout />}>
        <Route path="admin" element={<PageTitle title="Dashboard — BTech Buddy Admin"><Dashboard /></PageTitle>} />
        <Route path="admin/papers" element={<PageTitle title="Papers — BTech Buddy Admin"><PapersAdmin /></PageTitle>} />
        <Route path="admin/papers/upload" element={<PageTitle title="Upload Paper — BTech Buddy Admin"><UploadPaper /></PageTitle>} />
        <Route path="admin/papers/:id/edit" element={<PageTitle title="Edit Paper — BTech Buddy Admin"><EditPaper /></PageTitle>} />
        <Route path="admin/institutions" element={<PageTitle title="Institutions — BTech Buddy Admin"><InstitutionsAdmin /></PageTitle>} />
        <Route path="admin/academic" element={<PageTitle title="Branches & Subjects — BTech Buddy Admin"><AcademicAdmin /></PageTitle>} />
        <Route path="admin/admins" element={<PageTitle title="Admins — BTech Buddy Admin"><AdminsAdmin /></PageTitle>} />
        <Route path="admin/logs" element={<PageTitle title="Activity Logs — BTech Buddy Admin"><ActivityLogs /></PageTitle>} />
      </Route>
    </Routes>
  );
}
