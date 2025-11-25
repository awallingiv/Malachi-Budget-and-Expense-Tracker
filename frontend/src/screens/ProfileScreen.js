import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert,
  RefreshControl 
} from 'react-native';
import {
  Text,
  Card,
  Button,
  TextInput,
  Portal,
  Modal,
  IconButton,
  Chip,
  Avatar,
  Divider,
  List,
  Switch,
  ProgressBar
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { budgetService } from '../services/apiService';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, themeMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
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
    darkMode: false,
    autoTithe: true,
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

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setError(null);
      
      // Load user statistics
      const [incomeData, transactionData] = await Promise.all([
        budgetService.getIncome(user.UserId),
        budgetService.getTransactions(user.UserId)
      ]);
      
      const totalIncome = incomeData.reduce((sum, item) => sum + (parseFloat(item.GrossIncome) || 0), 0);
      const totalExpenses = transactionData.reduce((sum, item) => sum + (parseFloat(item.Amount) || 0), 0);
      const totalTithe = incomeData.reduce((sum, item) => sum + (parseFloat(item.TitheAmount) || 0), 0);
      
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

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      
      const result = await budgetService.updateUserProfile(user.UserId, editProfile);
      
      if (result.success) {
        setShowEditModal(false);
        setSuccess('Profile updated successfully');
        // Update local user context if needed
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
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]} 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Profile Header */}
      <Card style={styles.profileCard}>
        <Card.Content>
          <View style={styles.profileHeader}>
            <Avatar.Text 
              size={80} 
              label={getInitials()}
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Text variant="headlineMedium" style={styles.userName}>
                {user?.FirstName && user?.LastName ? 
                  `${user.FirstName} ${user.LastName}` : 
                  user?.Username || 'User'}
              </Text>
              <Text variant="bodyLarge" style={styles.userEmail}>
                {user?.Email || 'No email'}
              </Text>
              <Text variant="bodySmall" style={styles.memberSince}>
                Member for {userStats.accountAge} days
              </Text>
            </View>
          </View>
          
          <View style={styles.profileActions}>
            <Button 
              mode="outlined" 
              onPress={() => setShowEditModal(true)}
              style={styles.actionButton}
            >
              Edit Profile
            </Button>
            <Button 
              mode="outlined" 
              onPress={() => setShowPasswordModal(true)}
              style={styles.actionButton}
            >
              Change Password
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Statistics */}
      <Card style={styles.statsCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>Account Statistics</Text>
          
          <View style={styles.statRow}>
            <Text variant="bodyLarge">Total Income</Text>
            <Text variant="titleMedium" style={styles.positiveAmount}>
              {formatCurrency(userStats.totalIncome)}
            </Text>
          </View>
          
          <View style={styles.statRow}>
            <Text variant="bodyLarge">Total Expenses</Text>
            <Text variant="titleMedium" style={styles.negativeAmount}>
              {formatCurrency(userStats.totalExpenses)}
            </Text>
          </View>
          
          <View style={styles.statRow}>
            <Text variant="bodyLarge">Total Tithe</Text>
            <Text variant="titleMedium" style={styles.titheAmount}>
              {formatCurrency(userStats.totalTithe)}
            </Text>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.statRow}>
            <Text variant="bodyLarge">Net Worth</Text>
            <Text variant="titleLarge" style={[
              styles.netWorth,
              { color: (userStats.totalIncome - userStats.totalExpenses) >= 0 ? '#4caf50' : '#f44336' }
            ]}>
              {formatCurrency(userStats.totalIncome - userStats.totalExpenses)}
            </Text>
          </View>
          
          <Text variant="bodySmall" style={styles.lastActivity}>
            Last activity: {formatDate(userStats.lastActivity)}
          </Text>
        </Card.Content>
      </Card>

      {/* Settings */}
      <Card style={styles.settingsCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>Settings</Text>
          
          <List.Item
            title="Notifications"
            description="Receive budget alerts and reminders"
            left={props => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={settings.notifications}
                onValueChange={(value) => setSettings(prev => ({ ...prev, notifications: value }))}
              />
            )}
          />
          
          <List.Item
            title="Dark Mode"
            description={`Current: ${themeMode} theme`}
            left={props => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => (
              <Switch
                value={themeMode === 'dark'}
                onValueChange={toggleTheme}
              />
            )}
          />
          
          <List.Item
            title="Auto Tithe Calculation"
            description="Automatically calculate 10% tithe"
            left={props => <List.Icon {...props} icon="calculator" />}
            right={() => (
              <Switch
                value={settings.autoTithe}
                onValueChange={(value) => setSettings(prev => ({ ...prev, autoTithe: value }))}
              />
            )}
          />
        </Card.Content>
      </Card>

      {/* Account Actions */}
      <Card style={styles.actionsCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>Account Actions</Text>
          
          <Button 
            mode="outlined" 
            onPress={handleLogout}
            icon="logout"
            style={styles.logoutButton}
          >
            Logout
          </Button>
          
          <Button 
            mode="outlined" 
            onPress={handleDeleteAccount}
            icon="delete"
            style={styles.deleteButton}
            textColor="#f44336"
          >
            Delete Account
          </Button>
        </Card.Content>
      </Card>

      {/* Error/Success Messages */}
      {error && (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={styles.errorText}>{error}</Text>
            <Button onPress={() => setError(null)} mode="outlined">Dismiss</Button>
          </Card.Content>
        </Card>
      )}
      
      {success && (
        <Card style={styles.successCard}>
          <Card.Content>
            <Text style={styles.successText}>{success}</Text>
            <Button onPress={() => setSuccess(null)} mode="outlined">Dismiss</Button>
          </Card.Content>
        </Card>
      )}

      {/* Edit Profile Modal */}
      <Portal>
        <Modal
          visible={showEditModal}
          onDismiss={() => setShowEditModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Card>
            <Card.Content>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge">Edit Profile</Text>
                <IconButton icon="close" onPress={() => setShowEditModal(false)} />
              </View>

              <TextInput
                label="Username"
                value={editProfile.Username}
                onChangeText={(text) => setEditProfile(prev => ({ ...prev, Username: text }))}
                style={styles.input}
              />

              <TextInput
                label="Email"
                value={editProfile.Email}
                onChangeText={(text) => setEditProfile(prev => ({ ...prev, Email: text }))}
                style={styles.input}
                keyboardType="email-address"
              />

              <TextInput
                label="First Name"
                value={editProfile.FirstName}
                onChangeText={(text) => setEditProfile(prev => ({ ...prev, FirstName: text }))}
                style={styles.input}
              />

              <TextInput
                label="Last Name"
                value={editProfile.LastName}
                onChangeText={(text) => setEditProfile(prev => ({ ...prev, LastName: text }))}
                style={styles.input}
              />

              <View style={styles.modalButtons}>
                <Button mode="outlined" onPress={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button 
                  mode="contained" 
                  onPress={handleUpdateProfile}
                  loading={loading}
                >
                  Update Profile
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Change Password Modal */}
      <Portal>
        <Modal
          visible={showPasswordModal}
          onDismiss={() => setShowPasswordModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Card>
            <Card.Content>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge">Change Password</Text>
                <IconButton icon="close" onPress={() => setShowPasswordModal(false)} />
              </View>

              <TextInput
                label="Current Password"
                value={passwordForm.currentPassword}
                onChangeText={(text) => setPasswordForm(prev => ({ ...prev, currentPassword: text }))}
                style={styles.input}
                secureTextEntry
              />

              <TextInput
                label="New Password"
                value={passwordForm.newPassword}
                onChangeText={(text) => setPasswordForm(prev => ({ ...prev, newPassword: text }))}
                style={styles.input}
                secureTextEntry
              />

              <TextInput
                label="Confirm New Password"
                value={passwordForm.confirmPassword}
                onChangeText={(text) => setPasswordForm(prev => ({ ...prev, confirmPassword: text }))}
                style={styles.input}
                secureTextEntry
              />

              <View style={styles.modalButtons}>
                <Button mode="outlined" onPress={() => setShowPasswordModal(false)}>
                  Cancel
                </Button>
                <Button 
                  mode="contained" 
                  onPress={handleChangePassword}
                  loading={loading}
                >
                  Change Password
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileCard: {
    margin: 16,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    marginRight: 16,
    backgroundColor: '#6200ee',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    color: '#666',
    marginBottom: 2,
  },
  memberSince: {
    color: '#999',
  },
  profileActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  statsCard: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  settingsCard: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  actionsCard: {
    margin: 16,
    marginTop: 0,
    marginBottom: 32,
    elevation: 2,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  positiveAmount: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
  negativeAmount: {
    color: '#f44336',
    fontWeight: 'bold',
  },
  titheAmount: {
    color: '#ff9800',
    fontWeight: 'bold',
  },
  netWorth: {
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 12,
  },
  lastActivity: {
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  logoutButton: {
    marginBottom: 8,
  },
  deleteButton: {
    borderColor: '#f44336',
  },
  errorCard: {
    margin: 16,
    backgroundColor: '#ffebee',
  },
  errorText: {
    color: '#c62828',
    marginBottom: 8,
  },
  successCard: {
    margin: 16,
    backgroundColor: '#e8f5e8',
  },
  successText: {
    color: '#2e7d32',
    marginBottom: 8,
  },
  modalContent: {
    backgroundColor: 'transparent',
    padding: 20,
    margin: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
});