import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { apiClient } from '../services/api';
import { LocationService } from '../services/LocationService';

export default function DashboardScreen({ navigation }: any) {
  const [isOnline, setIsOnline] = useState(true);
  const currentUser = apiClient.getCurrentUser();

  const toggleNetwork = (value: boolean) => {
    setIsOnline(value);
    apiClient.setOnlineStatus(value);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Sign out of the app?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          // Tracking is primarily started/stopped by AttendanceScreen's
          // check-in/check-out now, not by login/logout. This call stays
          // as a defensive safety net only: if an officer logs out without
          // checking out first, this is the only remaining way to stop a
          // background task that would otherwise keep running indefinitely
          // with no UI left to cancel it. stopTracking() is a no-op if
          // nothing is currently registered, so this is safe to call
          // unconditionally regardless of whether tracking was running.
          await LocationService.stopTracking();
          apiClient.logout();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* User Info Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.username}>{currentUser?.fullName ?? 'Field Officer'}</Text>
          <Text style={styles.role}>
            {currentUser?.role ?? ''}{currentUser?.employeeId ? ` (${currentUser.employeeId})` : ''}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          {/* Network Toggle (Simulated Offline Mode switch) */}
          <View style={styles.networkBox}>
            <Text style={styles.networkText}>{isOnline ? 'Online' : 'Offline'}</Text>
            <Switch
              value={isOnline}
              onValueChange={toggleNetwork}
              trackColor={{ false: '#e0e0e0', true: '#a5d6a7' }}
              thumbColor={isOnline ? '#1b5e20' : '#757575'}
            />
          </View>
          <TouchableOpacity onPress={handleLogout} style={{ marginTop: 8 }}>
            <Text style={{ color: '#d84315', fontSize: 13, fontWeight: '600' }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Grid of Large Tappable Actions (Zero Training Rule - Max 3 taps) */}
      <View style={styles.grid}>
        <TouchableOpacity 
          style={[styles.tile, { backgroundColor: '#e8f5e9' }]}
          onPress={() => navigation.navigate('Attendance')}
        >
          <Text style={styles.tileEmoji}>⏰</Text>
          <Text style={styles.tileTitle}>Shift / Attendance</Text>
          <Text style={styles.tileDesc}>Check-In & Check-Out</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tile, { backgroundColor: '#e0f2f1' }]}
          onPress={() => navigation.navigate('Visit')}
        >
          <Text style={styles.tileEmoji}>🚗</Text>
          <Text style={styles.tileTitle}>Field Visit</Text>
          <Text style={styles.tileDesc}>Start Farm/Dealer visit</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tile, { backgroundColor: '#f1f8e9' }]}
          onPress={() => navigation.navigate('Farmer')}
        >
          <Text style={styles.tileEmoji}>🌾</Text>
          <Text style={styles.tileTitle}>Register Farmer</Text>
          <Text style={styles.tileDesc}>Add details & coordinates</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tile, { backgroundColor: '#efebe9' }]}
          onPress={() => navigation.navigate('Dealer')}
        >
          <Text style={styles.tileEmoji}>🏪</Text>
          <Text style={styles.tileTitle}>Dealer Audit</Text>
          <Text style={styles.tileDesc}>Record stock & orders</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tile, { backgroundColor: '#fbe9e7' }]}
          onPress={() => navigation.navigate('CropIssue')}
        >
          <Text style={styles.tileEmoji}>🐛</Text>
          <Text style={styles.tileTitle}>Crop Issue</Text>
          <Text style={styles.tileDesc}>Report disease & photo</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tile, { backgroundColor: '#e8eaf6' }]}
          onPress={() => navigation.navigate('WeeklyPlan')}
        >
          <Text style={styles.tileEmoji}>📅</Text>
          <Text style={styles.tileTitle}>Weekly Plan</Text>
          <Text style={styles.tileDesc}>Submit schedules & view status</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1b5e20',
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 24,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  role: {
    fontSize: 12,
    color: '#c8e6c9',
    marginTop: 2,
  },
  networkBox: {
    alignItems: 'center',
  },
  networkText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  grid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tile: {
    width: '48%',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tileEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  tileTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  tileDesc: {
    fontSize: 11,
    color: '#757575',
    marginTop: 4,
  },
});
