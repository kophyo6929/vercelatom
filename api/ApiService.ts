import { User, Order, ProductsData } from '../types';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api'  // Vercel will serve API functions from /api
  : 'http://localhost:3001/api';

interface LoginResponse {
  user: User;
  token: string;
  message: string;
}

interface RegisterResponse {
  user: User;
  token: string;
  message: string;
}

class ApiService {
  private static token: string | null = localStorage.getItem('authToken');

  private static getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  private static setToken(token: string): void {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  private static clearToken(): void {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  // Authentication
  static async login(username: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ username, password }),
    });

    const data = await this.handleResponse<LoginResponse>(response);
    this.setToken(data.token);
    return data;
  }

  static async register(username: string, password: string, securityAmount: number): Promise<RegisterResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ username, password, securityAmount }),
    });

    const data = await this.handleResponse<RegisterResponse>(response);
    this.setToken(data.token);
    return data;
  }

  static async getUserProfile(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse<User>(response);
  }

  static logout(): void {
    this.clearToken();
    sessionStorage.clear();
  }

  // Products
  static async getProducts(): Promise<ProductsData> {
    const response = await fetch(`${API_BASE_URL}/products`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse<ProductsData>(response);
  }

  static async purchaseProduct(productId: number, quantity: number): Promise<{ message: string; orderId: number; remainingCredits: number }> {
    const response = await fetch(`${API_BASE_URL}/products/${productId}/purchase`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ quantity }),
    });

    return this.handleResponse(response);
  }

  // Orders
  static async getMyOrders(): Promise<Order[]> {
    const response = await fetch(`${API_BASE_URL}/orders/my-orders`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse<Order[]>(response);
  }

  static async buyCredits(amount: number, paymentMethod: string): Promise<{ message: string; orderId: number; status: string }> {
    const response = await fetch(`${API_BASE_URL}/orders/buy-credits`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ amount, paymentMethod }),
    });

    return this.handleResponse(response);
  }

  // Admin functions
  static async getAllUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse<User[]>(response);
  }

  static async updateUser(userId: number, updates: Partial<User>): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });

    return this.handleResponse(response);
  }

  static async getAllOrders(): Promise<Order[]> {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse<Order[]>(response);
  }

  static async updateOrderStatus(orderId: number, status: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    });

    return this.handleResponse(response);
  }

  static async broadcastMessage(message: string, targetIds: number[]): Promise<{ message: string; count: number }> {
    const response = await fetch(`${API_BASE_URL}/users/broadcast`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ message, targetIds }),
    });

    return this.handleResponse(response);
  }

  static async resetPassword(userId: number, newPassword: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId, newPassword }),
    });

    return this.handleResponse(response);
  }

  // Settings
  static async getPaymentDetails(): Promise<Record<string, { name: string; number: string }>> {
    const response = await fetch(`${API_BASE_URL}/settings/payment-details`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  static async getAdminContact(): Promise<{ adminContact: string }> {
    const response = await fetch(`${API_BASE_URL}/settings/admin-contact`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  static async updateAdminContact(adminContact: string): Promise<{ message: string; adminContact: string }> {
    const response = await fetch(`${API_BASE_URL}/settings/admin-contact`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ adminContact }),
    });

    return this.handleResponse(response);
  }

  static async updatePaymentDetails(paymentDetails: Record<string, { name: string; number: string }>): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/settings/payment-details`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ paymentDetails }),
    });

    return this.handleResponse(response);
  }

  // Notifications
  static async getNotifications(userId: number): Promise<Array<{ id: number; message: string; read: boolean; created_at: string }>> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/notifications`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  // Health check
  static async healthCheck(): Promise<{ status: string; timestamp: string; uptime: number }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return this.handleResponse(response);
  }
}

export default ApiService;