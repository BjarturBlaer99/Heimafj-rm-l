import { registerRootComponent } from 'expo';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Deliberately imports no finance screens, authentication, storage, navigation,
// custom fonts or animations. A successful launch isolates those from the base
// React Native/Expo runtime; it does not prove a particular module is faulty.
function StartupDiagnostic() {
  const [count, setCount] = useState(0);
  return <View style={styles.screen}>
    <Text style={styles.label}>MÍN FJÁRMÁL · STARTUP TEST A</Text>
    <Text style={styles.title}>Grunnskjárinn opnaðist</Text>
    <Text style={styles.body}>Haltu þessum skjá opnum í 10 sekúndur. Ýttu síðan á takkann og athugaðu hvort talan hækkar.</Text>
    <Pressable accessibilityRole="button" onPress={() => setCount((value) => value + 1)} style={styles.button}>
      <Text style={styles.buttonText}>Prófa takka · {count}</Text>
    </Pressable>
    <Text style={styles.body}>Þetta er tímabundinn greiningarskjár. Fjármálagögn eru ekki sótt eða breytt hér.</Text>
  </View>;
}

const styles = StyleSheet.create({ screen: { flex: 1, justifyContent: 'center', padding: 28, gap: 24, backgroundColor: '#f7f8fa' }, label: { color: '#344054', fontSize: 12, fontWeight: '700' }, title: { color: '#101828', fontSize: 28, fontWeight: '700' }, body: { color: '#344054', fontSize: 16, lineHeight: 24 }, button: { minHeight: 52, padding: 16, borderRadius: 10, backgroundColor: '#2f4fe4' }, buttonText: { color: '#ffffff', fontSize: 17, fontWeight: '600', textAlign: 'center' } });

registerRootComponent(StartupDiagnostic);
