import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import VisitTracker from "./components/VisitTracker";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const BooksPage = lazy(() => import("./pages/BooksPage"));
const MyRequestsPage = lazy(() => import("./pages/MyRequestsPage"));
const IncomingRequestsPage = lazy(() => import("./pages/IncomingRequestsPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const MyBooksPage = lazy(() => import("./pages/MyBooksPage"));
const MyBorrowsPage = lazy(() => import("./pages/MyBorrowsPage"));
const MapPage = lazy(() => import("./pages/MapPage"));
const BookDetailPage = lazy(() => import("./pages/BookDetailPage"));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const OwnerBorrowsPage = lazy(() => import("./pages/OwnerBorrowsPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const ConversationsPage = lazy(() => import("./pages/ConversationsPage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));

function RouteFallback() {
  return (
    <div className="container-app py-6 text-sm text-gray-500">Yuklanmoqda...</div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Navbar />
      <VisitTracker />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/books" element={<BooksPage />} />
          <Route path="/my-requests" element={<MyRequestsPage />} />
          <Route path="/incoming" element={<IncomingRequestsPage />} />
          <Route path="/my-books" element={<MyBooksPage />} />
          <Route path="/my-borrows" element={<MyBorrowsPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/books/:id" element={<BookDetailPage />} />
          <Route path="/users/:id" element={<UserProfilePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/owner-borrows" element={<OwnerBorrowsPage />} />
          <Route path="/conversations" element={<ConversationsPage />} />
          <Route path="/chat/:borrowId" element={<ChatPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
