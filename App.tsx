import React, { useState, useEffect } from 'react';
import { User, Order, PaymentAccountDetails, ProductsData } from './types';
import AuthPage from './Auth';
import Dashboard from './Dashboard';
import ProductFlow from './ProductFlow';
import BuyCreditsView from './BuyCreditsView';
import MyOrdersView from './MyOrdersView';
import AdminPanel from './AdminPanel';
import FAQView from './FAQView';
import UserProfileView from './UserProfileView';
import { useLanguage } from './i18n';
import { LoadingSpinner } from './components';
import ApiService from './api/ApiService';

const App = () => {
  const { t } = useLanguage();
  
  // State Management
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('DASHBOARD');
  
  // API-backed data state
  const [products, setProducts] = useState<ProductsData>({});
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [paymentDetails, setPaymentDetails] = useState<PaymentAccountDetails>({});
  const [adminContact, setAdminContact] = useState<string>('https://t.me/CEO_METAVERSE');

  // Check if user is logged in on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const storedView = sessionStorage.getItem('currentView');
        
        if (token) {
          // Try to get user profile with the token
          try {
            const user = await ApiService.getUserProfile();
            setCurrentUser(user);
            setIsLoggedIn(true);
            setCurrentView(storedView || 'DASHBOARD');
            
            // Load initial data
            await loadAppData();
          } catch (error) {
            console.error('Failed to verify token:', error);
            ApiService.logout();
          }
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Load app data from API
  const loadAppData = async () => {
    try {
      const [productsData, paymentData, contactData] = await Promise.all([
        ApiService.getProducts(),
        ApiService.getPaymentDetails(),
        ApiService.getAdminContact()
      ]);

      setProducts(productsData);
      setPaymentDetails(paymentData);
      setAdminContact(contactData.adminContact);

      // Load admin data if user is admin
      if (currentUser?.isAdmin) {
        const [usersData, ordersData] = await Promise.all([
          ApiService.getAllUsers(),
          ApiService.getAllOrders()
        ]);
        setUsers(usersData);
        setOrders(ordersData);
      } else if (currentUser) {
        // Load user-specific orders
        const userOrders = await ApiService.getMyOrders();
        setOrders(userOrders);
      }
    } catch (error) {
      console.error('Failed to load app data:', error);
    }
  };

  // Refresh user data
  const refreshUserData = async () => {
    try {
      const user = await ApiService.getUserProfile();
      setCurrentUser(user);
      
      if (user.isAdmin) {
        const usersData = await ApiService.getAllUsers();
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  // Effect to manage body class for dynamic backgrounds
  useEffect(() => {
    const className = isLoggedIn ? 'dashboard-background' : 'auth-background';
    document.documentElement.className = className;
    document.body.className = className;

    return () => {
      document.documentElement.className = '';
      document.body.className = '';
    };
  }, [isLoggedIn]);

  const handleLoginSuccess = async (username: string, password: string) => {
    try {
      const response = await ApiService.login(username, password);
      setCurrentUser(response.user);
      setIsLoggedIn(true);
      setCurrentView('DASHBOARD');
      sessionStorage.setItem('currentView', 'DASHBOARD');
      
      // Load app data after successful login
      await loadAppData();
    } catch (error: any) {
      alert(error.message || t('app.alerts.invalidCredentials'));
    }
  };

  const handleRegisterSuccess = async (username: string, password: string, securityAmount: number) => {
    try {
      const response = await ApiService.register(username, password, securityAmount);
      setCurrentUser(response.user);
      setIsLoggedIn(true);
      setCurrentView('DASHBOARD');
      sessionStorage.setItem('currentView', 'DASHBOARD');
      
      alert(t('app.alerts.registrationSuccess', { id: response.user.id }));
      
      // Load app data after successful registration
      await loadAppData();
    } catch (error: any) {
      alert(error.message || t('app.alerts.registrationFailed'));
    }
  };

  const handlePasswordReset = async (userId: number, newPassword: string) => {
    try {
      await ApiService.resetPassword(userId, newPassword);
      alert('Password reset successfully');
    } catch (error: any) {
      alert(error.message || 'Failed to reset password');
    }
  };

  const handleLogout = () => {
    ApiService.logout();
    setCurrentUser(null);
    setIsLoggedIn(false);
    setCurrentView('DASHBOARD');
    setProducts({});
    setUsers([]);
    setOrders([]);
    sessionStorage.removeItem('currentView');
  };

  const handleBroadcast = async (message: string, targetIds: number[]) => {
    try {
      await ApiService.broadcastMessage(message, targetIds);
      alert(t('app.alerts.broadcastSent', { count: targetIds.length }));
    } catch (error: any) {
      alert(error.message || 'Failed to send broadcast');
    }
  };

  const sendAdminNotification = (message: string) => {
    // This will be handled by the backend when orders are created
    console.log('Admin notification:', message);
  };
  
  const navigateTo = (view: string) => {
    setCurrentView(view);
    sessionStorage.setItem('currentView', view);
  };

  const updateProducts = async () => {
    try {
      const productsData = await ApiService.getProducts();
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to update products:', error);
    }
  };

  const updateOrders = async () => {
    try {
      if (currentUser?.isAdmin) {
        const ordersData = await ApiService.getAllOrders();
        setOrders(ordersData);
      } else if (currentUser) {
        const userOrders = await ApiService.getMyOrders();
        setOrders(userOrders);
      }
    } catch (error) {
      console.error('Failed to update orders:', error);
    }
  };

  const updateUsers = async () => {
    try {
      if (currentUser?.isAdmin) {
        const usersData = await ApiService.getAllUsers();
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Failed to update users:', error);
    }
  };

  const updatePaymentDetails = async (newDetails: PaymentAccountDetails) => {
    try {
      await ApiService.updatePaymentDetails(newDetails);
      setPaymentDetails(newDetails);
    } catch (error: any) {
      alert(error.message || 'Failed to update payment details');
    }
  };

  const updateAdminContact = async (newContact: string) => {
    try {
      await ApiService.updateAdminContact(newContact);
      setAdminContact(newContact);
    } catch (error: any) {
      alert(error.message || 'Failed to update admin contact');
    }
  };

  // View Renderer
  const renderView = () => {
    if (!currentUser) return null;
    
    switch (currentView) {
      case 'DASHBOARD':
        return (
          <Dashboard 
            user={currentUser} 
            onNavigate={navigateTo} 
            onLogout={handleLogout} 
            adminContact={adminContact} 
          />
        );
        
      case 'BROWSE_PRODUCTS':
        return (
          <ProductFlow 
            products={products} 
            onNavigate={navigateTo} 
            user={currentUser} 
            setOrders={updateOrders}
            setUsers={refreshUserData} 
            users={users} 
            onAdminNotify={sendAdminNotification}
          />
        );
        
      case 'BUY_CREDITS':
        return (
          <BuyCreditsView 
            user={currentUser} 
            onNavigate={navigateTo} 
            setOrders={updateOrders}
            onAdminNotify={sendAdminNotification} 
            paymentAccountDetails={paymentDetails}
          />
        );
        
      case 'MY_ORDERS':
        return (
          <MyOrdersView 
            user={currentUser} 
            onNavigate={navigateTo} 
            orders={orders.filter(order => order.user_id === currentUser.id)}
          />
        );
        
      case 'ADMIN_PANEL':
        return (
          <AdminPanel 
            onNavigate={navigateTo} 
            products={products} 
            setProducts={updateProducts}
            users={users} 
            setUsers={updateUsers}
            orders={orders} 
            setOrders={updateOrders}
            onBroadcast={handleBroadcast}
            currentUser={currentUser}
            onLogout={handleLogout}
            paymentDetails={paymentDetails}
            setPaymentDetails={updatePaymentDetails}
            adminContact={adminContact}
            setAdminContact={updateAdminContact}
          />
        );
        
      case 'FAQ':
        return <FAQView onNavigate={navigateTo} />;
        
      case 'USER_PROFILE':
        return (
          <UserProfileView 
            user={currentUser} 
            orders={orders.filter(order => order.user_id === currentUser.id)}
            onNavigate={navigateTo} 
          />
        );
        
      default:
        return (
          <Dashboard 
            user={currentUser} 
            onNavigate={navigateTo} 
            onLogout={handleLogout} 
            adminContact={adminContact} 
          />
        );
    }
  };
  
  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      {isLoggedIn && currentUser ? (
        renderView()
      ) : (
        <AuthPage 
          onLoginSuccess={handleLoginSuccess} 
          onRegisterSuccess={handleRegisterSuccess}
          onPasswordReset={handlePasswordReset}
          users={users}
          adminContact={adminContact}
        />
      )}
    </>
  );
};

export default App;