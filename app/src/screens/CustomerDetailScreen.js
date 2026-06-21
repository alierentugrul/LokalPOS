import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Alert, ActivityIndicator, StatusBar, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  collection, addDoc, onSnapshot, query,
  where, doc, updateDoc, increment, Timestamp,
  deleteDoc, getDocs, limit, writeBatch
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../config/firebase';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { useToast } from '../components/ToastProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const DEFAULT_PRODUCTS = [
  { id: 'cay', name: 'Çay', emoji: '🍵', price: 10, cost: 3, category: 'Sıcak İçecekler', isActive: true, inStock: true },
  { id: 'kakao', name: 'Kakao', emoji: '🍫', price: 25, cost: 10, category: 'Sıcak İçecekler', isActive: true, inStock: true },
  { id: 'salep', name: 'Salep', emoji: '🥛', price: 25, cost: 8, category: 'Sıcak İçecekler', isActive: true, inStock: true },
  { id: 'ayran', name: 'Ayran', emoji: '🥤', price: 15, cost: 5, category: 'Soğuk İçecekler', isActive: true, inStock: true },
  { id: 'ayran_limon', name: 'T.L. Ayran', emoji: '🍋', price: 20, cost: 7, category: 'Soğuk İçecekler', isActive: true, inStock: true },
  { id: 'tost', name: 'Tost', emoji: '🥪', price: 40, cost: 18, category: 'Yiyecekler', isActive: true, inStock: true },
  { id: 'nescafe', name: 'Nescafe', emoji: '☕', price: 30, cost: 8, category: 'Sıcak İçecekler', isActive: true, inStock: true },
  { id: 'su', name: 'Su', emoji: '💧', price: 5, cost: 1, category: 'Soğuk İçecekler', isActive: true, inStock: true },
];

export default function CustomerDetailScreen({ route, navigation }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { showToast } = useToast();

  const { customer } = route.params;
  const [customerData, setCustomerData] = useState(customer);
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  
  // Sipariş modalı (tek ürün)
  const [orderModal, setOrderModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState('veresiye');
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Tümü');

  // Sipariş detay/silme/düzenleme modalı
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [draftOrder, setDraftOrder] = useState(null);
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // Sepet (toplu sipariş) state
  const [cart, setCart] = useState([]); // [{product, qty, type}]
  const [cartModal, setCartModal] = useState(false);
  const [cartOrderType, setCartOrderType] = useState('veresiye');
  const [savingCart, setSavingCart] = useState(false);

  // Müşteri bilgisi dinle
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'customers', customer.id), (d) => {
      if (d.exists()) setCustomerData({ id: d.id, ...d.data() });
    });
    return unsub;
  }, []);

  // Ürünleri dinle
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const qProducts = query(collection(db, 'products'), where('userId', '==', uid));
    const unsub = onSnapshot(qProducts, (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
        setProducts(list);
      }
    });
    return unsub;
  }, []);

  // Siparişleri dinle
  useEffect(() => {
    const qOrders = query(collection(db, 'orders'), where('customerId', '==', customer.id));
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const list = snap.docs.map(doc => {
        const data = doc.data();
        // Geriye dönük uyumluluk: Eski siparişleri "items" formatına çevir
        if (!data.items) {
          return {
            id: doc.id,
            ...data,
            items: [{
              productId: data.productId,
              productName: data.productName,
              productEmoji: data.productEmoji,
              price: data.price,
              cost: data.cost,
              quantity: data.quantity,
              total: data.total
            }]
          };
        }
        return { ...data, id: doc.id };
      }).filter(o => o.status !== 'cancelled');
      setOrders(list.sort((a, b) => {
        const at = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0);
        const bt = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0);
        return bt - at;
      }));
      setLoadingOrders(false);
    });
    return unsubOrders;
  }, []);

  const openOrder = (p) => {
    setSelectedProduct(p);
    setQuantity(1);
    setOrderType('veresiye');
    setOrderModal(true);
  };

  const openOrderDetails = (o) => {
    setSelectedOrder(o);
    setDraftOrder({
      ...o,
      items: o.items ? o.items.map(i => ({...i})) : []
    });
  };

  // Sepete ekle
  const addToCart = (p) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === p.id);
      if (existing) {
        return prev.map(i => i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product: p, qty: 1 }];
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast({ message: `${p.emoji} ${p.name} sepete eklendi`, type: 'success', duration: 1500 });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const updateCartQty = (productId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.product.id === productId) {
        const newQty = Math.max(1, i.qty + delta);
        return { ...i, qty: newQty };
      }
      return i;
    }));
  };

  const cartTotal = cart.reduce((sum, i) => sum + (i.product.price * i.qty), 0);

  const confirmOrder = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      const isIkram = orderType === 'ikram';
      const cost = selectedProduct.cost || 0;
      const unitPrice = isIkram ? 0 : selectedProduct.price;
      const total = unitPrice * quantity;
      const totalCost = cost * quantity;
      const netProfit = total - totalCost;

      const uid = auth.currentUser.uid;
      const orderRef = await addDoc(collection(db, 'orders'), {
        userId: uid,
        customerId: customer.id,
        customerName: customerData.name,
        items: [{
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          productEmoji: selectedProduct.emoji,
          price: unitPrice,
          cost: cost,
          quantity,
          total
        }],
        total: total,
        netProfit,
        status: orderType,
        createdAt: Timestamp.now(),
      });

      if (orderType === 'veresiye') {
        await updateDoc(doc(db, 'customers', customer.id), { balance: increment(total) });
      } else if (orderType === 'pesin') {
        await addDoc(collection(db, 'payments'), {
          userId: uid,
          customerId: customer.id,
          customerName: customerData.name + ' (Nakit Satış)',
          amount: total,
          source: 'pesin_order',
          orderId: orderRef.id,
          createdAt: Timestamp.now(),
        });
      }

      setOrderModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({ message: `✅ ${selectedProduct.emoji} ${selectedProduct.name} kaydedildi`, type: 'success' });
    } catch (e) {
      Alert.alert('Hata', 'Sipariş kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  // Sepeti Onayla (Toplu Sipariş)
  const confirmCart = async () => {
    if (cart.length === 0) return;
    setSavingCart(true);
    try {
      const now = Timestamp.now();
      let totalVeresiye = 0;
      let totalPesin = 0;
      let totalNetProfit = 0;
      let grandTotal = 0;

      const items = cart.map(item => {
        const isIkram = cartOrderType === 'ikram';
        const unitPrice = isIkram ? 0 : item.product.price;
        const cost = item.product.cost || 0;
        const total = unitPrice * item.qty;
        
        totalVeresiye += (cartOrderType === 'veresiye' ? total : 0);
        totalPesin += (cartOrderType === 'pesin' ? total : 0);
        totalNetProfit += (total - (cost * item.qty));
        grandTotal += total;

        return {
          productId: item.product.id,
          productName: item.product.name,
          productEmoji: item.product.emoji,
          price: unitPrice,
          cost,
          quantity: item.qty,
          total
        };
      });

      const uid = auth.currentUser.uid;
      const orderRef = await addDoc(collection(db, 'orders'), {
        userId: uid,
        customerId: customer.id,
        customerName: customerData.name,
        items,
        total: grandTotal,
        netProfit: totalNetProfit,
        status: cartOrderType,
        createdAt: now,
      });

      if (totalVeresiye > 0) {
        await updateDoc(doc(db, 'customers', customer.id), { balance: increment(totalVeresiye) });
      } else if (totalPesin > 0) {
        await addDoc(collection(db, 'payments'), {
          userId: uid,
          customerId: customer.id,
          customerName: customerData.name + ' (Nakit Satış)',
          amount: totalPesin,
          source: 'pesin_order',
          orderId: orderRef.id,
          createdAt: now,
        });
      }

      const itemCount = cart.reduce((s, i) => s + i.qty, 0);
      setCart([]);
      setCartModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({ message: `✅ Sepet onaylandı (${cart.length} çeşit ürün)`, type: 'success' });
    } catch (e) {
      Alert.alert('Hata', 'Sepet kaydedilemedi.');
    } finally {
      setSavingCart(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    setDeletingOrder(true);
    try {
      await updateDoc(doc(db, 'orders', selectedOrder.id), { status: 'cancelled' });

      if (selectedOrder.status === 'veresiye') {
        await updateDoc(doc(db, 'customers', customer.id), {
          balance: increment(-(selectedOrder.total || 0))
        });
      } else if (selectedOrder.status === 'pesin') {
        const payQ = query(collection(db, 'payments'), where('orderId', '==', selectedOrder.id), limit(1));
        const paySnap = await getDocs(payQ);
        if (!paySnap.empty) {
          await updateDoc(doc(db, 'payments', paySnap.docs[0].id), { status: 'cancelled' });
        }
      }

      showToast({ message: '🗑️ Sipariş silindi ve hesaplar güncellendi', type: 'warning' });
      setSelectedOrder(null);
    } catch (e) {
      Alert.alert('Hata', 'Sipariş silinirken bir hata oluştu.');
    } finally {
      setDeletingOrder(false);
    }
  };

  const confirmDeleteOrder = () => {
    Alert.alert(
      'Siparişi İptal Et',
      'Bu sipariş tamamen silinecek ve bakiye/kasa hesaplamaları geri alınacaktır. Onaylıyor musunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: handleDeleteOrder }
      ]
    );
  };

  const handleUpdateOrderItemQty = (index, delta) => {
    if (!draftOrder || !draftOrder.items) return;
    
    const newItems = [...draftOrder.items];
    const item = newItems[index];
    const newQty = item.quantity + delta;
    
    if (newQty < 1) return;

    const isIkram = draftOrder.status === 'ikram';
    const unitPrice = isIkram ? 0 : item.price;

    newItems[index] = {
      ...item,
      quantity: newQty,
      total: newQty * unitPrice
    };

    const newOrderTotal = newItems.reduce((s, i) => s + (i.total || 0), 0);
    const newOrderCost = newItems.reduce((s, i) => s + ((i.cost || 0) * i.quantity), 0);
    const newOrderNetProfit = newOrderTotal - newOrderCost;

    setDraftOrder(prev => ({
      ...prev,
      items: newItems,
      total: newOrderTotal,
      netProfit: newOrderNetProfit
    }));
  };

  const handleRemoveOrderItem = (index) => {
    if (!draftOrder || !draftOrder.items) return;
    
    const newItems = [...draftOrder.items];
    newItems.splice(index, 1);

    const newOrderTotal = newItems.reduce((s, i) => s + (i.total || 0), 0);
    const newOrderCost = newItems.reduce((s, i) => s + ((i.cost || 0) * i.quantity), 0);
    const newOrderNetProfit = newOrderTotal - newOrderCost;

    setDraftOrder(prev => ({
      ...prev,
      items: newItems,
      total: newOrderTotal,
      netProfit: newOrderNetProfit
    }));
  };

  const hasDraftChanges = () => {
    if (!draftOrder || !selectedOrder) return false;
    return JSON.stringify(draftOrder.items) !== JSON.stringify(selectedOrder.items);
  };

  const handleSaveChanges = async () => {
    if (!draftOrder || !selectedOrder) return;
    if (!hasDraftChanges()) {
      setDraftOrder(null);
      setSelectedOrder(null);
      return;
    }

    if (draftOrder.items.length === 0) {
      await handleDeleteOrder();
      setDraftOrder(null);
      return;
    }

    setSavingOrder(true);
    const diffTotal = draftOrder.total - selectedOrder.total;

    try {
      await updateDoc(doc(db, 'orders', selectedOrder.id), {
        items: draftOrder.items,
        total: draftOrder.total,
        netProfit: draftOrder.netProfit
      });

      if (selectedOrder.status === 'veresiye') {
        await updateDoc(doc(db, 'customers', customer.id), {
          balance: increment(diffTotal)
        });
      } else if (selectedOrder.status === 'pesin') {
        const payQ = query(collection(db, 'payments'), where('orderId', '==', selectedOrder.id), limit(1));
        const paySnap = await getDocs(payQ);
        if (!paySnap.empty) {
          await updateDoc(doc(db, 'payments', paySnap.docs[0].id), {
            amount: increment(diffTotal)
          });
        }
      }

      showToast({ message: 'Adisyon güncellendi', type: 'success' });
      setDraftOrder(null);
      setSelectedOrder(null);
    } catch (e) {
      Alert.alert("Hata", "Adisyon güncellenirken bir hata oluştu.");
    } finally {
      setSavingOrder(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const todayOrders = orders.filter((o) => {
    if (!o.createdAt) return false;
    const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    return d.toDateString() === new Date().toDateString();
  });

  const balance = customerData.balance || 0;
  const isDebt = balance > 0;

  // Dinamik Ürün Filtreleme (Kategori + Aktif/Pasif + Tümü)
  const activeProducts = products.filter(p => p.isActive !== false);
  const categories = ['Tümü', ...new Set(activeProducts.map(p => p.category || 'Diğer'))];
  
  const displayedProducts = activeCategory === 'Tümü'
    ? activeProducts
    : activeProducts.filter(p => (p.category || 'Diğer') === activeCategory);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Gradient Header */}
      <LinearGradient
        colors={isDebt ? [colors.dangerMuted, colors.background] : [colors.successMuted, colors.background]}
        style={styles.headerGrad}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>MÜŞTERİ PANELİ</Text>
          <Text style={styles.headerName}>{customerData.name}</Text>
        </View>
        <View style={{ width: 38 }} />
      </LinearGradient>

      {/* Bakiye göstergesi */}
      <View style={[styles.balanceCard, isDebt ? styles.balanceCardDebt : styles.balanceCardOk]}>
        <View>
          <Text style={styles.balanceLabel}>MEVCUT VERESİYE</Text>
          <Text style={[styles.balanceAmount, { color: isDebt ? colors.danger : colors.accent }]}>
            ₺{balance.toFixed(2)}
          </Text>
        </View>
        <View style={styles.balanceIcon}>
          <Ionicons
            name={isDebt ? 'alert-circle' : 'checkmark-circle'}
            size={32}
            color={isDebt ? colors.danger : colors.accent}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        <View style={styles.orderHeaderRow}>
          <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>HIZLI SİPARİŞ</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {cart.length > 0 && (
              <TouchableOpacity
                style={[styles.cartBadgeBtn, { backgroundColor: colors.primary }]}
                onPress={() => setCartModal(true)}
              >
                <Ionicons name="cart" size={14} color={colors.textInverse} />
                <Text style={{ fontFamily: typography.monoBold, fontSize: 11, color: colors.textInverse }}>
                  {cart.reduce((s, i) => s + i.qty, 0)} kalem
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Kategori Sekmeleri */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{ paddingRight: 20 }}>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.categoryTab, activeCategory === cat && { backgroundColor: colors.primary, borderColor: colors.primaryDark }]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.categoryTabText, activeCategory === cat && { color: colors.textInverse, fontFamily: typography.monoBold }]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.grid}>
          {displayedProducts.map((p) => {
            const isOutOfStock = p.inStock === false;
            const cartItem = cart.find(i => i.product.id === p.id);
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.productBtn, isOutOfStock && { borderColor: colors.cardBorderLight }, cartItem && { borderColor: colors.primary }]}
                onPress={() => !isOutOfStock && addToCart(p)}
                onLongPress={() => !isOutOfStock && openOrder(p)}
                activeOpacity={0.7}
                disabled={isOutOfStock}
              >
                <LinearGradient colors={[colors.cardAlt, colors.card]} style={[styles.productBtnInner, isOutOfStock && { opacity: 0.5 }]}>
                  {isOutOfStock && (
                    <View style={styles.outOfStockBadge}>
                      <Text style={styles.outOfStockText}>TÜKENDİ</Text>
                    </View>
                  )}
                  {cartItem && (
                    <View style={styles.cartItemBadge}>
                      <Text style={styles.cartItemBadgeText}>×{cartItem.qty}</Text>
                    </View>
                  )}
                  <Text style={[styles.productEmoji, isOutOfStock && { opacity: 0.5 }]}>{p.emoji}</Text>
                  <Text style={[styles.productName, isOutOfStock && { color: colors.textMuted }]} numberOfLines={1}>{p.name}</Text>
                  <Text style={[styles.productPrice, isOutOfStock && { color: colors.textMuted }]}>₺{p.price}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )
          })}
        </View>
        {/* Sepet ipucu */}
        <Text style={{ fontFamily: typography.mono, fontSize: 9, color: colors.textMuted, textAlign: 'center', marginBottom: 12 }}>
          Tek tıkla sepete ekle • Uzun bas → tek sipariş
        </Text>

        {/* Bugünkü siparişler */}
        <Text style={styles.sectionLabel}>BUGÜN — {todayOrders.length} SİPARİŞ</Text>
        {loadingOrders ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
        ) : todayOrders.length === 0 ? (
          <Text style={styles.emptyText}>Bugün henüz sipariş yok.</Text>
        ) : (
          todayOrders.map((o) => {
            const isGroup = o.items && o.items.length > 1;
            const emoji = isGroup ? '🛒' : (o.items?.[0]?.productEmoji || '📦');
            const name = isGroup ? `${o.items.reduce((s, i) => s + i.quantity, 0)} Kalem Sipariş (Fiş)` : (o.items?.[0]?.productName || 'Bilinmeyen Ürün');
            
            return (
              <TouchableOpacity key={o.id} style={styles.orderRow} onPress={() => openOrderDetails(o)} activeOpacity={0.7}>
                <View style={[
                  styles.orderLeft,
                  { backgroundColor: o.status === 'ikram' ? colors.warning : (o.status === 'pesin' ? colors.accent : colors.danger) }
                ]} />
                <Text style={styles.orderEmoji}>{emoji}</Text>
                <View style={styles.orderInfo}>
                  <Text style={[styles.orderName, isGroup && { color: colors.primary }]} numberOfLines={1}>{name}</Text>
                  <Text style={styles.orderDate}>{formatDate(o.createdAt)} • {isGroup ? o.status.toUpperCase() : (o.status === 'pesin' ? 'PEŞİN' : (o.status === 'ikram' ? 'İKRAM' : 'VERESİYE'))}</Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderQty}>{!isGroup && `×${o.items?.[0]?.quantity || 1}`}</Text>
                  <Text style={[
                    styles.orderTotal,
                    { color: o.status === 'ikram' ? colors.warning : (o.status === 'pesin' ? colors.accent : colors.danger) }
                  ]}>
                    {o.status === 'ikram' ? 'Ücretsiz' : `₺${o.total?.toFixed(2)}`}
                  </Text>
                </View>
              </TouchableOpacity>
            )})
        )}

        {/* Geçmiş */}
        {orders.length > todayOrders.length && (
          <>
            <Text style={styles.sectionLabel}>GEÇMİŞ SİPARİŞLER</Text>
            {orders.filter((o) => !todayOrders.find((t) => t.id === o.id)).slice(0, 20).map((o) => {
              const isGroup = o.items && o.items.length > 1;
              const emoji = isGroup ? '🛒' : (o.items?.[0]?.productEmoji || '📦');
              const name = isGroup ? `${o.items.reduce((s, i) => s + i.quantity, 0)} Kalem Sipariş (Fiş)` : (o.items?.[0]?.productName || 'Bilinmeyen Ürün');
              
              return (
              <TouchableOpacity key={o.id} style={[styles.orderRow, { opacity: 0.55 }]} onPress={() => openOrderDetails(o)} activeOpacity={0.7}>
                <View style={[
                  styles.orderLeft,
                  { backgroundColor: o.status === 'ikram' ? colors.warning : (o.status === 'pesin' ? colors.accent : colors.danger) }
                ]} />
                <Text style={styles.orderEmoji}>{emoji}</Text>
                <View style={styles.orderInfo}>
                  <Text style={[styles.orderName, isGroup && { color: colors.primary }]} numberOfLines={1}>{name}</Text>
                  <Text style={styles.orderDate}>{formatDate(o.createdAt)} • {isGroup ? o.status.toUpperCase() : (o.status === 'pesin' ? 'PEŞİN' : (o.status === 'ikram' ? 'İKRAM' : 'VERESİYE'))}</Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderQty}>{!isGroup && `×${o.items?.[0]?.quantity || 1}`}</Text>
                  <Text style={[
                    styles.orderTotal,
                    { color: o.status === 'ikram' ? colors.warning : (o.status === 'pesin' ? colors.accent : colors.danger) }
                  ]}>
                    {o.status === 'ikram' ? 'Ücretsiz' : `₺${o.total?.toFixed(2)}`}
                  </Text>
                </View>
              </TouchableOpacity>
            )})}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Sipariş Modalı */}
      <Modal visible={orderModal} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {selectedProduct && (
              <>
                <Text style={styles.sheetEmoji}>{selectedProduct.emoji}</Text>
                <Text style={styles.sheetProductName}>{selectedProduct.name}</Text>
                <Text style={styles.sheetUnitPrice}>
                  <Text style={{ fontFamily: typography.mono }}>fiyat: </Text>
                  <Text style={{ fontFamily: typography.monoBold, color: colors.primary }}>
                    ₺{selectedProduct.price}
                  </Text>
                  <Text style={{ fontFamily: typography.mono, color: colors.textMuted }}> (maliyet: ₺{selectedProduct.cost || 0})</Text>
                </Text>

                {/* İşlem Tipi Seçimi */}
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[styles.typeBtn, orderType === 'veresiye' && { backgroundColor: colors.danger + '22', borderColor: colors.danger }]}
                    onPress={() => setOrderType('veresiye')}
                  >
                    <Text style={[styles.typeText, orderType === 'veresiye' && { color: colors.danger, fontFamily: typography.monoBold }]}>Veresiye</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeBtn, orderType === 'pesin' && { backgroundColor: colors.accent + '22', borderColor: colors.accent }]}
                    onPress={() => setOrderType('pesin')}
                  >
                    <Text style={[styles.typeText, orderType === 'pesin' && { color: colors.accent, fontFamily: typography.monoBold }]}>Nakit (Peşin)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeBtn, orderType === 'ikram' && { backgroundColor: colors.warning + '22', borderColor: colors.warning }]}
                    onPress={() => setOrderType('ikram')}
                  >
                    <Text style={[styles.typeText, orderType === 'ikram' && { color: colors.warning, fontFamily: typography.monoBold }]}>İkram/Fire</Text>
                  </TouchableOpacity>
                </View>

                {/* Miktar */}
                <View style={styles.qtyRow}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
                    <Ionicons name="remove" size={20} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.qtyNum}>{quantity}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(quantity + 1)}>
                    <Ionicons name="add" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.totalLine}>
                  {orderType === 'ikram' ? 'İkram Maliyeti:' : 'Toplam:'}{' '}
                  <Text style={[styles.totalAmt, orderType === 'ikram' && { color: colors.warning }]}>
                    ₺{orderType === 'ikram' ? (selectedProduct.cost * quantity).toFixed(2) : (selectedProduct.price * quantity).toFixed(2)}
                  </Text>
                </Text>

                <View style={[
                  styles.statusChip,
                  {
                    backgroundColor: orderType === 'ikram' ? colors.warningMuted : (orderType === 'pesin' ? colors.successMuted : colors.dangerMuted),
                    borderColor: orderType === 'ikram' ? colors.warning + '33' : (orderType === 'pesin' ? colors.accent + '33' : colors.danger + '33'),
                  }
                ]}>
                  <Ionicons
                    name={orderType === 'ikram' ? "gift-outline" : (orderType === 'pesin' ? "cash-outline" : "time-outline")}
                    size={13}
                    color={orderType === 'ikram' ? colors.warning : (orderType === 'pesin' ? colors.accent : colors.danger)}
                  />
                  <Text style={[
                    styles.statusChipText,
                    { color: orderType === 'ikram' ? colors.warning : (orderType === 'pesin' ? colors.accent : colors.danger) }
                  ]}>
                    {orderType === 'veresiye' && 'Veresiye kaydedilecek (Bakiyeye eklenir)'}
                    {orderType === 'pesin' && 'Peşin alındı (Kasaya eklenir, bakiye artmaz)'}
                    {orderType === 'ikram' && 'İkram/Fire (Maliyetten düşer, ciroya eklenmez)'}
                  </Text>
                </View>

                <View style={styles.sheetActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setOrderModal(false)}>
                    <Text style={styles.cancelText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtnWrap} onPress={confirmOrder} disabled={saving}>
                    <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.confirmBtn}>
                      {saving ? <ActivityIndicator color={colors.textInverse} /> : (
                        <Text style={styles.confirmText}>Onayla</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Sipariş Detay / Düzenleme / Silme Modalı */}
      <Modal visible={!!selectedOrder} transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: colors.cardBorder }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontFamily: typography.displayBold, fontSize: 18, color: colors.text }}>Adisyon (Fiş) Detayı</Text>
              <TouchableOpacity onPress={() => { setSelectedOrder(null); setDraftOrder(null); }}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {draftOrder && (
              <>
                {/* Üst Bilgi */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: colors.card, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder }}>
                  <Text style={{ fontSize: 32, marginRight: 12 }}>
                    {draftOrder.items?.length > 1 ? '🧾' : (draftOrder.items?.[0]?.productEmoji || '📦')}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: typography.displayBold, fontSize: 16, color: colors.text }}>
                      {draftOrder.items?.length > 1 ? 'Toplu Sipariş' : (draftOrder.items?.[0]?.productName || 'Bilinmeyen Ürün')}
                    </Text>
                    <Text style={{ fontFamily: typography.mono, fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                      {formatDate(draftOrder.createdAt)} • {draftOrder.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: typography.monoBold, fontSize: 18, color: draftOrder.status === 'ikram' ? colors.warning : (draftOrder.status === 'pesin' ? colors.accent : colors.danger) }}>
                    {draftOrder.status === 'ikram' ? 'Ücretsiz' : `₺${draftOrder.total?.toFixed(2)}`}
                  </Text>
                </View>

                {/* İçindeki Ürünler */}
                {draftOrder.items && draftOrder.items.length > 0 ? (
                  <View style={{ marginBottom: 12, maxHeight: 180 }}>
                    <Text style={{ fontFamily: typography.mono, fontSize: 10, color: colors.textMuted, marginBottom: 8, letterSpacing: 1 }}>FİŞ İÇERİĞİ</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {draftOrder.items.map((it, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: idx !== draftOrder.items.length -1 ? 1 : 0, borderColor: colors.cardBorderLight }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ fontSize: 18, marginRight: 8 }}>{it.productEmoji}</Text>
                            <Text style={{ fontFamily: typography.displayBold, fontSize: 14, color: colors.text }}>{it.productName}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            {draftOrder.status !== 'ikram' && (
                              <Text style={{ fontFamily: typography.monoBold, fontSize: 13, color: colors.text }}>₺{it.total?.toFixed(2)}</Text>
                            )}
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder }}>
                              <TouchableOpacity style={{ padding: 6, opacity: it.quantity <= 1 ? 0.3 : 1 }} disabled={it.quantity <= 1} onPress={() => handleUpdateOrderItemQty(idx, -1)}>
                                <Ionicons name="remove" size={16} color={colors.text} />
                              </TouchableOpacity>
                              <Text style={{ fontFamily: typography.monoBold, fontSize: 14, minWidth: 20, textAlign: 'center', color: colors.primary }}>{it.quantity}</Text>
                              <TouchableOpacity style={{ padding: 6 }} onPress={() => handleUpdateOrderItemQty(idx, 1)}>
                                <Ionicons name="add" size={16} color={colors.text} />
                              </TouchableOpacity>
                            </View>
                            <TouchableOpacity style={{ padding: 4, marginLeft: 2 }} onPress={() => handleRemoveOrderItem(idx)}>
                              <Ionicons name="trash-outline" size={18} color={colors.danger} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                ) : (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ fontFamily: typography.mono, color: colors.danger, textAlign: 'center' }}>Fişte ürün kalmadı. Değişiklikleri kaydederseniz bu fiş tamamen silinecektir.</Text>
                  </View>
                )}

                {/* Butonlar */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: colors.danger + '15', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderWidth: 1, borderColor: colors.danger + '44' }}
                    onPress={confirmDeleteOrder}
                    disabled={deletingOrder || savingOrder}
                  >
                    {deletingOrder ? <ActivityIndicator color={colors.danger} /> : (
                      <>
                        <Ionicons name="trash-outline" size={18} color={colors.danger} style={{ marginRight: 6 }} />
                        <Text style={{ fontFamily: typography.displayBold, color: colors.danger, fontSize: 13 }}>Tüm Fişi İptal Et</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: hasDraftChanges() ? colors.primary : colors.cardBorder, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
                    onPress={handleSaveChanges}
                    disabled={savingOrder || deletingOrder || !hasDraftChanges()}
                  >
                    {savingOrder ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <Ionicons name="save-outline" size={18} color={hasDraftChanges() ? "#fff" : colors.textMuted} style={{ marginRight: 6 }} />
                        <Text style={{ fontFamily: typography.displayBold, color: hasDraftChanges() ? "#fff" : colors.textMuted, fontSize: 13 }}>{draftOrder.items.length === 0 ? "Fişi Sil" : "Kaydet"}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* SEPET MODALI */}
      <Modal visible={cartModal} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontFamily: typography.displayBold, fontSize: 20, color: colors.text }}>🛒 Sepet</Text>
              <TouchableOpacity onPress={() => setCartModal(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              {cart.map((item) => (
                <View key={item.product.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: colors.card, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder }}>
                  <Text style={{ fontSize: 24, marginRight: 10 }}>{item.product.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: typography.displayBold, fontSize: 14, color: colors.text }}>{item.product.name}</Text>
                    <Text style={{ fontFamily: typography.mono, fontSize: 11, color: colors.textMuted }}>₺{item.product.price} × {item.qty} = ₺{(item.product.price * item.qty).toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity onPress={() => updateCartQty(item.product.id, -1)} style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="remove" size={14} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={{ fontFamily: typography.monoBold, fontSize: 16, color: colors.text, minWidth: 20, textAlign: 'center' }}>{item.qty}</Text>
                    <TouchableOpacity onPress={() => updateCartQty(item.product.id, 1)} style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="add" size={14} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeFromCart(item.product.id)} style={{ marginLeft: 4 }}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Ödeme Tipi */}
            <View style={[styles.typeSelector, { marginTop: 12 }]}>
              {['veresiye', 'pesin', 'ikram'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, cartOrderType === t && {
                    backgroundColor: t === 'veresiye' ? colors.danger + '22' : t === 'pesin' ? colors.accent + '22' : colors.warning + '22',
                    borderColor: t === 'veresiye' ? colors.danger : t === 'pesin' ? colors.accent : colors.warning,
                  }]}
                  onPress={() => setCartOrderType(t)}
                >
                  <Text style={[styles.typeText, cartOrderType === t && {
                    color: t === 'veresiye' ? colors.danger : t === 'pesin' ? colors.accent : colors.warning,
                    fontFamily: typography.monoBold
                  }]}>{t === 'veresiye' ? 'Veresiye' : t === 'pesin' ? 'Nakit' : 'İkram'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Toplam ve Onayla */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <View>
                <Text style={{ fontFamily: typography.mono, fontSize: 10, color: colors.textMuted }}>TOPLAM</Text>
                <Text style={{ fontFamily: typography.monoBold, fontSize: 26, color: colors.primary }}>₺{cartTotal.toFixed(2)}</Text>
              </View>
              <TouchableOpacity onPress={confirmCart} disabled={savingCart} style={{ borderRadius: 14, overflow: 'hidden', flex: 1, marginLeft: 16 }}>
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={{ height: 52, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                  {savingCart ? <ActivityIndicator color={colors.textInverse} /> : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color={colors.textInverse} />
                      <Text style={{ fontFamily: typography.displayBold, color: colors.textInverse, fontSize: 15 }}>Siparişi Onayla</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  headerGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 18,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: colors.card + 'CC',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerLabel: {
    fontFamily: typography.mono,
    fontSize: 8,
    color: colors.primary,
    letterSpacing: 3,
    marginBottom: 3,
  },
  headerName: {
    fontFamily: typography.displayBold,
    fontSize: 18,
    color: colors.text,
  },
  balanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
  },
  balanceCardDebt: { backgroundColor: colors.dangerMuted, borderColor: colors.danger + '44' },
  balanceCardOk: { backgroundColor: colors.successMuted, borderColor: colors.accent + '44' },
  balanceLabel: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 6,
  },
  balanceAmount: {
    fontFamily: typography.monoBold,
    fontSize: 32,
  },
  balanceIcon: {},
  scroll: { paddingHorizontal: 20 },
  
  orderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 2.5,
    marginBottom: 10,
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: 8,
  },
  categoryTabText: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.textMuted,
  },
  
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  productBtn: {
    width: '23%',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  productBtnInner: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 4,
  },
  outOfStockBadge: {
    position: 'absolute',
    top: -5,
    right: -15,
    backgroundColor: colors.danger,
    paddingHorizontal: 14,
    paddingVertical: 2,
    transform: [{ rotate: '45deg' }],
    zIndex: 10,
  },
  outOfStockText: {
    fontFamily: typography.monoBold,
    fontSize: 6,
    color: '#FFF',
  },
  cartItemBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.card,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  cartItemBadgeText: {
    fontFamily: typography.monoBold,
    fontSize: 10,
    color: '#FFF',
  },
  productEmoji: { fontSize: 24 },
  productName: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.textLight,
    textAlign: 'center',
  },
  productPrice: {
    fontFamily: typography.monoBold,
    fontSize: 12,
    color: colors.primary,
  },
  emptyText: {
    fontFamily: typography.mono,
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 16,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  orderLeft: { width: 3, alignSelf: 'stretch' },
  orderEmoji: { fontSize: 20, marginHorizontal: 10 },
  orderInfo: { flex: 1 },
  orderName: { fontFamily: typography.displayBold, fontSize: 13, color: colors.text },
  orderDate: { fontFamily: typography.mono, fontSize: 10, color: colors.textMuted, marginTop: 2 },
  orderRight: { alignItems: 'flex-end', paddingRight: 12 },
  orderQty: { fontFamily: typography.mono, fontSize: 11, color: colors.textMuted },
  orderTotal: { fontFamily: typography.monoBold, fontSize: 14 },
  cartBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 28, paddingBottom: 48,
    alignItems: 'center',
    borderTopWidth: 1, borderColor: colors.cardBorder,
  },
  sheetHandle: {
    width: 36, height: 3, borderRadius: 2,
    backgroundColor: colors.cardBorderLight, marginBottom: 12,
  },
  sheetEmoji: { fontSize: 52, marginBottom: 8 },
  sheetProductName: {
    fontFamily: typography.displayBold,
    fontSize: 24,
    color: colors.text,
    marginBottom: 4,
  },
  sheetUnitPrice: { fontSize: 13, color: colors.textMuted, marginBottom: 16 },
  
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    width: '100%',
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  typeText: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.textMuted,
  },

  qtyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 16,
  },
  qtyBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  qtyNum: {
    fontFamily: typography.monoBold,
    fontSize: 32,
    color: colors.text,
    minWidth: 40,
    textAlign: 'center',
  },
  totalLine: { fontSize: 15, color: colors.textLight, marginBottom: 12 },
  totalAmt: { fontFamily: typography.monoBold, fontSize: 22, color: colors.primary },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 24, borderWidth: 1,
  },
  statusChipText: { fontFamily: typography.mono, fontSize: 10, flex: 1 },
  sheetActions: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: {
    flex: 1, height: 52, borderRadius: 12,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  cancelText: { fontFamily: typography.mono, color: colors.textMuted, fontSize: 14 },
  confirmBtnWrap: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  confirmBtn: { height: 52, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontFamily: typography.displayBold, color: colors.textInverse, fontSize: 15 },
});
