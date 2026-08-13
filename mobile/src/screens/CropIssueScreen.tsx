import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '../services/api';

type Farmer = { id: string; name: string; village: string; district: string };

export default function CropIssueScreen({ navigation }: any) {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [selectedFarmerId, setSelectedFarmerId] = useState<string | null>(null);
  const [crop, setCrop] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Previously farmer_id and district were hardcoded to a single fake
  // farmer/district for every report, regardless of who was actually
  // visited. This pulls the officer's real farmer list so they pick one.
  useEffect(() => {
    apiClient
      .request('/farmers/search', 'GET', 'crop_issue')
      .then((data: Farmer[]) => setFarmers(data || []))
      .catch((err) => console.warn('Failed to load farmers list', err));
  }, []);

  const selectedFarmer = farmers.find((f) => f.id === selectedFarmerId) ?? null;

  // Real capture + upload. Previously this was a plain UI boolean with no
  // camera and a fabricated image_url ("http://image-bucket/crop_pest_001.jpg")
  // sent to the backend as if a real photo existed.
  const handleCapture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Required', 'Camera access is needed to attach a leaf/pest photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setPhotoUri(asset.uri);
    setUploadedPhotoUrl(null);
    setUploadingPhoto(true);
    try {
      const url = await apiClient.uploadFile('/issues/upload', asset.uri, `crop-issue-${Date.now()}.jpg`, 'image/jpeg');
      setUploadedPhotoUrl(url);
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not upload the photo. You can retake it.');
      setPhotoUri(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleReport = async () => {
    if (!selectedFarmer || !crop || !symptoms || !uploadedPhotoUrl) {
      Alert.alert('Incomplete Form', 'Please select a farmer, provide crop name, symptoms, and attach a photo.');
      return;
    }

    try {
      await apiClient.request('/issues', 'POST', 'crop_issue', {
        farmer_id: selectedFarmer.id,
        crop,
        district: selectedFarmer.district,
        symptoms,
        image_url: uploadedPhotoUrl,
      });

      Alert.alert(
        'Ticket Dispatched',
        `Details uploaded. Routed to the ${selectedFarmer.district} district agricultural specialist.`
      );
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Dispatch failed.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Report Crop Issue</Text>
      
      <View style={styles.form}>
        <Text style={styles.fieldLabel}>Farmer</Text>
        {farmers.length === 0 ? (
          <Text style={styles.emptyNote}>No farmers found in your area yet — register one first.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.farmerRow}>
            {farmers.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[styles.farmerChip, selectedFarmerId === f.id && styles.farmerChipActive]}
                onPress={() => setSelectedFarmerId(f.id)}
              >
                <Text style={[styles.farmerChipText, selectedFarmerId === f.id && styles.farmerChipTextActive]}>
                  {f.name} · {f.village}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <TextInput
          style={styles.input}
          placeholder="Crop Name (e.g. Paddy)"
          placeholderTextColor="#999"
          value={crop}
          onChangeText={setCrop}
        />

        <TextInput
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          placeholder="Describe symptoms (e.g. Yellow leaf spots, pest activity...)"
          placeholderTextColor="#999"
          multiline
          value={symptoms}
          onChangeText={setSymptoms}
        />

        {/* Leaf capture block */}
        <TouchableOpacity style={styles.btnCapture} onPress={handleCapture} disabled={uploadingPhoto}>
          {photoUri && <Image source={{ uri: photoUri }} style={styles.photoPreview} />}
          <Text style={styles.btnCaptureText}>
            {uploadingPhoto ? 'Uploading...' : uploadedPhotoUrl ? 'Leaf Photo Attached ✓ (tap to retake)' : '📸 Take Leaf/Pest Photo'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnSubmit} onPress={handleReport}>
          <Text style={styles.btnSubmitText}>Submit to Specialist</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
        <Text style={styles.btnBackText}>Cancel & Go Back</Text>
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
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#757575',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  emptyNote: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  farmerRow: {
    marginBottom: 16,
  },
  farmerChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  farmerChipActive: {
    backgroundColor: '#1b5e20',
    borderColor: '#1b5e20',
  },
  farmerChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  farmerChipTextActive: {
    color: '#ffffff',
  },
  btnCapture: {
    backgroundColor: '#efebe9',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#d7ccc8',
    borderStyle: 'dashed',
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  btnCaptureText: {
    color: '#5d4037',
    fontWeight: 'bold',
    fontSize: 14,
  },
  btnSubmit: {
    backgroundColor: '#1b5e20',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  btnSubmitText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  btnBack: {
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  btnBackText: {
    color: '#1b5e20',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
