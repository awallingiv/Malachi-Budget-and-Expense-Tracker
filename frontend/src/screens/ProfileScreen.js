import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text,
  StyleSheet, 
  ScrollView, 
  Alert,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { budgetService } from '../services/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TITHE_PERCENTAGE_KEY = '@tithe_percentage';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, themeMode } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTitheModal, setShowTitheModal] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // User stats and settings
  const [userStats, setUserStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalTithe: 0,
    accountAge: 0,
    lastActivity: null
  });
  
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: themeMode === 'dark',
    autoTithe: true,
    tithePercentage: 10,
    currency: 'USD'
  });

  // Edit profile form
  const [editProfile, setEditProfile] = useState({
    Username: user?.Username || '',
    Email: user?.Email || '',
    FirstName: user?.FirstName || '',
    LastName: user?.LastName || ''
  });

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Tithe percentage input
  const [titheInput, setTitheInput] = useState('10');

  useEffect(() => {
    loadUserData();
    loadTithePercentage();
  }, []);

  const loadTithePercentage = async () => {
    try {
      const saved = await AsyncStorage.getItem(TITHE_PERCENTAGE_KEY);
      if (saved) {
        const percentage = parseFloat(saved);
        setSettings(prev => ({ ...prev, tithePercentage: percentage }));
        setTitheInput(percentage.toString());
      }
    } catch (error) {
      console.error('Failed to load tithe percentage:', error);
    }
  };

  const saveTithePercentage = async (percentage) => {
    try {
      await AsyncStorage.setItem(TITHE_PERCENTAGE_KEY, percentage.toString());
      setSettings(prev => ({ ...prev, tithePercentage: percentage }));
      setSuccess('Tithe percentage updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to save tithe percentage:', error);
      setError('Failed to save tithe percentage');
    }
  };

  const loadUserData = async () => {
    try {
      setError(null);
      
      // Load user statistics
      const [incomeData, transactionData] = await Promise.all([
        budgetService.getIncome(user.UserId),
        budgetService.getTransactions(user.UserId)
      ]);
      
      const totalIncome = (incomeData || []).reduce((sum, item) => 
        sum + (parseFloat(item.Gross || item.GrossIncome) || 0), 0);
      const totalExpenses = (transactionData || []).reduce((sum, item) => 
        sum + (parseFloat(item.Amount) || 0), 0);
      const totalTithe = (incomeData || []).reduce((sum, item) => 
        sum + (parseFloat(item.Tithe || item.TitheAmount) || 0), 0);
      
      const accountAge = user.CreationTime ? 
        Math.floor((new Date() - new Date(user.CreationTime)) / (1000 * 60 * 60 * 24)) : 0;
      
      setUserStats({
        totalIncome,
        totalExpenses,
        totalTithe,
        accountAge,
        lastActivity: user.LastEdit || user.CreationTime
      });
      
    } catch (err) {
      console.error('Failed to load user data:', err);
      setError('Failed to load profile data');
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUserData();
  }, []);

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      
      const result = await budgetService.updateUserProfile(user.UserId, editProfile);
      
      if (result.success) {
        setShowEditModal(false);
        setSuccess('Profile updated successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      
      const result = await budgetService.changePassword(
        user.UserId,
        passwordForm.currentPassword,
        passwordForm.newPassword
      );
      
      if (result.success) {
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setSuccess('Password changed successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to change password');
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      setError('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTithePercentage = () => {
    const percentage = parseFloat(titheInput);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      setError('Please enter a valid percentage (0-100)');
      return;
    }
    saveTithePercentage(percentage);
    setShowTitheModal(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: logout
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await budgetService.deleteUserAccount(user.UserId);
              if (result.success) {
                logout();
              } else {
                setError('Failed to delete account');
              }
            } catch (error) {
              console.error('Failed to delete account:', error);
              setError('Failed to delete account');
            }
          }
        }
      ]
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getInitials = () => {
    const first = user?.FirstName?.[0] || user?.Username?.[0] || 'U';
    const last = user?.LastName?.[0] || '';
    return (first + last).toUpperCase();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={[styles.avatarText, { color: theme.textOnPrimary }]}>{getInitials()}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.userName, { color: theme.text }]}>
                {user?.FirstName && user?.LastName ? 
                  `${user.FirstName} ${user.LastName}` : 
                  user?.Username || 'User'}
              </Text>
              <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
                {user?.Email || 'No email'}
              </Text>
              <Text style={[styles.memberSince, { color: theme.textDisabled }]}>
                Member for {userStats.accountAge} days
              </Text>
            </View>
          </View>
          
          <View style={styles.profileActions}>
            <TouchableOpacity 
              style={[styles.actionButton, { borderColor: theme.primary }]}
              onPress={() => setShowEditModal(true)}
            >
              <Text style={[styles.actionButtonText, { color: theme.primary }]}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { borderColor: theme.primary }]}
              onPress={() => setShowPasswordModal(true)}
            >
              <Text style={[styles.actionButtonText, { color: theme.primary }]}>Change Password</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Statistics Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Account Statistics</Text>
          
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Income</Text>
            <Text style={[styles.statValue, { color: theme.secondary }]}>
              {formatCurrency(userStats.totalIncome)}
            </Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Expenses</Text>
            <Text style={[styles.statValue, { color: theme.accent }]}>
              {formatCurrency(userStats.totalExpenses)}
            </Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Tithe</Text>
            <Text style={[styles.statValue, { color: theme.warning }]}>
              {formatCurrency(userStats.totalTithe)}
            </Text>
          </View>
          
          <Text style={[styles.lastActivity, { color: theme.textDisabled }]}>
            Last activity: {formatDate(userStats.lastActivity)}
          </Text>
        </View>

        {/* Settings Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Settings</Text>
          
          {/* Notifications Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Notifications</Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>
                Receive budget alerts and reminders
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.toggle,
                { backgroundColor: settings.notifications ? theme.primary : theme.surface }
              ]}
              onPress={() => setSettings(prev => ({ ...prev, notifications: !prev.notifications }))}
            >
              <View style={[
                styles.toggleThumb,
                { 
                  backgroundColor: '#fff',
                  transform: [{ translateX: settings.notifications ? 20 : 0 }]
                }
              ]} />
            </TouchableOpacity>
          </View>
          
          {/* Dark Mode Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>
                Current: {themeMode} theme
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.toggle,
                { backgroundColor: themeMode === 'dark' ? theme.primary : theme.surface }
              ]}
              onPress={toggleTheme}
            >
              <View style={[
                styles.toggleThumb,
                { 
                  backgroundColor: '#fff',
                  transform: [{ translateX: themeMode === 'dark' ? 20 : 0 }]
                }
              ]} />
            </TouchableOpacity>
          </View>
          
          {/* Auto Tithe Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Auto Tithe Calculation</Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>
                Automatically calculate tithe
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.toggle,
                { backgroundColor: settings.autoTithe ? theme.primary : theme.surface }
              ]}
              onPress={() => setSettings(prev => ({ ...prev, autoTithe: !prev.autoTithe }))}
            >
              <View style={[
                styles.toggleThumb,
                { 
                  backgroundColor: '#fff',
                  transform: [{ translateX: settings.autoTithe ? 20 : 0 }]
                }
              ]} />
            </TouchableOpacity>
          </View>

          {/* Tithe Percentage Setting */}
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => {
              setTitheInput(settings.tithePercentage.toString());
              setShowTitheModal(true);
            }}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Tithe Percentage</Text>
              <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>
                Tap to change tithe percentage
              </Text>
            </View>
            <View style={[styles.percentageBadge, { backgroundColor: theme.primary }]}>
              <Text style={[styles.percentageText, { color: theme.textOnPrimary }]}>
                {settings.tithePercentage}%
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Account Actions Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Account Actions</Text>
          
          <TouchableOpacity 
            style={[styles.actionButtonFull, { borderColor: theme.border }]}
            onPress={handleLogout}
          >
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={[styles.actionButtonFullText, { color: theme.text }]}>Logout</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButtonFull, styles.deleteButtonContainer, { borderColor: theme.error }]}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.deleteIcon}>🗑️</Text>
            <Text style={[styles.actionButtonFullText, { color: theme.error }]}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        {/* Error/Success Messages */}
        {error && (
          <View style={[styles.messageBanner, { backgroundColor: `${theme.error}20` }]}>
            <Text style={[styles.messageText, { color: theme.error }]}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Text style={[styles.dismissText, { color: theme.error }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {success && (
          <View style={[styles.messageBanner, { backgroundColor: `${theme.secondary}20` }]}>
            <Text style={[styles.messageText, { color: theme.secondary }]}>{success}</Text>
            <TouchableOpacity onPress={() => setSuccess(null)}>
              <Text style={[styles.dismissText, { color: theme.secondary }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={[styles.modalClose, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Username</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                value={editProfile.Username}
                onChangeText={(text) => setEditProfile(prev => ({ ...prev, Username: text }))}
                placeholderTextColor={theme.textDisabled}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                value={editProfile.Email}
                onChangeText={(text) => setEditProfile(prev => ({ ...prev, Email: text }))}
                keyboardType="email-address"
                placeholderTextColor={theme.textDisabled}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>First Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                value={editProfile.FirstName}
                onChangeText={(text) => setEditProfile(prev => ({ ...prev, FirstName: text }))}
                placeholderTextColor={theme.textDisabled}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Last Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                value={editProfile.LastName}
                onChangeText={(text) => setEditProfile(prev => ({ ...prev, LastName: text }))}
                placeholderTextColor={theme.textDisabled}
              />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: theme.border }]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, { backgroundColor: theme.primary }]}
                onPress={handleUpdateProfile}
                disabled={loading}
              >
                <Text style={[styles.modalSaveText, { color: theme.textOnPrimary }]}>
                  {loading ? 'Saving...' : 'Update Profile'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Text style={[styles.modalClose, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Current Password</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                value={passwordForm.currentPassword}
                onChangeText={(text) => setPasswordForm(prev => ({ ...prev, currentPassword: text }))}
                secureTextEntry
                placeholderTextColor={theme.textDisabled}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>New Password</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                value={passwordForm.newPassword}
                onChangeText={(text) => setPasswordForm(prev => ({ ...prev, newPassword: text }))}
                secureTextEntry
                placeholderTextColor={theme.textDisabled}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Confirm New Password</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                value={passwordForm.confirmPassword}
                onChangeText={(text) => setPasswordForm(prev => ({ ...prev, confirmPassword: text }))}
                secureTextEntry
                placeholderTextColor={theme.textDisabled}
              />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: theme.border }]}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, { backgroundColor: theme.primary }]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                <Text style={[styles.modalSaveText, { color: theme.textOnPrimary }]}>
                  {loading ? 'Changing...' : 'Change Password'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Tithe Percentage Modal */}
      <Modal visible={showTitheModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Set Tithe Percentage</Text>
              <TouchableOpacity onPress={() => setShowTitheModal(false)}>
                <Text style={[styles.modalClose, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Enter your preferred tithe percentage
              </Text>
              <View style={styles.percentageInputRow}>
                <TextInput
                  style={[styles.percentageInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
                  value={titheInput}
                  onChangeText={setTitheInput}
                  keyboardType="decimal-pad"
                  placeholder="10"
                  placeholderTextColor={theme.textDisabled}
                />
                <Text style={[styles.percentSymbol, { color: theme.text }]}>%</Text>
              </View>
              <Text style={[styles.helperText, { color: theme.textDisabled }]}>
                This will be used when auto-calculating tithe for new income entries.
              </Text>
              
              {/* Quick select buttons */}
              <View style={styles.quickSelectRow}>
                {[5, 10, 15, 20].map((pct) => (
                  <TouchableOpacity
                    key={pct}
                    style={[
                      styles.quickSelectButton,
                      { borderColor: theme.border },
                      titheInput === pct.toString() && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                    onPress={() => setTitheInput(pct.toString())}
                  >
                    <Text style={[
                      styles.quickSelectText,
                      { color: theme.textSecondary },
                      titheInput === pct.toString() && { color: theme.textOnPrimary }
                    ]}>{pct}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { borderColor: theme.border }]}
                onPress={() => setShowTitheModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, { backgroundColor: theme.primary }]}
                onPress={handleSaveTithePercentage}
              >
                <Text style={[styles.modalSaveText, { color: theme.textOnPrimary }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  memberSince: {
    fontSize: 12,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  statLabel: {
    fontSize: 15,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '600',
  },
  lastActivity: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 13,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 3,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  percentageBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  actionButtonFullText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  logoutIcon: {
    fontSize: 18,
  },
  deleteIcon: {
    fontSize: 18,
  },
  deleteButtonContainer: {
    marginBottom: 0,
  },
  messageBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  messageText: {
    fontSize: 14,
    flex: 1,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalClose: {
    fontSize: 24,
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  percentageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  percentageInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  percentSymbol: {
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 12,
  },
  helperText: {
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  quickSelectRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
  },
  quickSelectButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickSelectText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
