import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  collection, onSnapshot, addDoc, updateDoc,
  doc, query, where,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../config/firebase';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CustomersScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = query(collection(db, 'customers'), where('userId', '==', uid));
    
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ ...d.data(), id: d.id }))
        .filter(c => !c.isDeleted)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setCustomers(list);
      setFiltered(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const term = search.toLowerCase();
    setFiltered(term ? customers.filter((c) => c.name.toLowerCase().includes(term)) : customers);
  }, [search, customers]);

  const openAdd = () => { setEditCustomer(null); setName(''); setPhone(''); setModalVisible(true); };
  const openEdit = (c) => { setEditCustomer(c); setName(c.name); setPhone(c.phone || ''); setModalVisible(true); };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Hata', 'Müşteri adı boş bırakılamaz.'); return; }
    setSaving(true);
    try {
      if (editCustomer) {
        await updateDoc(doc(db, 'customers', editCustomer.id), { name: name.trim(), phone: phone.trim() });
      } else {
        const uid = auth.currentUser.uid;
        await addDoc(collection(db, 'customers'), { 
          userId: uid,
          name: name.trim(), 
          phone: phone.trim(), 
          balance: 0, 
          createdAt: new Date() 
        });
      }
      setModalVisible(false);
    } catch (e) {
      const msg = e?.code === 'permission-denied'
        ? 'Firestore izin hatası. Kuralları kontrol edin.'
        : `Hata: ${e?.message || 'Bilinmeyen'}`;
      Alert.alert('Firebase Hatası', msg);
    } finally { setSaving(false); }
  };

  const handleDelete = (c) => {
    Alert.alert('Müşteriyi Sil', `"${c.name}" silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => updateDoc(doc(db, 'customers', c.id), { isDeleted: true }) },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Çıkış Yap', 'Hesabınızdan çıkmak istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };

  const totalDebt = customers.reduce((s, c) => s + (c.balance || 0), 0);
  const debtorCount = customers.filter((c) => c.balance > 0).length;

  const renderCustomer = ({ item, index }) => {
    const isDebt = item.balance > 0;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('CustomerDetail', { customer: item })}
        activeOpacity={0.7}
      >
        <View style={[styles.cardLeft, isDebt && styles.cardLeftDebt]} />
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.name}</Text>
          {item.phone ? <Text style={styles.cardPhone}>{item.phone}</Text> : null}
        </View>
        <View style={styles.cardRight}>
          {isDebt ? (
            <Text style={[styles.balanceText, styles.balanceDebt]}>
              ₺{item.balance?.toFixed(2)}
            </Text>
          ) : (
            <Text style={[styles.balanceText, styles.balanceClear]}>Temiz</Text>
          )}
          <View style={styles.iconRow}>
            <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
              <Ionicons name="create-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={16} color={colors.danger + 'AA'} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <LinearGradient
        colors={[colors.surface, colors.background]}
        style={styles.header}
      >
        <View>
          <Text style={styles.headerLabel}>MÜŞTERİLER</Text>
          <Text style={styles.headerTitle}>Galerici Listesi</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Özet şerit */}
      {totalDebt > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{customers.length}</Text>
            <Text style={styles.summaryKey}>galerici</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: colors.danger }]}>{debtorCount}</Text>
            <Text style={styles.summaryKey}>borçlu</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: colors.warning, fontFamily: typography.monoBold }]}>
              ₺{totalDebt.toFixed(2)}
            </Text>
            <Text style={styles.summaryKey}>toplam veresiye</Text>
          </View>
        </View>
      )}

      {/* Arama */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Galerici ara..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Liste */}
      {loading ? (
        <View style={styles.loadBox}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderCustomer}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyText}>
                {search ? 'Sonuç bulunamadı.' : 'Henüz müşteri eklenmedi.'}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity 
        style={[styles.fab, { bottom: 74 + (insets.bottom || 10) }]} 
        onPress={openAdd} 
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[colors.primaryLight, colors.primary]}
          style={styles.fabInner}
        >
          <Ionicons name="person-add" size={22} color={colors.textInverse} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" statusBarTranslucent>
        <TouchableWithoutFeedback onPress={() => { setModalVisible(false); Keyboard.dismiss(); }}>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>
                  {editCustomer ? 'Düzenle' : 'Yeni Müşteri'}
                </Text>

                <Text style={styles.fieldLabel}>AD SOYAD *</Text>
                <TextInput
                  style={styles.sheetInput}
                  placeholder="Ahmet Yılmaz"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />

                <Text style={styles.fieldLabel}>TELEFON</Text>
                <TextInput
                  style={styles.sheetInput}
                  placeholder="05XX XXX XX XX"
                  placeholderTextColor={colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />

                <View style={styles.sheetActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                    <Text style={styles.cancelText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                    <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.saveBtnGrad}>
                      {saving ? <ActivityIndicator color={colors.textInverse} /> : (
                        <Text style={styles.saveText}>{editCustomer ? 'Güncelle' : 'Kaydet'}</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerTitle: {
    fontFamily: typography.displayBold,
    fontSize: 26,
    color: colors.text,
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: {
    fontFamily: typography.monoBold,
    fontSize: 16,
    color: colors.text,
  },
  summaryKey: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  summaryDivider: { width: 1, height: 28, backgroundColor: colors.cardBorder },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 10,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  list: { paddingHorizontal: 20, paddingBottom: 160 },
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
  cardLeft: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: colors.accent,
  },
  cardLeftDebt: { backgroundColor: colors.danger },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginRight: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.cardBorderLight,
  },
  avatarText: {
    fontFamily: typography.displayBold,
    fontSize: 18,
    color: colors.primary,
  },
  cardInfo: { flex: 1 },
  cardName: {
    fontFamily: typography.displayBold,
    fontSize: 14,
    color: colors.text,
  },
  cardPhone: {
    fontFamily: typography.mono,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    paddingRight: 12,
    gap: 4,
  },
  balanceText: {
    fontFamily: typography.monoBold,
    fontSize: 13,
  },
  balanceDebt: { color: colors.danger },
  balanceClear: { color: colors.accent },
  iconRow: { flexDirection: 'row', gap: 2 },
  iconBtn: { padding: 4 },
  loadBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyText: { fontFamily: typography.mono, color: colors.textMuted, fontSize: 13 },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 22,
    borderRadius: 18,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 24,
    paddingBottom: 44,
    borderTopWidth: 1,
    borderColor: colors.cardBorder,
  },
  sheetHandle: {
    width: 36, height: 3, borderRadius: 2,
    backgroundColor: colors.cardBorderLight,
    alignSelf: 'center', marginBottom: 22,
  },
  sheetTitle: {
    fontFamily: typography.displayBold,
    fontSize: 20,
    color: colors.text,
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: 6,
  },
  sheetInput: {
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, height: 50, borderRadius: 12,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  cancelText: { color: colors.textMuted, fontSize: 14, fontFamily: typography.mono },
  saveBtn: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  saveBtnGrad: { height: 50, alignItems: 'center', justifyContent: 'center' },
  saveText: {
    color: colors.textInverse,
    fontFamily: typography.displayBold,
    fontSize: 15,
  },
});
