const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const response = await api.auth.login(credentials);
    console.log('Login successful:', response.data);
    
    // Store tokens
    localStorage.setItem('token', response.data.access);
    localStorage.setItem('refreshToken', response.data.refresh);
    
    // Store user role
    localStorage.setItem('userRole', response.data.role);
    
    // Update auth context
    if (login) {  // Make sure login function from AuthContext exists
      await login(response.data);  // Pass the entire response data to context
    }
    
    // Navigate to appropriate dashboard based on role
    const role = response.data.role;
    switch(role) {
      case 'teacher':
        navigate('/teacher/dashboard');
        break;
      case 'student':
        navigate('/student/dashboard');
        break;
      case 'admin':
        navigate('/admin/dashboard');
        break;
      default:
        navigate('/dashboard');
    }
  } catch (error) {
    console.error('Login error:', error);
    setError(error.response?.data?.detail || 'Login failed. Please try again.');
  }
}; 