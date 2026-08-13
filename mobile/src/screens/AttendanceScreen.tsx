import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { apiClient } from '../services/api';
import { LocationService } from '../services/LocationService';

export default function AttendanceScreen({ navigation }: any) {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Previously isCheckedIn was plain local state with no fetch-on-mount,
  // so navigating away and back (or restarting the app) always reset the
  // screen to "OFF DUTY" regardless of real backend state. That was more
  // than a display bug once tracking moved to check-in/check-out (see
  // handleCheckIn/handleCheckOut below): an officer who was genuinely
  // still checked in would never see the "Clock In" button again today,
  // so LocationService.startTracking() would never get called again for
  // the rest of their shift if the app's in-memory state was lost.
  //
  // This closes that gap on two different paths, both handled the same
  // way here:
  // - Same-session navigation away/back: the background task (if it was
  //   running) was never actually interrupted - re-calling startTracking()
  //   is a safe no-op here (see the isTaskRegisteredAsync guard added to
  //   LocationService.startTracking), so this is purely re-syncing the UI.
  // - A genuine app restart: apiClient's token is in-memory only (no
  //   persistence anywhere in this app - see api.ts/db.ts), so a real
  //   restart always forces the officer back through Login first. By the
  //   time this screen mounts again, the native task registration from
  //   before the restart is gone too, so this actually re-registers
  //   tracking, not just the label.
  useEffect(() => {
    let cancelled = false;

    const syncStatus = async () => {
      try {
        const today: any = await apiClient.request('/attendance/today', 'GET', 'check_in');
        if (cancelled) return;

        const stillCheckedIn = !!today && !today.check_out_time;
        setIsCheckedIn(stillCheckedIn);
        setCheckInTime(today?.check_in_time ? new Date(today.check_in_time).toLocaleTimeString() : null);

        if (stillCheckedIn) {
          const trackingResult = await LocationService.startTracking();
          if (trackingResult !== 'started' && trackingResult !== 'already_running' && !cancelled) {
            Alert.alert(
              'Tracking Not Active',
              'You\u2019re checked in, but continuous location tracking isn\u2019t running. Please open Settings and set this app\u2019s location access to "Always Allow."'
            );
          }
        }
      } catch (err) {
        // No record for today (or a network hiccup) - default to OFF
        // DUTY, same as before this fix. An officer who's genuinely
        // checked in but hits this catch will just need to reopen this
        // screen once connectivity is back; that's a strictly better
        // failure mode than assuming ACTIVE SHIFT without confirming it.
        console.warn('Failed to load today\u2019s attendance status', err);
      } finally {
        if (!cancelled) setLoadingStatus(false);
      }
    };

    syncStatus();
    return () => { cancelled = true; };
  }, []);

  const handleCheckIn = async () => {
    try {
      // Real device fix, same source LocationService.ts uses for tracking
      // pings. Previously this sent a hardcoded lat/lng ("Mock latitude/
      // longitude fetch") regardless of where the officer actually was.
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Required', 'Location permission is needed to check in.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

      const res = await apiClient.request('/attendance/check-in', 'POST', 'check_in', {
        device_id: apiClient.getDeviceIdValue() ?? 'unknown-device',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        is_fake_gps: !!position.mocked,
        is_gps_disabled: false,
      });

      setIsCheckedIn(true);
      setCheckInTime(new Date().toLocaleTimeString());
      // Tracking is now scoped to the shift (check-in through check-out),
      // not to the login session - previously LoginScreen started this at
      // sign-in regardless of whether the officer had actually started
      // their day, so this Alert's "Live tracking started" claim used to
      // be inaccurate (tracking had already been running since login).
      //
      // Check-in itself has already succeeded at this point (the
      // attendance record exists) regardless of what happens next - only
      // the wording of the confirmation changes based on whether
      // continuous background tracking actually started. Previously this
      // was unconditional even if the officer declined the Always-upgrade
      // prompt, silently telling them tracking started when it hadn't.
      const trackingResult = await LocationService.startTracking();
      if (trackingResult === 'started' || trackingResult === 'already_running') {
        Alert.alert('Checked In Successfully', 'Daily attendance clocked. Live tracking started.');
      } else {
        Alert.alert(
          'Checked In - Tracking Not Active',
          'Your attendance was recorded, but continuous location tracking could not start. Please open Settings and set this app\u2019s location access to "Always Allow" so your shift is tracked correctly.'
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Check-in failed.');
    }
  };

  const handleCheckOut = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Required', 'Location permission is needed to check out.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

      await apiClient.request('/attendance/check-out', 'POST', 'check_out', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      setIsCheckedIn(false);
      setCheckInTime(null);
      await LocationService.stopTracking();
      Alert.alert('Checked Out Successfully', 'Shift completed. Live location tracking stopped.');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Check-out failed.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shift Management</Text>
      
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Current Status:</Text>
        {loadingStatus ? (
          <ActivityIndicator style={{ marginTop: 8 }} color="#1b5e20" />
        ) : (
          <>
            <Text style={[styles.statusValue, { color: isCheckedIn ? '#2e7d32' : '#c62828' }]}>
              {isCheckedIn ? 'ACTIVE SHIFT' : 'OFF DUTY'}
            </Text>
            {isCheckedIn && (
              <Text style={styles.clockedTime}>Clocked in at: {checkInTime}</Text>
            )}
          </>
        )}
      </View>

      {loadingStatus ? null : !isCheckedIn ? (
        <TouchableOpacity style={styles.btnCheckIn} onPress={handleCheckIn}>
          <Text style={styles.btnText}>Clock In (Start Duty)</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.btnCheckOut} onPress={handleCheckOut}>
          <Text style={styles.btnText}>Clock Out (End Duty)</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
        <Text style={styles.btnBackText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1b5e20',
    textAlign: 'center',
    marginBottom: 32,
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  statusLabel: {
    fontSize: 14,
    color: '#757575',
  },
  statusValue: {
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 8,
  },
  clockedTime: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
  },
  btnCheckIn: {
    backgroundColor: '#1b5e20',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  btnCheckOut: {
    backgroundColor: '#c62828',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  btnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  btnBack: {
    padding: 16,
    alignItems: 'center',
  },
  btnBackText: {
    fontSize: 15,
    color: '#1b5e20',
    fontWeight: 'bold',
  },
});
