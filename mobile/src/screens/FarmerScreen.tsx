import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import * as Location from 'expo-location';
import { apiClient } from '../services/api';

export default function FarmerScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [taluk, setTaluk] = useState('');
  const [district, setDistrict] = useState('');
  const [crop, setCrop] = useState('');
  const [acres, setAcres] = useState('');

  const handleRegister = async () => {
    if (!name || !phone || !village || !taluk || !district || !crop || !acres) {
      Alert.alert('Required Fields', 'Please fill in all the details.');
      return;
    }

    try {
      // Real device fix, real taluk/district (previously always hardcoded
      // to 'Mallasamudram'/'Namakkal' regardless of what the officer
      // actually typed, and every farmer landed at the same coordinates).
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Required', 'Location permission is needed to register a farmer.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

      await apiClient.request('/farmers/', 'POST', 'farmer_register', {
        name,
        phone,
        village,
        taluk,
        district,
        crop,
        acres: parseFloat(acres),
        location_lat: position.coords.latitude,
        location_lng: position.coords.longitude,
      });

      Alert.alert('Farmer Registered', `${name} successfully added to database.`);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Registration failed.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Register Farmer Profile</Text>

      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Farmer Name" placeholderTextColor="#999" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Mobile Number" placeholderTextColor="#999" keyboardType="phone-pad" maxLength={10} value={phone} onChangeText={setPhone} />
        <TextInput style={styles.input} placeholder="Village Name" placeholderTextColor="#999" value={village} onChangeText={setVillage} />
        <TextInput style={styles.input} placeholder="Taluk" placeholderTextColor="#999" value={taluk} onChangeText={setTaluk} />
        <TextInput style={styles.input} placeholder="District" placeholderTextColor="#999" value={district} onChangeText={setDistrict} />
        <TextInput style={styles.input} placeholder="Primary Crop (e.g. Paddy)" placeholderTextColor="#999" value={crop} onChangeText={setCrop} />
        <TextInput style={styles.input} placeholder="Cultivated Acres (e.g. 4.5)" placeholderTextColor="#999" keyboardType="numeric" value={acres} onChangeText={setAcres} />

        <TouchableOpacity style={styles.btnRegister} onPress={handleRegister}>
          <Text style={styles.btnText}>Save Farmer Profile</Text>
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
  btnRegister: {
    backgroundColor: '#1b5e20',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: {
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
