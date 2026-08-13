import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import WeeklyPlanScreen from '../screens/WeeklyPlanScreen';
import VisitScreen from '../screens/VisitScreen';
import FarmerScreen from '../screens/FarmerScreen';
import DealerScreen from '../screens/DealerScreen';
import CropIssueScreen from '../screens/CropIssueScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Splash"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1b5e20',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Vishakan FFM' }} />
        <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Shift Check-In' }} />
        <Stack.Screen name="WeeklyPlan" component={WeeklyPlanScreen} options={{ title: 'Weekly Plans' }} />
        <Stack.Screen name="Visit" component={VisitScreen} options={{ title: 'Field Visit Log' }} />
        <Stack.Screen name="Farmer" component={FarmerScreen} options={{ title: 'Register Farmer' }} />
        <Stack.Screen name="Dealer" component={DealerScreen} options={{ title: 'Dealer Audit' }} />
        <Stack.Screen name="CropIssue" component={CropIssueScreen} options={{ title: 'Report Crop Issue' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
