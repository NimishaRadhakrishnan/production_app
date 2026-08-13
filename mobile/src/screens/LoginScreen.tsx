import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { apiClient } from '../services/api';

export default function LoginScreen({ navigation }: any) {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const handleLogin = async () => {
    if (!employeeId || !password) {
      Alert.alert('Required Fields', 'Please enter your Employee ID and password.');
      return;
    }
    setSigningIn(true);
    try {
      await apiClient.login(employeeId.trim(), password);
      // GPS tracking is scoped to check-in/check-out (AttendanceScreen),
      // not to login/logout - being signed in doesn't mean being on shift.
      // Previously this started background tracking right at login, which
      // meant tracking ran continuously from sign-in until sign-out
      // regardless of whether the officer had actually started their day.
      navigation.replace('Dashboard');
    } catch (err: any) {
      // Previously this showed the same generic "wrong password" text for
      // every possible failure - including a device-binding rejection,
      // where the officer's password is actually correct and retrying it
      // will never succeed. That's a real trap: they'd assume a typo and
      // keep retrying instead of contacting an admin.
      //
      // This matches on a distinctive substring of the backend's exact
      // message (LoginUserUseCase: "This account is bound to another
      // mobile device."), NOT on the response's `code` field - the
      // backend currently returns the same code ("invalid_credentials")
      // for both wrong-password and device-mismatch, so code-based
      // matching isn't available without a backend change beyond what
      // was asked here. String-matching a backend message is inherently
      // fragile: if that message text is ever reworded without updating
      // this check, it silently falls back to the generic message with
      // no build-time warning. Deliberately matching only a distinctive
      // middle phrase (not the full sentence, not exact punctuation)
      // to survive minor rewording, but this is not a robust contract -
      // a dedicated error code from the backend would be the real fix.
      const rawMessage: string = err?.message || '';
      if (rawMessage.includes('bound to another mobile device')) {
        Alert.alert(
          'Device Not Recognized',
          'This account is already linked to a different device. Please contact your admin to reset your device access before signing in - retrying your password will not fix this.'
        );
      } else {
        Alert.alert('Sign In Failed', 'Wrong Employee ID or password. Please try again.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Vishakan Biotech</Text>
        <Text style={styles.cardSubtitle}>Sign in to access your dashboard</Text>

        <TextInput
          style={styles.input}
          placeholder="Employee ID (e.g. VB-1002)"
          placeholderTextColor="#999"
          value={employeeId}
          onChangeText={setEmployeeId}
          autoCapitalize="characters"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={signingIn}>
          {signingIn ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.loginBtnText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1b5e20',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1b5e20',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
    marginBottom: 16,
  },
  deviceNotice: {
    fontSize: 11,
    color: '#d84315',
    textAlign: 'center',
    marginBottom: 20,
  },
  loginBtn: {
    backgroundColor: '#1b5e20',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
