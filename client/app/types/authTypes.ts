export interface User {
  id: string;
  name: string;
  role: string;
  avatar: string | null;
  email: string | null;
  phone: string;
  user?: {
    id: string;
    name: string;
    role: string;
    avatar: string | null;
    email: string | null;
    phone: string;
  };
}
