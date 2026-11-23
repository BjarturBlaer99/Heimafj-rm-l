import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export async function shareAccountExport(data: unknown) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'min-fjarmal-gogn.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!await Sharing.isAvailableAsync()) throw new Error('Ekki er hægt að vista skrá úr þessu tæki. Prófaðu útflutning á vefnum.');
  const file = new File(Paths.cache, `min-fjarmal-${Date.now()}.json`);
  try {
    file.create();
    file.write(JSON.stringify(data, null, 2));
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Vista gögnin mín' });
  } finally { if (file.exists) file.delete(); }
}
