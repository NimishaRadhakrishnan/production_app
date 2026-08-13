import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { apiClient } from '../services/api';

export default function SplashScreen({ navigation }: any) {
  useEffect(() => {
    // Go straight to where the person needs to be - no fixed delay.
    // Previously this always waited 2 seconds before showing Login,
    // even for a returning, already-signed-in officer.
    navigation.replace(apiClient.isLoggedIn() ? 'Dashboard' : 'Login');
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <Text style={styles.logoText}>VB</Text>
      </View>
      <Text style={styles.title}>Vishakan Biotech</Text>
      <Text style={styles.subtitle}>Field Force Management Platform</Text>
      
      <ActivityIndicator size="large" color="#a5d6a7" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1b5e20',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1b5e20',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#c8e6c9',
    textAlign: 'center',
    marginTop: 8,
  },
  loader: {
    marginTop: 40,
  },
});
