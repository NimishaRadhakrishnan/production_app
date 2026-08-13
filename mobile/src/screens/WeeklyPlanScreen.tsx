import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { apiClient } from '../services/api';

type WeeklyPlan = {
  id: string;
  week_start_date: string;
  status: string;
  manager_comment?: string | null;
};

// Next Monday, in YYYY-MM-DD - previously this was a fixed hardcoded past
// date, so every submission (if it had succeeded) would have collided on
// the same already-passed week.
function nextMondayISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (8 - day) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default function WeeklyPlanScreen({ navigation }: any) {
  const [plans, setPlans] = useState<WeeklyPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Previously this list was two hardcoded fake entries, permanently -
  // never connected to the backend at all, regardless of what plans
  // actually existed or their real status.
  const fetchPlans = () => {
    setLoading(true);
    apiClient
      .request('/plans', 'GET', 'plan_submit')
      .then((data: WeeklyPlan[]) => setPlans(data || []))
      .catch((err) => console.warn('Failed to load weekly plans', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSubmitNewPlan = async () => {
    try {
      await apiClient.request('/plans/submit', 'POST', 'plan_submit', {
        week_start_date: nextMondayISO(),
        activities: [
          {
            date: nextMondayISO(),
            territory_id: '809d80d2-9b2f-4c12-8e12-c2890123ef12',
            activity_type: 'Dealer Visit',
            planned_villages: [],
            planned_dealers: [],
          },
        ],
      });
      Alert.alert('Plan Submitted', 'Weekly schedule sent to regional manager for verification.');
      fetchPlans();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Submission failed.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Weekly Tour Plans</Text>

      <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmitNewPlan}>
        <Text style={styles.btnSubmitText}>Submit Plan (Week 32)</Text>
      </TouchableOpacity>

      <Text style={styles.sectionHeader}>Plan Submission History</Text>

      {loading ? (
        <Text style={styles.emptyNote}>Loading your plans...</Text>
      ) : plans.length === 0 ? (
        <Text style={styles.emptyNote}>No plans submitted yet.</Text>
      ) : (
        plans.map((p) => (
          <View key={p.id} style={styles.planCard}>
            <View style={styles.row}>
              <Text style={styles.planWeek}>Week of: {p.week_start_date}</Text>
              <Text style={[
                styles.planStatus,
                { color: p.status === 'approved' ? '#2e7d32' : p.status === 'rejected' ? '#c62828' : '#f57c00' }
              ]}>
                {p.status.toUpperCase()}
              </Text>
            </View>

            {p.manager_comment && (
              <View style={styles.commentBox}>
                <Text style={styles.commentTitle}>Manager Comment:</Text>
                <Text style={styles.commentText}>{p.manager_comment}</Text>
              </View>
            )}
          </View>
        ))
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
    marginBottom: 20,
    marginTop: 20,
  },
  btnSubmit: {
    backgroundColor: '#1b5e20',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  btnSubmitText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 12,
  },
  emptyNote: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planWeek: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  planStatus: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  commentBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  commentTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#757575',
  },
  commentText: {
    fontSize: 13,
    color: '#424242',
    marginTop: 2,
  },
  btnBack: {
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  btnBackText: {
    color: '#1b5e20',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
