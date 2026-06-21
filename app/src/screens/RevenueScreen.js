import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  collection, query, where, orderBy, onSnapshot, Timestamp,
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../config/firebase';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';

const TABS = ['Bugün', 'Bu Hafta', 'Bu Ay'];

function getDateRange(tab) {
  const now = new Date();
  let start;
  if (tab === 'Bugün') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (tab === 'Bu Hafta') {
    const day = now.getDay() || 7;
    start = new Date(now);
    start.setDate(now.getDate() - day + 1);
    start.setHours(0, 0, 0, 0);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return Timestamp.fromDate(start);
}

export default function RevenueScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [activeTab, setActiveTab] = useState('Bugün');
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);

  // Siparişleri Dinle
  useEffect(() => {
    if (!auth.currentUser) return;
    setLoadingOrders(true);
    const startTs = getDateRange(activeTab);
    const uid = auth.currentUser.uid;
    const q = query(collection(db, 'orders'), where('userId', '==', uid));
    
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((doc) => {
        const data = doc.data();
        if (!data.items) {
          return {
            ...data,
            id: doc.id,
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
      });
      
      const filtered = list.filter(o => {
        const oDate = o.createdAt?.toDate?.() || new Date(0);
        return oDate >= startTs.toDate() && o.status !== 'cancelled';
      }).sort((a, b) => {
        const at = a.createdAt?.toDate?.() || new Date(0);
        const bt = b.createdAt?.toDate?.() || new Date(0);
        return bt - at;
      });
      
      setOrders(filtered);
      setLoadingOrders(false);
    });
    return unsub;
  }, [activeTab]);

  // Tahsilatları (Kasa girişleri) Dinle
  useEffect(() => {
    if (!auth.currentUser) return;
    setLoadingPayments(true);
    const startTs = getDateRange(activeTab);
    const uid = auth.currentUser.uid;
    const q = query(collection(db, 'payments'), where('userId', '==', uid));
    
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      const filtered = list.filter((p) => {
        const pDate = p.createdAt?.toDate?.() || new Date(0);
        return pDate >= startTs.toDate() && p.status !== 'cancelled';
      }).sort((a, b) => {
        const at = a.createdAt?.toDate?.() || new Date(0);
        const bt = b.createdAt?.toDate?.() || new Date(0);
        return bt - at;
      });
      setPayments(filtered);
      setLoadingPayments(false);
    });
    return unsub;
  }, [activeTab]);

  const isLoading = loadingOrders || loadingPayments;

  // METRİK HESAPLAMALARI
  // 1. Brüt Ciro (Tahakkuk): Sadece para eden satışlar (Veresiye + Peşin). İkramlar dahil edilmez.
  const revenueOrders = orders.filter((o) => o.status === 'veresiye' || o.status === 'pesin' || o.status === 'odendi'); // Eski "odendi" kayıtları desteklemek için
  const totalRevenue = revenueOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalSalesCount = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + (i.quantity || 1), 0), 0);

  // 2. Nakit Akışı (Kasa Girişi): Peşin satışlar + Veresiye Tahsilatları
  const pesinOrders = orders.filter((o) => o.status === 'pesin' || o.status === 'odendi');
  const pesinTotal = pesinOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const paymentsTotal = payments.filter(p => p.source !== 'pesin_order').reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalCashIn = pesinTotal + paymentsTotal;

  // 3. Gerçek Net Kâr: Veritabanındaki netProfit alanlarının toplamı (İkram maliyetleri de buradan düşmüş oluyor)
  const totalNetProfit = orders.reduce((sum, o) => sum + (o.netProfit || 0), 0);
  
  // Eskiden kalma netProfit olmayan siparişler için tahmini kâr hesabı (Geriye dönük uyumluluk)
  const legacyProfit = orders.filter(o => o.netProfit === undefined).reduce((sum, o) => {
    // Eğer maliyet yoksa %50 kar varsay, ikramları 0 kar say (hatalı hesaplamamak için)
    if (o.status === 'ikram') return sum;
    return sum + ((o.total || 0) * 0.5); 
  }, 0);
  const finalNetProfit = totalNetProfit + legacyProfit;

  // ÜRÜN ANALİZLERİ (Sürüm ve Kâr Jeneratörleri)
  const productMap = orders.reduce((acc, o) => {
    o.items.forEach(item => {
      if (!item.productId) return;
      if (!acc[item.productId]) {
        acc[item.productId] = { name: item.productName, emoji: item.productEmoji, count: 0, profit: 0, total: 0 };
      }
      acc[item.productId].count += item.quantity || 1;
      acc[item.productId].total += item.total || 0;
      
      if (o.status !== 'ikram') {
        const cost = item.cost;
        if (cost !== undefined) {
          acc[item.productId].profit += ((item.total || 0) - (cost * (item.quantity || 1)));
        } else {
          // Çok eski, net kâr hesaplanmamış ürünlerde %50 varsayım
          acc[item.productId].profit += ((item.total || 0) * 0.5);
        }
      }
    });
    return acc;
  }, {});

  const productsList = Object.values(productMap);
  const topByVolume = [...productsList].sort((a, b) => b.count - a.count).slice(0, 5); // Sürüm ürünleri
  const topByProfit = [...productsList].sort((a, b) => b.profit - a.profit).slice(0, 5); // Kâr jeneratörleri
  const maxVolume = topByVolume[0]?.count || 1;
  const maxProfit = topByProfit[0]?.profit || 1;
  const totalVolume = productsList.reduce((sum, p) => sum + p.count, 0) || 1;
  const totalProfitGen = productsList.reduce((sum, p) => sum + Math.max(0, p.profit), 0) || 1;

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ScreenWrapper style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <LinearGradient colors={[colors.surface, colors.background]} style={styles.header}>
        <Text style={styles.headerLabel}>FİNANSAL YÖNETİM</Text>
        <Text style={styles.headerTitle}>Dashboard</Text>
      </LinearGradient>

      {/* Tab seçici */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            {activeTab === t ? (
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.tabGrad}>
                <Text style={[styles.tabText, styles.tabTextActive]}>{t}</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.tabText}>{t}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadBox}><ActivityIndicator color={colors.primary} size="large" /></View>
        ) : (
          <>
            {/* 3 Ana Metrik Kartı */}
            <View style={styles.mainMetricsGrid}>
              {/* Brüt Ciro */}
              <LinearGradient colors={[isDark ? '#0D1418' : colors.surface, colors.background]} style={[styles.metricCardBig, { borderColor: colors.primary + '55' }]}>
                <Text style={[styles.metricLabel, { color: colors.primary }]}>BRÜT CİRO</Text>
                <Text style={[styles.metricAmtBig, { color: colors.primary }]}>₺{totalRevenue.toFixed(0)}</Text>
                <Text style={styles.metricSub}>{revenueOrders.length} sipariş</Text>
              </LinearGradient>

              <View style={styles.metricsCol}>
                {/* Net Kâr */}
                <View style={[styles.metricCardSmall, { borderColor: finalNetProfit < 0 ? colors.danger + '44' : colors.success + '44' }]}>
                  <Text style={styles.metricLabel}>GERÇEK NET KÂR</Text>
                  <Text style={[styles.metricAmtSmall, { color: finalNetProfit < 0 ? colors.danger : colors.success }]}>
                    ₺{finalNetProfit.toFixed(0)}
                  </Text>
                </View>
                {/* Kasaya Giren Nakit */}
                <View style={[styles.metricCardSmall, { borderColor: colors.accent + '44' }]}>
                  <Text style={styles.metricLabel}>KASAYA GİREN (NAKİT)</Text>
                  <Text style={[styles.metricAmtSmall, { color: colors.accent }]}>
                    ₺{totalCashIn.toFixed(0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Ürün Analizleri Sekmesi */}
            {productsList.length > 0 && (
              <View style={styles.analysisContainer}>
                
                {/* Sürüm Ürünleri (Adet Bazlı) */}
                <View style={styles.analysisColumn}>
                  <Text style={styles.sectionLabel}>SÜRÜM LİDERLERİ (ADET)</Text>
                  {topByVolume.map((p, i) => {
                    const fillPct = (p.count / maxVolume) * 100;
                    const totalPct = ((p.count / totalVolume) * 100).toFixed(1);
                    return (
                      <View key={i} style={styles.productRow}>
                        <View style={[styles.barBgFill, { backgroundColor: colors.primary + (isDark ? '20' : '15'), width: `${fillPct}%` }]} />
                        <View style={styles.productRowContent}>
                          <Text style={styles.productRank}>0{i + 1}</Text>
                          <View style={styles.productInfo}>
                            <Text style={styles.productName} numberOfLines={1}>{p.emoji} {p.name}</Text>
                          </View>
                          <View style={styles.productValContainer}>
                            <Text style={[styles.productPct, { color: colors.primary }]}>%{totalPct}</Text>
                            <Text style={styles.productVal}>{p.count} Adet</Text>
                          </View>
                        </View>
                      </View>
                    )
                  })}
                </View>

                {/* Kâr Jeneratörleri (Net Kâr Bazlı) */}
                <View style={[styles.analysisColumn, { marginTop: 16 }]}>
                  <Text style={[styles.sectionLabel, { color: colors.success }]}>KÂR JENERATÖRLERİ (NET ₺)</Text>
                  {topByProfit.map((p, i) => {
                    const fillPct = Math.max(0, (p.profit / maxProfit) * 100);
                    const totalPct = ((Math.max(0, p.profit) / totalProfitGen) * 100).toFixed(1);
                    return (
                      <View key={i} style={styles.productRow}>
                        <View style={[styles.barBgFill, { backgroundColor: colors.success + (isDark ? '20' : '15'), width: `${fillPct}%` }]} />
                        <View style={styles.productRowContent}>
                          <Text style={styles.productRank}>0{i + 1}</Text>
                          <View style={styles.productInfo}>
                            <Text style={styles.productName} numberOfLines={1}>{p.emoji} {p.name}</Text>
                          </View>
                          <View style={styles.productValContainer}>
                            <Text style={[styles.productPct, { color: colors.success }]}>%{totalPct}</Text>
                            <Text style={[styles.productVal, { color: colors.success }]}>₺{p.profit.toFixed(0)}</Text>
                          </View>
                        </View>
                      </View>
                    )
                  })}
                </View>
              </View>
            )}

            {/* Son Hareketler Listesi */}
            {(orders.length > 0 || payments.length > 0) && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 20 }]}>SON HAREKETLER (SATIŞ & TAHSİLAT)</Text>
                
                {/* Hem siparişleri hem tahsilatları birleştirip tarihe göre sıralıyoruz */}
                {[
                  ...orders.map(o => ({ ...o, type: 'order', sortTime: o.createdAt?.toDate?.()?.getTime() || 0 })),
                  ...payments.filter(p => p.source !== 'pesin_order').map(p => ({ ...p, type: 'payment', sortTime: p.createdAt?.toDate?.()?.getTime() || 0 }))
                ].sort((a, b) => b.sortTime - a.sortTime).slice(0, 20).map((item, idx) => {
                  
                  if (item.type === 'payment') {
                    // TAHSİLAT SATIRI
                    return (
                      <View key={`pay_${item.id}_${idx}`} style={styles.actionRow}>
                        <View style={[styles.actionBar, { backgroundColor: colors.accent }]} />
                        <View style={styles.actionIcon}><Ionicons name="cash" size={16} color={colors.accent} /></View>
                        <View style={styles.actionInfo}>
                          <Text style={styles.actionTitle}>Tahsilat: {item.customerName}</Text>
                          <Text style={styles.actionSub}>{formatDate(item.createdAt)}</Text>
                        </View>
                        <Text style={[styles.actionAmt, { color: colors.accent }]}>+₺{item.amount?.toFixed(2)}</Text>
                      </View>
                    );
                  } else {
                    // SİPARİŞ SATIRI
                    const isIkram = item.status === 'ikram';
                    const isPesin = item.status === 'pesin' || item.status === 'odendi';
                    const color = isIkram ? colors.warning : (isPesin ? colors.success : colors.danger);
                    
                    const isGroup = item.items && item.items.length > 1;
                    const emoji = isGroup ? '🧾' : (item.items?.[0]?.productEmoji || '📦');
                    const subText = isGroup 
                      ? `${item.items.reduce((s, i) => s + (i.quantity || 1), 0)} Kalem Sipariş (Fiş) • ${isIkram ? 'İkram' : (isPesin ? 'Peşin' : 'Veresiye')}`
                      : `${item.items?.[0]?.productName} ×${item.items?.[0]?.quantity || 1} • ${isIkram ? 'İkram' : (isPesin ? 'Peşin' : 'Veresiye')}`;
                    
                    return (
                      <View key={`ord_${item.id}_${idx}`} style={styles.actionRow}>
                        <View style={[styles.actionBar, { backgroundColor: color }]} />
                        <Text style={styles.actionEmoji}>{emoji}</Text>
                        <View style={styles.actionInfo}>
                          <Text style={styles.actionTitle}>{item.customerName}</Text>
                          <Text style={styles.actionSub}>{subText}</Text>
                          <Text style={styles.actionDate}>{formatDate(item.createdAt)}</Text>
                        </View>
                        <Text style={[styles.actionAmt, { color: isIkram ? colors.textMuted : colors.text }]}>
                          {isIkram ? '₺0.00' : `₺${item.total?.toFixed(2)}`}
                        </Text>
                      </View>
                    );
                  }
                })}
              </>
            )}

            {orders.length === 0 && payments.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>📊</Text>
                <Text style={styles.emptyText}>Bu dönemde finansal hareket yok.</Text>
              </View>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 58,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerLabel: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 3,
    marginBottom: 4,
  },
  headerTitle: { fontFamily: typography.displayBold, fontSize: 26, color: colors.text },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tab: { flex: 1, borderRadius: 9, overflow: 'hidden' },
  tabActive: {},
  tabGrad: { paddingVertical: 10, alignItems: 'center' },
  tabText: {
    fontFamily: typography.mono,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 10,
  },
  tabTextActive: { color: colors.textInverse, paddingVertical: 0 },
  scroll: { paddingHorizontal: 20 },
  loadBox: { alignItems: 'center', marginTop: 80 },

  // Metrik Kartları (Yeni Z Raporu Düzeni)
  mainMetricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  metricCardBig: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    justifyContent: 'center',
  },
  metricsCol: {
    flex: 1,
    gap: 12,
  },
  metricCardSmall: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flex: 1,
    justifyContent: 'center',
  },
  metricLabel: {
    fontFamily: typography.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 6,
    color: colors.textMuted,
  },
  metricAmtBig: {
    fontFamily: typography.monoBold,
    fontSize: 34,
    marginBottom: 4,
  },
  metricAmtSmall: {
    fontFamily: typography.monoBold,
    fontSize: 22,
  },
  metricSub: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.textMuted,
  },

  // Analiz Konteyneri
  analysisContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 20,
  },
  analysisColumn: {},
  sectionLabel: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  productRow: {
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: isDark ? colors.cardAlt : colors.surface,
  },
  barBgFill: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
  },
  productRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  productRank: { 
    fontFamily: typography.mono,
    fontSize: 14, 
    width: 28, 
    color: colors.textLight,
    opacity: 0.6,
  },
  productInfo: { flex: 1, marginRight: 12 },
  productName: { fontFamily: typography.displayBold, fontSize: 13, color: colors.text },
  productValContainer: { alignItems: 'flex-end' },
  productPct: { fontFamily: typography.mono, fontSize: 10, marginBottom: 2 },
  productVal: { fontFamily: typography.monoBold, fontSize: 13, color: colors.text },

  // Son Hareketler Listesi
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  actionBar: { width: 3, alignSelf: 'stretch' },
  actionEmoji: { fontSize: 20, marginHorizontal: 12 },
  actionIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.accent + '22',
    alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 10, marginVertical: 8,
  },
  actionInfo: { flex: 1, paddingVertical: 10 },
  actionTitle: { fontFamily: typography.displayBold, fontSize: 13, color: colors.text },
  actionSub: { fontFamily: typography.mono, fontSize: 10, color: colors.textMuted, marginTop: 2 },
  actionDate: { fontFamily: typography.mono, fontSize: 9, color: colors.cardBorderLight, marginTop: 2 },
  actionAmt: { fontFamily: typography.monoBold, fontSize: 15, paddingRight: 14 },

  emptyBox: { alignItems: 'center', marginTop: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontFamily: typography.mono, color: colors.textMuted, fontSize: 13 },
});
