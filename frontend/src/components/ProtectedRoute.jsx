import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ element }) => {
  const { token } = useContext(AuthContext);

  return token ? element : <Navigate to="/login" />;
};

export default ProtectedRoute;
