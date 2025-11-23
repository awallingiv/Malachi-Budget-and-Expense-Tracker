import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, List, Divider } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.profileCard}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.profileTitle}>
            Profile Information
          </Text>
          
          <View style={styles.profileInfo}>
            <Text variant="titleMedium" style={styles.profileName}>
              {user.Name || user.Username}
            </Text>
            <Text variant="bodyMedium" style={styles.profileDetail}>
              Username: {user.Username}
            </Text>
            <Text variant="bodyMedium" style={styles.profileDetail}>
              Email: {user.Email}
            </Text>
            <Text variant="bodySmall" style={styles.profileDetail}>
              User ID: {user.UserId}
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.menuCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.menuTitle}>
            Account Settings
          </Text>
        </Card.Content>
        
        <List.Item
          title="Edit Profile"
          description="Update your personal information"
          left={(props) => <List.Icon {...props} icon="account-edit" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            // TODO: Navigate to edit profile screen
            console.log('Edit profile pressed');
          }}
        />
        
        <Divider />
        
        <List.Item
          title="Change Password"
          description="Update your account password"
          left={(props) => <List.Icon {...props} icon="lock" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            // TODO: Navigate to change password screen
            console.log('Change password pressed');
          }}
        />
        
        <Divider />
        
        <List.Item
          title="Notifications"
          description="Manage notification preferences"
          left={(props) => <List.Icon {...props} icon="bell" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            // TODO: Navigate to notifications screen
            console.log('Notifications pressed');
          }}
        />
      </Card>

      <Card style={styles.menuCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.menuTitle}>
            Budget Settings
          </Text>
        </Card.Content>
        
        <List.Item
          title="Categories"
          description="Manage expense categories"
          left={(props) => <List.Icon {...props} icon="tag" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            // TODO: Navigate to categories screen
            console.log('Categories pressed');
          }}
        />
        
        <Divider />
        
        <List.Item
          title="Budget Goals"
          description="Set monthly budget targets"
          left={(props) => <List.Icon {...props} icon="target" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            // TODO: Navigate to budget goals screen
            console.log('Budget goals pressed');
          }}
        />
        
        <Divider />
        
        <List.Item
          title="Export Data"
          description="Download your financial data"
          left={(props) => <List.Icon {...props} icon="download" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            // TODO: Implement data export
            console.log('Export data pressed');
          }}
        />
      </Card>

      <Card style={styles.menuCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.menuTitle}>
            Support
          </Text>
        </Card.Content>
        
        <List.Item
          title="Help & FAQ"
          description="Get help with using the app"
          left={(props) => <List.Icon {...props} icon="help-circle" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            // TODO: Navigate to help screen
            console.log('Help pressed');
          }}
        />
        
        <Divider />
        
        <List.Item
          title="Contact Support"
          description="Get in touch with our team"
          left={(props) => <List.Icon {...props} icon="email" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            // TODO: Navigate to contact screen
            console.log('Contact support pressed');
          }}
        />
        
        <Divider />
        
        <List.Item
          title="About"
          description="App version and information"
          left={(props) => <List.Icon {...props} icon="information" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            // TODO: Navigate to about screen
            console.log('About pressed');
          }}
        />
      </Card>

      <View style={styles.logoutSection}>
        <Button
          mode="contained"
          onPress={handleLogout}
          style={styles.logoutButton}
          buttonColor="#F44336"
        >
          Logout
        </Button>
      </View>

      <View style={styles.footer}>
        <Text variant="bodySmall" style={styles.footerText}>
          ReactBudget v1.0.0
        </Text>
      </View>
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
  profileTitle: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#6200ee',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  profileDetail: {
    marginBottom: 4,
    color: '#666',
  },
  menuCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  menuTitle: {
    marginBottom: 8,
    color: '#6200ee',
  },
  logoutSection: {
    margin: 16,
  },
  logoutButton: {
    marginVertical: 8,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  footerText: {
    color: '#999',
  },
});