import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView, TextInput, Image } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '../services/api';

export default function VisitScreen({ navigation }: any) {
  const [inVisit, setInVisit] = useState(false);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [visitType, setVisitType] = useState<'farmer' | 'dealer'>('farmer');
  const [purpose, setPurpose] = useState('');

  // Real capture + upload. The photo has to happen before /visits/start,
  // not after - StartVisitRequest is the only schema with photo fields
  // (photo_url_farmer / photo_url_farm); EndVisitRequest has none at all.
  // Previously this screen put a "photo" step *after* start with no real
  // backend destination for it, and before that, no camera was wired up
  // at all (setPhotoSaved was a plain UI boolean).
  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Required', 'Camera access is needed to attach a farm photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setPhotoUri(asset.uri);
    setUploadedPhotoUrl(null);
    setUploadingPhoto(true);
    try {
      // Reuses /issues/upload - there's no visit-specific upload endpoint,
      // and this one, /enquiries/upload, and /day-closure/upload are all
      // the same generic save-and-return-URL implementation with no
      // domain-specific validation, so this is a safe reuse.
      const url = await apiClient.uploadFile('/issues/upload', asset.uri, `visit-${Date.now()}.jpg`, 'image/jpeg');
      setUploadedPhotoUrl(url);
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not upload the photo. You can retake it.');
      setPhotoUri(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleStartVisit = async () => {
    if (!purpose.trim()) {
      Alert.alert('Purpose Required', 'Please describe the purpose of this visit.');
      return;
    }
    if (!uploadedPhotoUrl) {
      Alert.alert('Photo Required', 'Please attach a farm photo before starting the visit.');
      return;
    }
    try {
      // Real device fix, same pattern as LocationService.ts / AttendanceScreen.
      // Previously this always sent the same hardcoded coordinates and a
      // fixed visit_type/purpose ("Demonstration of Bio-NPK Liquid"),
      // regardless of who was actually visited or where.
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Required', 'Location permission is needed to start a visit.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

      await apiClient.request('/visits/start', 'POST', 'check_in', {
        visit_type: visitType,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        purpose: purpose.trim(),
        photo_url_farm: uploadedPhotoUrl,
      });
      setInVisit(true);
      setStartTime(new Date().toLocaleTimeString());
      Alert.alert('Visit Session Started', 'GPS check and timer running.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not start visit.');
    }
  };

  const handleEndVisit = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Required', 'Location permission is needed to end a visit.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

      await apiClient.request('/visits/end', 'POST', 'check_out', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        task_completed: true,
      });
      setInVisit(false);
      setPhotoUri(null);
      setUploadedPhotoUrl(null);
      setStartTime(null);
      setPurpose('');
      Alert.alert('Visit Session Ended', 'Completed logs synchronized with backend.');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not end visit.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Field Visit Log</Text>

      {!inVisit ? (
        <View style={styles.card}>
          <Text style={styles.cardInfo}>Select visit type, attach a farm photo, and describe the purpose before starting.</Text>

          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[styles.typeChip, visitType === 'farmer' && styles.typeChipActive]}
              onPress={() => setVisitType('farmer')}
            >
              <Text style={[styles.typeChipText, visitType === 'farmer' && styles.typeChipTextActive]}>Farmer Visit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeChip, visitType === 'dealer' && styles.typeChipActive]}
              onPress={() => setVisitType('dealer')}
            >
              <Text style={[styles.typeChipText, visitType === 'dealer' && styles.typeChipTextActive]}>Dealer Visit</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.btnAction} onPress={handleTakePhoto} disabled={uploadingPhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            ) : (
              <Text style={styles.actionEmoji}>📸</Text>
            )}
            <Text style={styles.actionLabel}>
              {uploadingPhoto ? 'Uploading...' : uploadedPhotoUrl ? 'Farm Photo Attached ✓ (tap to retake)' : 'Take Farm Photo'}
            </Text>
          </TouchableOpacity>

          <TextInput
            style={styles.purposeInput}
            placeholder="Purpose (e.g. Bio-NPK demonstration, stock check)"
            placeholderTextColor="#999"
            value={purpose}
            onChangeText={setPurpose}
          />

          <TouchableOpacity style={styles.btnStart} onPress={handleStartVisit}>
            <Text style={styles.btnText}>Start Visit Session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.visitRunning}>Visit Session Active</Text>
          <Text style={styles.visitTime}>Started at: {startTime}</Text>

          <TouchableOpacity style={styles.btnEnd} onPress={handleEndVisit}>
            <Text style={styles.btnText}>Complete & Save Visit</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
        <Text style={styles.btnBackText}>Go Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1b5e20',
    marginBottom: 24,
    marginTop: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 20,
  },
  cardInfo: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  typeToggle: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  typeChipActive: {
    backgroundColor: '#1b5e20',
    borderColor: '#1b5e20',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555',
  },
  typeChipTextActive: {
    color: '#ffffff',
  },
  purposeInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    marginBottom: 20,
  },
  visitRunning: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    textAlign: 'center',
  },
  visitTime: {
    fontSize: 13,
    color: '#757575',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  actionBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  btnAction: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 20,
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  btnStart: {
    backgroundColor: '#1b5e20',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  btnEnd: {
    backgroundColor: '#c62828',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  btnBack: {
    padding: 16,
    alignItems: 'center',
  },
  btnBackText: {
    color: '#1b5e20',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
