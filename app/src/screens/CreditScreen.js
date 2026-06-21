import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar, ScrollView, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  collection, onSnapshot, query, orderBy,
  doc, updateDoc, addDoc, increment, Timestamp, where,
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../config/firebase';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import * as Haptics from 'expo-haptics';

export default function CreditScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('borc'); // 'borc' | 'tahsilat'

  // Borçlu müşteriler
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = query(collection(db, 'customers'), where('userId', '==', uid));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ ...d.data(), id: d.id }))
        .filter((c) => c.balance > 0 && !c.isDeleted)
        .sort((a, b) => b.balance - a.balance);
      setCustomers(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Tahsilat geçmişi
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = query(collection(db, 'payments'), where('userId', '==', uid));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ ...d.data(), id: d.id }))
        .filter(p => p.status !== 'cancelled')
        .sort((a, b) => {
          const at = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0);
          const bt = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0);
          return bt - at;
        });
      setPayments(list);
    });
    return unsub;
  }, []);

  const openPay = (c) => {
    setSelectedCustomer(c);
    setPayAmount(c.balance?.toFixed(2) || '');
    setPayModal(true);
  };

  const handlePayment = async () => {
    const amount = parseFloat(payAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar girin.');
      return;
    }
    if (amount > selectedCustomer.balance) {
      Alert.alert('Hata', 'Tutar mevcut borçtan fazla olamaz.');
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'customers', selectedCustomer.id), {
        balance: increment(-amount),
      });
      await addDoc(collection(db, 'payments'), {
        userId: auth.currentUser.uid,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        amount,
        createdAt: Timestamp.now(),
      });
      setPayAmount('');
      setPayModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '✓ Tahsilat Alındı',
        `${selectedCustomer.name} — ₺${amount.toFixed(2)} nakit tahsil edildi.`
      );
    } catch (e) {
      console.error('Ödeme hatası:', e);
      const msg = e?.code === 'permission-denied'
        ? 'Firestore izin hatası. Rules bölümünden yazma iznini açın.'
        : `Hata: ${e?.message || 'Bilinmeyen hata'}`;
      Alert.alert('Tahsilat Hatası', msg);
    } finally {
      setSaving(false);
    }
  };

  const totalDebt = customers.reduce((s, c) => s + (c.balance || 0), 0);

  // Bugünkü tahsilatlar
  const today = new Date().toDateString();
  const todayPayments = payments.filter((p) => {
    const d = p.createdAt?.toDate?.() ?? new Date(p.createdAt ?? 0);
    return d.toDateString() === today;
  });
  const todayTotal = todayPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const allTimeTotal = payments.reduce((s, p) => s + (p.amount || 0), 0);

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('tr-TR', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const renderDebtItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardBar} />
      <View style={styles.cardAvatar}>
        <Text style={styles.cardAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardSub}>açık veresiye</Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.debtAmt}>₺{item.balance?.toFixed(2)}</Text>
        <TouchableOpacity style={styles.payBtnWrap} onPress={() => openPay(item)}>
          <LinearGradient colors={[colors.accent, colors.accentDark]} style={styles.payBtn}>
            <Ionicons name="cash-outline" size={13} color={colors.textInverse} />
            <Text style={styles.payBtnText}>Tahsil</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenWrapper style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <LinearGradient colors={[colors.surface, colors.background]} style={styles.header}>
        <Text style={styles.headerLabel}>VERESİYE TAKİP</Text>
        <Text style={styles.headerTitle}>Tahsilat</Text>
      </LinearGradient>

      {/* Üst metrikler */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, { borderColor: colors.danger + '44' }]}>
          <Text style={styles.metricLabel}>AÇIK BORÇ</Text>
          <Text style={[styles.metricAmt, { color: colors.danger }]}>
            ₺{totalDebt.toFixed(2)}
          </Text>
          <Text style={styles.metricSub}>{customers.length} kişi</Text>
        </View>
        <View style={[styles.metricCard, { borderColor: colors.accent + '44' }]}>
          <Text style={styles.metricLabel}>BUGÜN TAHSİLAT</Text>
          <Text style={[styles.metricAmt, { color: colors.accent }]}>
            ₺{todayTotal.toFixed(2)}
          </Text>
          <Text style={styles.metricSub}>{todayPayments.length} işlem</Text>
        </View>
        <View style={[styles.metricCard, { borderColor: colors.primary + '44' }]}>
          <Text style={styles.metricLabel}>TOPLAM TAHSİLAT</Text>
          <Text style={[styles.metricAmt, { color: colors.primary }]}>
            ₺{allTimeTotal.toFixed(2)}
          </Text>
          <Text style={styles.metricSub}>{payments.length} işlem</Text>
        </View>
      </View>

      {/* Sekme seçici */}
      <View style={styles.segmented}>
        <TouchableOpacity
          style={[styles.seg, activeSection === 'borc' && styles.segActive]}
          onPress={() => setActiveSection('borc')}
        >
          <Text style={[styles.segText, activeSection === 'borc' && styles.segTextActive]}>
            Borçlular ({customers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.seg, activeSection === 'tahsilat' && styles.segActive]}
          onPress={() => setActiveSection('tahsilat')}
        >
          <Text style={[styles.segText, activeSection === 'tahsilat' && styles.segTextActive]}>
            Tahsilat ({payments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadBox}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : activeSection === 'borc' ? (
        /* — Borçlular listesi — */
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={renderDebtItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>✅</Text>
              <Text style={styles.emptyTitle}>Tüm hesaplar temiz!</Text>
              <Text style={styles.emptyText}>Açık veresiye yok.</Text>
            </View>
          }
        />
      ) : (
        /* — Tahsilat geçmişi — */
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {payments.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>💳</Text>
              <Text style={styles.emptyTitle}>Henüz tahsilat yok</Text>
              <Text style={styles.emptyText}>İlk tahsilatı aldığında burada görünür.</Text>
            </View>
          ) : (
            payments.map((p) => {
              const isToday = (p.createdAt?.toDate?.() ?? new Date(p.createdAt ?? 0)).toDateString() === today;
              return (
                <View key={p.id} style={styles.paymentRow}>
                  <View style={[styles.paymentBar, { backgroundColor: isToday ? colors.accent : colors.primary }]} />
                  <View style={styles.paymentIcon}>
                    <Ionicons name="cash-outline" size={18} color={isToday ? colors.accent : colors.primary} />
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentName}>{p.customerName}</Text>
                    <Text style={styles.paymentDate}>{formatDate(p.createdAt)}</Text>
                  </View>
                  <View style={styles.paymentRight}>
                    <Text style={styles.paymentAmt}>+₺{p.amount?.toFixed(2)}</Text>
                    {isToday && (
                      <View style={styles.todayBadge}>
                        <Text style={styles.todayBadgeText}>Bugün</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Ödeme Modalı */}
      <Modal visible={payModal} transparent animationType="slide" statusBarTranslucent>
        <TouchableWithoutFeedback onPress={() => { setPayModal(false); Keyboard.dismiss(); }}>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Ödeme Al</Text>

                {selectedCustomer && (
                  <>
                    <View style={styles.customerRow}>
                      <View style={styles.customerAvatar}>
                        <Text style={styles.customerAvatarText}>
                          {selectedCustomer.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.customerName}>{selectedCustomer.name}</Text>
                        <Text style={styles.customerDebt}>
                          Borç:{' '}
                          <Text style={{ color: colors.danger, fontFamily: typography.monoBold }}>
                            ₺{selectedCustomer.balance?.toFixed(2)}
                          </Text>
                        </Text>
                      </View>
                    </View>

                    <View style={styles.chipRow}>
                      <TouchableOpacity
                        style={styles.chip}
                        onPress={() => setPayAmount(selectedCustomer.balance?.toFixed(2))}
                      >
                        <Text style={styles.chipText}>Tümü</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.chip}
                        onPress={() => setPayAmount((selectedCustomer.balance / 2).toFixed(2))}
                      >
                        <Text style={styles.chipText}>Yarısı</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.chip}
                        onPress={() => setPayAmount((selectedCustomer.balance / 4).toFixed(2))}
                      >
                        <Text style={styles.chipText}>¼'ü</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.amountBox}>
                      <Text style={styles.currency}>₺</Text>
                      <TextInput
                        style={styles.amountInput}
                        value={payAmount}
                        onChangeText={setPayAmount}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor={colors.textMuted}
                        selectTextOnFocus
                      />
                    </View>

                    <View style={styles.sheetActions}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => setPayModal(false)}>
                        <Text style={styles.cancelText}>İptal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.confirmWrap} onPress={handlePayment} disabled={saving}>
                        <LinearGradient colors={[colors.accent, colors.accentDark]} style={styles.confirmBtn}>
                          {saving ? (
                            <ActivityIndicator color={colors.textInverse} />
                          ) : (
                            <>
                              <Ionicons name="checkmark" size={16} color={colors.textInverse} />
                              <Text style={styles.confirmText}>Tahsil Et</Text>
                            </>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </ScreenWrapper>
  );
}

const getStyles = (colors) => StyleSheet.create({
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
    color: colors.danger,
    letterSpacing: 3,
    marginBottom: 4,
  },
  headerTitle: { fontFamily: typography.displayBold, fontSize: 26, color: colors.text },

  // Metrik kartlar
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontFamily: typography.mono,
    fontSize: 7,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  metricAmt: { fontFamily: typography.monoBold, fontSize: 16 },
  metricSub: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Segmented control
  segmented: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  seg: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  segActive: { backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.cardBorderLight },
  segText: { fontFamily: typography.mono, fontSize: 11, color: colors.textMuted },
  segTextActive: { color: colors.text },

  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  cardBar: { width: 3, alignSelf: 'stretch', backgroundColor: colors.danger },
  cardAvatar: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: colors.dangerMuted,
    alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 12, marginVertical: 12,
    borderWidth: 1, borderColor: colors.danger + '44',
  },
  cardAvatarText: { fontFamily: typography.displayBold, fontSize: 18, color: colors.danger },
  cardInfo: { flex: 1 },
  cardName: { fontFamily: typography.displayBold, fontSize: 14, color: colors.text },
  cardSub: { fontFamily: typography.mono, fontSize: 10, color: colors.textMuted, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', paddingRight: 12, gap: 6 },
  debtAmt: { fontFamily: typography.monoBold, fontSize: 16, color: colors.danger },
  payBtnWrap: { borderRadius: 8, overflow: 'hidden' },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  payBtnText: { fontFamily: typography.monoBold, color: colors.textInverse, fontSize: 11 },

  // Tahsilat satırları
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 7,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  paymentBar: { width: 3, alignSelf: 'stretch' },
  paymentIcon: {
    width: 40, height: 40, borderRadius: 11,
    backgroundColor: colors.cardAlt,
    alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 10, marginVertical: 10,
  },
  paymentInfo: { flex: 1 },
  paymentName: { fontFamily: typography.displayBold, fontSize: 13, color: colors.text },
  paymentDate: { fontFamily: typography.mono, fontSize: 10, color: colors.textMuted, marginTop: 2 },
  paymentRight: { alignItems: 'flex-end', paddingRight: 12, gap: 4 },
  paymentAmt: { fontFamily: typography.monoBold, fontSize: 15, color: colors.accent },
  todayBadge: {
    backgroundColor: colors.accent + '22',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.accent + '44',
  },
  todayBadgeText: { fontFamily: typography.mono, fontSize: 9, color: colors.accent },

  loadBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontFamily: typography.displayBold, fontSize: 18, color: colors.text, marginBottom: 6 },
  emptyText: { fontFamily: typography.mono, color: colors.textMuted, fontSize: 12, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 24, paddingBottom: 44,
    borderTopWidth: 1, borderColor: colors.cardBorder,
  },
  sheetHandle: {
    width: 36, height: 3, borderRadius: 2,
    backgroundColor: colors.cardBorderLight,
    alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { fontFamily: typography.displayBold, fontSize: 20, color: colors.text, marginBottom: 20 },
  customerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder,
  },
  customerAvatar: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: colors.dangerMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  customerAvatarText: { fontFamily: typography.displayBold, fontSize: 18, color: colors.danger },
  customerName: { fontFamily: typography.displayBold, fontSize: 15, color: colors.text },
  customerDebt: { fontFamily: typography.mono, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.primary + '20',
    borderWidth: 1, borderColor: colors.primary + '44',
  },
  chipText: { fontFamily: typography.monoBold, color: colors.primary, fontSize: 12 },
  amountBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 12,
    borderWidth: 2, borderColor: colors.primary,
    paddingHorizontal: 16, height: 62, marginBottom: 20,
  },
  currency: { fontFamily: typography.monoBold, fontSize: 26, color: colors.primary, marginRight: 8 },
  amountInput: { flex: 1, fontFamily: typography.monoBold, fontSize: 28, color: colors.text },
  sheetActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, height: 52, borderRadius: 12,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  cancelText: { fontFamily: typography.mono, color: colors.textMuted, fontSize: 14 },
  confirmWrap: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  confirmBtn: {
    height: 52, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  confirmText: { fontFamily: typography.displayBold, color: colors.textInverse, fontSize: 15 },
});
