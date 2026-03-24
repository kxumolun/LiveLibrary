import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import BooksPage from "./pages/BooksPage";
import MyRequestsPage from "./pages/MyRequestsPage";
import IncomingRequestsPage from "./pages/IncomingRequestsPage";
import LandingPage from "./pages/LandingPage";
import MyBooksPage from "./pages/MyBooksPage";
import MyBorrowsPage from "./pages/MyBorrowsPage";
import MapPage from "./pages/MapPage";
import Navbar from "./components/Navbar";
import BookDetailPage from "./pages/BookDetailPage";
import UserProfilePage from "./pages/UserProfilePage";
import ProfilePage from "./pages/ProfilePage";
import OwnerBorrowsPage from "./pages/OwnerBorrowsPage";
import ChatPage from "./pages/ChatPage";
import ConversationsPage from "./pages/ConversationsPage";

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Navbar />
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
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
