import { Navigate } from "react-router-dom";
import { getAuthUser } from "../auth.js";

export default function ProtectedRoute({ children }) {
  if (!getAuthUser()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
