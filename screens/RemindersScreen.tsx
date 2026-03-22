import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type ReminderItem = {
  id: string;
  title: string;
  date: string;
  petName?: string;
};

type RemindersScreenProps = {
  title?: string;
  upcoming: ReminderItem[];
  completed: ReminderItem[];
  onComplete?: (id: string) => void;
  onAdd?: () => void;
};

export default function RemindersScreen({ title = 'Reminders', upcoming, completed, onComplete, onAdd }: RemindersScreenProps) {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Pressable style={styles.addBtn} onPress={onAdd}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Upcoming</Text>
        <View style={styles.card}>
          {upcoming.length === 0 ? (
            <Text style={styles.emptyText}>No upcoming reminders.</Text>
          ) : (
            upcoming.map((item, index) => (
              <Pressable key={item.id} style={[styles.row, index !== upcoming.length - 1 && styles.rowDivider]} onPress={() => onComplete?.(item.id)}>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowSub}>{item.petName ? `${item.petName} • ${item.date}` : item.date}</Text>
                </View>
                <Text style={styles.rowAction}>Done</Text>
              </Pressable>
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Completed</Text>
        <View style={styles.card}>
          {completed.length === 0 ? (
            <Text style={styles.emptyText}>No completed reminders.</Text>
          ) : (
            completed.map((item, index) => (
              <View key={item.id} style={[styles.row, index !== completed.length - 1 && styles.rowDivider]}>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowSub}>{item.petName ? `${item.petName} • ${item.date}` : item.date}</Text>
                </View>
                <Text style={styles.completedTag}>Done</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#faf8f5',
  },
  content: {
    paddingTop: 52,
    paddingHorizontal: 24,
    paddingBottom: 120,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 30,
    lineHeight: 34,
    color: '#2d2d2d',
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  addBtn: {
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#faf8f5',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    marginTop: 4,
    fontSize: 18,
    lineHeight: 22,
    color: '#2d2d2d',
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  row: {
    minHeight: 62,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  rowTextWrap: {
    flex: 1,
  },
  rowTitle: {
    color: '#2d2d2d',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  rowSub: {
    marginTop: 2,
    color: '#7a7a7a',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  rowAction: {
    color: '#5f7f59',
    fontSize: 12,
    fontWeight: '700',
  },
  completedTag: {
    color: '#8c8c8c',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});

