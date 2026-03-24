import { create } from 'zustand';

interface User {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  city: string | null;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  incomingCount: number;
  ownerPendingCount: number;
  myBorrowsCount: number;
  unreadCount: number;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setIncomingCount: (count: number) => void;
  setOwnerPendingCount: (count: number) => void;
  setMyBorrowsCount: (count: number) => void;
  setUnreadCount: (count: number) => void;
}

const savedUser = localStorage.getItem('user');

export const useAuthStore = create<AuthStore>((set) => ({
  user: savedUser ? JSON.parse(savedUser) : null,
  token: localStorage.getItem('token'),
  incomingCount: 0,
  ownerPendingCount: 0,
  myBorrowsCount: 0,
  unreadCount: 0,
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  },
  setIncomingCount: (count) => set({ incomingCount: count }),
  setOwnerPendingCount: (count) => set({ ownerPendingCount: count }),
  setMyBorrowsCount: (count) => set({ myBorrowsCount: count }),
  setUnreadCount: (count) => set({ unreadCount: count }),
}));