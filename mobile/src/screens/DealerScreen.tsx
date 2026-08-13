import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { apiClient } from '../services/api';

type Dealer = { id: string; name: string; district: string; village?: string; contact_person?: string; phone: string };
type Product = { id: string; name: string; sku_code: string };

export default function DealerScreen({ navigation }: any) {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [stockQty, setStockQty] = useState('');
  const [orderQty, setOrderQty] = useState('');

  // Previously every audit/order was hardcoded to one fake dealer_id and
  // product_id, so every officer's submission - regardless of which real
  // dealer they were standing in front of - silently wrote to the same
  // dealer's record nationwide. This pulls the real lists instead.
  useEffect(() => {
    apiClient.request('/dealers/search', 'GET', 'stock_audit')
      .then((data: Dealer[]) => setDealers(data || []))
      .catch((err) => console.warn('Failed to load dealers list', err));
    apiClient.request('/dealers/products/catalog', 'GET', 'stock_audit')
      .then((data: Product[]) => setProducts(data || []))
      .catch((err) => console.warn('Failed to load products catalog', err));
  }, []);

  const selectedDealer = dealers.find((d) => d.id === selectedDealerId) ?? null;

  const handleStockAudit = async () => {
    if (!selectedDealerId || !selectedProductId || !stockQty) {
      Alert.alert('Required Fields', 'Please select a dealer, a product, and enter audited stock count.');
      return;
    }
    try {
      await apiClient.request(`/dealers/${selectedDealerId}/stock`, 'POST', 'stock_audit', {
        product_id: selectedProductId,
        stock_qty: parseInt(stockQty, 10),
        notes: 'Field audit via mobile app.',
      });
      Alert.alert('Audit Saved', 'Dealer stock count updated successfully.');
      setStockQty('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Audit submission failed.');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedDealerId || !selectedProductId || !orderQty) {
      Alert.alert('Required Fields', 'Please select a dealer, a product, and enter order item count.');
      return;
    }
    try {
      await apiClient.request(`/dealers/${selectedDealerId}/orders`, 'POST', 'dealer_order', {
        items: [{ product_id: selectedProductId, quantity: parseInt(orderQty, 10) }],
        comments: 'Order placed via mobile app.',
      });
      Alert.alert('Order Booked', 'Dealer purchase order successfully registered.');
      setOrderQty('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Order submission failed.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Dealer Stock & Order Audit</Text>

      <View style={styles.dealerMeta}>
        <Text style={styles.fieldLabel}>Select Dealer</Text>
        {dealers.length === 0 ? (
          <Text style={styles.emptyNote}>No dealers found in your area yet.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {dealers.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.chip, selectedDealerId === d.id && styles.chipActive]}
                onPress={() => setSelectedDealerId(d.id)}
              >
                <Text style={[styles.chipText, selectedDealerId === d.id && styles.chipTextActive]}>{d.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        {selectedDealer && (
          <Text style={styles.dealerDetails}>
            {selectedDealer.district}{selectedDealer.village ? ` · ${selectedDealer.village}` : ''} · {selectedDealer.phone}
          </Text>
        )}
      </View>

      <View style={styles.dealerMeta}>
        <Text style={styles.fieldLabel}>Select Product</Text>
        {products.length === 0 ? (
          <Text style={styles.emptyNote}>No products found in the catalog yet.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {products.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.chip, selectedProductId === p.id && styles.chipActive]}
                onPress={() => setSelectedProductId(p.id)}
              >
                <Text style={[styles.chipText, selectedProductId === p.id && styles.chipTextActive]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Stock Auditing Block */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Audit Current Stock</Text>
        <TextInput
          style={styles.input}
          placeholder="Actual Stock Quantity on Shelf"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={stockQty}
          onChangeText={setStockQty}
        />
        <TouchableOpacity style={styles.btnAction} onPress={handleStockAudit}>
          <Text style={styles.btnText}>Save Stock Count</Text>
        </TouchableOpacity>
      </View>

      {/* Order Booking Block */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Place New Order</Text>
        <TextInput
          style={styles.input}
          placeholder="Required Order Units"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={orderQty}
          onChangeText={setOrderQty}
        />
        <TouchableOpacity style={[styles.btnAction, { backgroundColor: '#1565c0' }]} onPress={handlePlaceOrder}>
          <Text style={styles.btnText}>Book Order Invoice</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
        <Text style={styles.btnBackText}>Go Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1b5e20',
    marginBottom: 16,
    marginTop: 20,
  },
  dealerMeta: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    marginBottom: 20,
  },
  dealerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1b5e20',
  },
  dealerDetails: {
    fontSize: 12,
    color: '#388e3c',
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1b5e20',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  emptyNote: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    backgroundColor: '#ffffff',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#1b5e20',
    borderColor: '#1b5e20',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2e7d32',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 20,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  productLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
    marginBottom: 16,
  },
  btnAction: {
    backgroundColor: '#1b5e20',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  btnBack: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  btnBackText: {
    color: '#1b5e20',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
