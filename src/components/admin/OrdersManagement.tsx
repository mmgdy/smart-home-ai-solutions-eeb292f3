import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Package, Eye, Truck, CheckCircle, Clock, CreditCard, Banknote, Loader2, X, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Order {
  id: string;
  email: string;
  total: number;
  status: string;
  created_at: string;
  shipping_address: any;
  stripe_session_id: string | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  processing: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  shipped: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  delivered: 'bg-green-500/10 text-green-600 border-green-500/30',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/30',
};

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: X,
};

export const OrdersManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch orders',
      });
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrderItems = async (orderId: string) => {
    setLoadingItems(true);
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch order items',
      });
    } else {
      setOrderItems(data || []);
    }
    setLoadingItems(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(orderId);
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update order status',
      });
    } else {
      toast({
        title: 'Success',
        description: `Order status updated to ${newStatus}`,
      });
      fetchOrders();
    }
    setUpdatingStatus(null);
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    fetchOrderItems(order.id);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-EG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentMethod = (order: Order) => {
    // Check if payment was made via PaySky (stripe_session_id will contain paysky payment reference)
    // or if it's COD (no stripe_session_id or starts with 'cod_')
    if (order.stripe_session_id?.startsWith('cod_')) {
      return { type: 'cod', label: 'Cash on Delivery', icon: Banknote };
    }
    if (order.stripe_session_id) {
      return { type: 'card', label: 'Online Payment', icon: CreditCard };
    }
    return { type: 'cod', label: 'Cash on Delivery', icon: Banknote };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Orders ({orders.length})
        </h2>
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No orders yet
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const StatusIcon = statusIcons[order.status] || Clock;
            const payment = getPaymentMethod(order);
            const PaymentIcon = payment.icon;

            return (
              <div
                key={order.id}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm text-muted-foreground">
                        #{order.id.slice(0, 8)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[order.status] || statusColors.pending}`}>
                        <StatusIcon className="w-3 h-3 inline mr-1" />
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        <PaymentIcon className="w-3 h-3 inline mr-1" />
                        {payment.label}
                      </span>
                    </div>
                    <p className="font-medium text-foreground truncate">{order.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(order.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        {order.total.toLocaleString()} EGP
                      </p>
                    </div>

                    <Select
                      value={order.status}
                      onValueChange={(value) => updateOrderStatus(order.id, value)}
                      disabled={updatingStatus === order.id}
                    >
                      <SelectTrigger className="w-[130px]">
                        {updatingStatus === order.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openOrderDetails(order)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Order #{selectedOrder?.id.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Status */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{selectedOrder.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl font-bold text-primary">
                    {selectedOrder.total.toLocaleString()} EGP
                  </p>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h4 className="font-semibold mb-3">Customer Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedOrder.email}</p>
                  </div>
                  {selectedOrder.shipping_address && (
                    <>
                      <div>
                        <p className="text-muted-foreground">Name</p>
                        <p className="font-medium">
                          {selectedOrder.shipping_address.firstName} {selectedOrder.shipping_address.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedOrder.shipping_address.phone}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Address</p>
                        <p className="font-medium">
                          {selectedOrder.shipping_address.address}, {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.governorate}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-semibold mb-3">Order Items</h4>
                {loadingItems ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orderItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity} × {item.price.toLocaleString()} EGP
                          </p>
                        </div>
                        <p className="font-bold">
                          {(item.quantity * item.price).toLocaleString()} EGP
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Date */}
              <div className="text-sm text-muted-foreground text-center pt-4 border-t">
                Order placed on {formatDate(selectedOrder.created_at)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
