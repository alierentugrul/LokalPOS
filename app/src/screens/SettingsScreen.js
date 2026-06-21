import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, TouchableOpacity, Alert,
  ActivityIndicator, StatusBar, Switch,
  Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenWrapper from '../components/ScreenWrapper';
import { collection, onSnapshot, doc, setDoc, addDoc, query, where, updateDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../config/firebase';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { useToast } from '../components/ToastProvider';

const parsePrice = (val) => {
  if (typeof val === 'number') return val;
  return parseFloat(String(val).replace(',', '.')) || 0;
};

// Yeni sisteme uygun varsayılan ürün listesi
const DEFAULT_PRODUCTS = [
  { id: 'cay', name: 'Çay', emoji: '🍵', price: 10, cost: 3, category: 'Sıcak İçecekler', isActive: true, inStock: true },
  { id: 'kakao', name: 'Kakao', emoji: '🍫', price: 25, cost: 10, category: 'Sıcak İçecekler', isActive: true, inStock: true },
  { id: 'salep', name: 'Salep', emoji: '🥛', price: 25, cost: 8, category: 'Sıcak İçecekler', isActive: true, inStock: true },
  { id: 'ayran', name: 'Ayran', emoji: '🥤', price: 15, cost: 5, category: 'Soğuk İçecekler', isActive: true, inStock: true },
  { id: 'ayran_limon', name: 'Tuzlu Limonlu Ayran', emoji: '🍋', price: 20, cost: 7, category: 'Soğuk İçecekler', isActive: true, inStock: true },
  { id: 'tost', name: 'Tost', emoji: '🥪', price: 40, cost: 18, category: 'Yiyecekler', isActive: true, inStock: true },
  { id: 'nescafe', name: 'Nescafe', emoji: '☕', price: 30, cost: 8, category: 'Sıcak İçecekler', isActive: true, inStock: true },
  { id: 'su', name: 'Su', emoji: '💧', price: 5, cost: 1, category: 'Soğuk İçecekler', isActive: true, inStock: true },
];

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { showToast } = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [helpExpanded, setHelpExpanded] = useState(false);
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: '', emoji: '', price: '', cost: '', category: 'Diğer', isActive: true, inStock: true
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = query(collection(db, 'products'), where('userId', '==', uid));
    
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        // Migration: Eğer veritabanı boşsa varsayılan ürünleri yeni şemayla yükle
        DEFAULT_PRODUCTS.forEach(p => {
          setDoc(doc(db, 'products', `${uid}_${p.id}`), { ...p, userId: uid });
        });
      } else {
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
            // Migration: Eksik alanları doldur (Geriye dönük uyumluluk)
            category: data.category || 'Diğer',
            isActive: data.isActive !== undefined ? data.isActive : true,
            inStock: data.inStock !== undefined ? data.inStock : true,
          };
        });
        setProducts(list);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const openAddModal = () => {
    setForm({ name: '', emoji: '📦', price: '', cost: '', category: 'Diğer', isActive: true, inStock: true });
    setEditingProduct(null);
    setModalVisible(true);
  };

  const openEditModal = (product) => {
    setForm({
      name: product.name,
      emoji: product.emoji || '📦',
      price: String(product.price),
      cost: String(product.cost),
      category: product.category,
      isActive: product.isActive,
      inStock: product.inStock,
    });
    setEditingProduct(product);
    setModalVisible(true);
  };

  const toggleStock = async (product) => {
    try {
      await setDoc(doc(db, 'products', product.id), { ...product, inStock: !product.inStock }, { merge: true });
      showToast({ message: product.inStock ? `❌ ${product.name} tükendi olarak işaretlendi` : `✅ ${product.name} stokta`, type: product.inStock ? 'warning' : 'success', duration: 1800 });
    } catch (e) {
      Alert.alert('Hata', 'Stok güncellenemedi.');
    }
  };

  const handleMigrateData = async () => {
    Alert.alert(
      'Geriye Dönük Verileri Kurtar',
      'Eski sisteme ait olan ve size ait olduğu tahmin edilen tüm gizli veriler (müşteriler, siparişler, vb.) mevcut hesabınıza bağlanacak. Onaylıyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Kurtar', 
          onPress: async () => {
            setLoading(true);
            try {
              const uid = auth.currentUser.uid;
              const cols = ['customers', 'orders', 'payments', 'products'];
              let count = 0;
              for (const c of cols) {
                const snap = await getDocs(collection(db, c));
                for (const document of snap.docs) {
                  const data = document.data();
                  if (!data.userId) {
                    await updateDoc(doc(db, c, document.id), { userId: uid });
                    count++;
                  }
                }
              }
              Alert.alert('Başarılı', `${count} adet veri kurtarıldı ve hesabınıza bağlandı! Lütfen sekmeler arasında gezinerek kontrol edin.`);
            } catch (e) {
              Alert.alert('Hata', 'Veri kurtarılamadı. (Eğer Firebase Security Rules\'u güncellediyseniz geçici olarak eski haline getirmeniz gerekebilir.)');
            } finally {
              setLoading(false);
            }
          } 
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!form.name || !form.price) {
      Alert.alert('Eksik Bilgi', 'Lütfen ürün adı ve satış fiyatını girin.');
      return;
    }
    setSaving(true);
    try {
      const uid = auth.currentUser.uid;
      const productData = {
        userId: uid,
        name: form.name,
        emoji: form.emoji,
        price: parsePrice(form.price),
        cost: parsePrice(form.cost),
        category: form.category || 'Diğer',
        isActive: form.isActive,
        inStock: form.inStock,
      };

      if (editingProduct) {
        await setDoc(doc(db, 'products', editingProduct.id), productData, { merge: true });
        showToast({ message: `✏️ ${form.name} güncellendi`, type: 'success' });
      } else {
        await addDoc(collection(db, 'products'), productData);
        showToast({ message: `✅ ${form.name} kataloğa eklendi`, type: 'success' });
      }
      setModalVisible(false);
    } catch (e) {
      Alert.alert('Hata', 'Kayıt sırasında sorun oluştu.');
      setSaving(false);
    }
  };

  const handleDeleteProduct = () => {
    if (!editingProduct) return;
    Alert.alert('Ürünü Sil', `"${editingProduct.name}" kalıcı olarak silinecek. Emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
          setSaving(true);
          try {
            await deleteDoc(doc(db, 'products', editingProduct.id));
            setModalVisible(false);
            showToast({ message: `🗑️ ${editingProduct.name} silindi`, type: 'warning' });
          } catch (e) {
            Alert.alert('Hata', 'Ürün silinemedi.');
          } finally {
            setSaving(false);
          }
      }}
    ]);
  };

  const getProfit = (price, cost) => parsePrice(price) - parsePrice(cost);
  
  // Kategorilere göre grupla
  const groupedProducts = products.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const categories = Object.keys(groupedProducts).sort();

  return (
    <ScreenWrapper style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <LinearGradient colors={[colors.surface, colors.background]} style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>YÖNETİM</Text>
          <Text style={styles.headerTitle}>Katalog & Ayarlar</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {/* Koyu Mod Toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name={isDark ? "moon" : "sunny"} size={16} color={colors.primary} />
            <Switch 
              value={isDark} 
              onValueChange={toggleTheme}
              trackColor={{ false: colors.cardBorderLight, true: colors.primaryDark }}
              thumbColor={isDark ? colors.primary : colors.card}
              style={{ transform: [{ scale: 0.8 }] }}
            />
          </View>
        </View>
      </LinearGradient>

      {/* Add Product Button */}
      <View style={styles.addActionContainer}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={[styles.addBtn, { flex: 1 }]} onPress={openAddModal}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.addBtnGrad}>
              <Ionicons name="add" size={20} color={colors.textInverse} />
              <Text style={styles.addBtnText}>YENİ ÜRÜN EKLE</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ borderRadius: 12, overflow: 'hidden', width: 48, borderWidth: 1, borderColor: colors.cardBorder }}
            onPress={() => setHelpExpanded(true)}
          >
            <LinearGradient colors={[colors.surface, colors.card]} style={styles.addBtnGrad}>
              <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadBox}><ActivityIndicator color={colors.primary} size="large" /></View>
        ) : (
          categories.map(cat => (
            <View key={cat} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{cat.toUpperCase()}</Text>
              {groupedProducts[cat].map((p) => {
                const profit = getProfit(p.price, p.cost);
                const isInactive = !p.isActive;
                
                return (
                  <View key={p.id} style={[styles.row, isInactive && { opacity: 0.5 }]}>
                    <View style={styles.rowInfo}>
                      <Text style={styles.emoji}>{p.emoji}</Text>
                      <View>
                        <Text style={[styles.pName, isInactive && { textDecorationLine: 'line-through' }]}>
                          {p.name}
                        </Text>
                        <Text style={styles.pPrice}>
                          Satış: ₺{p.price} | Kar: <Text style={{ color: profit > 0 ? colors.accent : colors.danger }}>₺{profit}</Text>
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.rowActions}>
                      <View style={styles.stockToggle}>
                        <Text style={styles.stockLabel}>{p.inStock ? 'Var' : 'Tükendi'}</Text>
                        <Switch
                          value={p.inStock}
                          onValueChange={() => toggleStock(p)}
                          trackColor={{ false: colors.danger, true: colors.success }}
                          thumbColor={colors.card}
                          style={{ transform: [{ scale: 0.8 }] }}
                        />
                      </View>
                      
                      <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(p)}>
                        <Ionicons name="pencil" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
        
        <TouchableOpacity 
          style={{ alignSelf: 'center', marginBottom: 60, padding: 12, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.primary + '40' }}
          onPress={handleMigrateData}
        >
          <Text style={{ fontFamily: typography.bold, fontSize: 13, color: colors.primary }}>
            🔄 Eski Hesap Verilerini Kurtar (Sistem Göçü)
          </Text>
        </TouchableOpacity>

      </ScrollView>

      {/* YARDIM / SSS Bölümü */}
      <Modal visible={helpExpanded} transparent animationType="slide" onRequestClose={() => setHelpExpanded(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: 40 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="information-circle" size={24} color={colors.primary} />
                <Text style={styles.modalTitle}>Yardım & Kullanım</Text>
              </View>
              <TouchableOpacity onPress={() => setHelpExpanded(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { q: 'Sipariş nasıl verilir?', a: 'Müşteri profiline gir, ürün kartına tek tıkla sepete ekle. Sepet ikonuna tıklayarak ödeme tipini seç ve onayla. Tek bir ürün için uzun bas → tek sipariş modalı açılır.' },
                { q: 'Veresiye ve Peşin farkı nedir?', a: 'Veresiye: Tutar müşterinin borcuna eklenir. Peşin: Para kasaya girer, bakiye değişmez. İkram/Fire: Ücretsiz verilir, maliyet sisteme kaydedilir.' },
                { q: 'Yanlış sipariş girdim ne yapabilirim?', a: 'Sipariş listesinde o siparişe tıkla. Açılan ekranda miktarı düzenleyebilir ya da siparişi tamamen iptal edebilirsin. Sistem bakiye/kasayı otomatik günceller.' },
                { q: 'Müşteriden ödeme nasıl alınır?', a: 'Veresiye sekmesine (cüzdan ikonu) git. Müşteri adına tıkla ve "Tahsilat Al" butonunu kullan.' },
                { q: 'Ürün nasıl eklenir?', a: 'Ayarlar sayfasından "Yeni Ürün Ekle" butonuna bas. Emoji, ad, satış fiyatı ve maliyet gir. Kategori seç ve kaydet.' },
                { q: 'Ürün tükendiyse ne yapabilirim?', a: 'Ayarlar sayfasında ürün satırındaki "Var/Tükendi" geçişine dokun. Tükendi olarak işaretlenen ürünler sipariş ekranında otomatik olarak kilitlenir.' },
                { q: 'Ciro ve kâr nasıl hesaplanır?', a: 'Ciro sekmesi; brüt ciro (tüm satışların toplamı), gerçek net kâr (satış fiyatı eksi maliyet) ve kasaya giren nakit miktarını gösterir.' },
              ].map((item, i) => (
                <View key={i} style={{ marginBottom: 16, backgroundColor: colors.surface, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
                    <Ionicons name="help-circle" size={18} color={colors.primary} style={{ marginTop: -1 }} />
                    <Text style={{ flex: 1, fontFamily: typography.displayBold, fontSize: 13, color: colors.text }}>{item.q}</Text>
                  </View>
                  <Text style={{ fontFamily: typography.mono, fontSize: 11, color: colors.textMuted, lineHeight: 18 }}>{item.a}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* CRUD MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProduct ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Emoji</Text>
                  <TextInput
                    style={styles.input}
                    value={form.emoji}
                    onChangeText={(v) => setForm({...form, emoji: v})}
                    maxLength={2}
                  />
                </View>
                <View style={{ flex: 4 }}>
                  <Text style={styles.inputLabel}>Ürün Adı</Text>
                  <TextInput
                    style={styles.input}
                    value={form.name}
                    onChangeText={(v) => setForm({...form, name: v})}
                    placeholder="Örn: Karışık Tost"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Satış Fiyatı (₺)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.price}
                    onChangeText={(v) => setForm({...form, price: v})}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Birim Maliyet (₺)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.cost}
                    onChangeText={(v) => setForm({...form, cost: v})}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Kategori</Text>
                <TextInput
                  style={styles.input}
                  value={form.category}
                  onChangeText={(v) => setForm({...form, category: v})}
                  placeholder="Örn: Yiyecekler"
                  placeholderTextColor={colors.textMuted}
                />
                <View style={styles.categoryChips}>
                  {['Sıcak İçecekler', 'Soğuk İçecekler', 'Yiyecekler', 'Aperatifler', 'Tatlılar'].map(cat => (
                    <TouchableOpacity key={cat} style={styles.chip} onPress={() => setForm({...form, category: cat})}>
                      <Text style={styles.chipText}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Bugün Stokta Var mı?</Text>
                  <Text style={styles.toggleSub}>Kapalıysa sipariş ekranında Tükendi olarak görünür.</Text>
                </View>
                <Switch 
                  value={form.inStock} 
                  onValueChange={(v) => setForm({...form, inStock: v})}
                  trackColor={{ false: colors.danger, true: colors.success }}
                  thumbColor={colors.card}
                />
              </View>

              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Menüde Aktif (Görünür)</Text>
                  <Text style={styles.toggleSub}>Ürünü tamamen kaldırmak için bunu kapatın.</Text>
                </View>
                <Switch 
                  value={form.isActive} 
                  onValueChange={(v) => setForm({...form, isActive: v})}
                  trackColor={{ false: colors.cardBorderLight, true: colors.primary }}
                  thumbColor={colors.card}
                />
              </View>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSave} disabled={saving}>
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.modalSaveBtnGrad}>
                  {saving ? <ActivityIndicator color={colors.textInverse} /> : <Text style={styles.modalSaveBtnText}>KAYDET</Text>}
                </LinearGradient>
              </TouchableOpacity>
              
              {editingProduct && (
                <TouchableOpacity style={{ marginTop: 12, padding: 14, alignItems: 'center' }} onPress={handleDeleteProduct}>
                  <Text style={{ fontFamily: typography.bold, color: colors.danger, fontSize: 14 }}>🗑️ Ürünü Kalıcı Olarak Sil</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  headerTitle: { fontFamily: typography.displayBold, fontSize: 26, color: colors.text },
  
  addActionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  addBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  addBtnText: {
    fontFamily: typography.monoBold,
    fontSize: 13,
    color: colors.textInverse,
    letterSpacing: 1,
  },

  scroll: { paddingBottom: 110, paddingHorizontal: 20 },
  loadBox: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontFamily: typography.monoBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  emoji: { fontSize: 24 },
  pName: { fontFamily: typography.displayBold, fontSize: 15, color: colors.text, marginBottom: 2 },
  pPrice: { fontFamily: typography.mono, fontSize: 10, color: colors.textMuted },
  
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stockToggle: {
    alignItems: 'center',
  },
  stockLabel: {
    fontFamily: typography.mono,
    fontSize: 8,
    color: colors.textMuted,
    marginBottom: 2,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontFamily: typography.displayBold, fontSize: 20, color: colors.text },
  
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: 14,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorderLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.text,
  },
  
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  toggleLabel: { fontFamily: typography.displayBold, fontSize: 14, color: colors.text, marginBottom: 4 },
  toggleSub: { fontFamily: typography.mono, fontSize: 9, color: colors.textMuted, maxWidth: '80%' },
  
  modalSaveBtn: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 40,
  },
  modalSaveBtnGrad: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    fontFamily: typography.monoBold,
    fontSize: 14,
    color: colors.textInverse,
    letterSpacing: 2,
  },
});
